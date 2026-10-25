import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { Mock } from "vitest";

// Only the edges are replaced: the session, the outgoing email, `after()` and the env. Everything
// between (route handlers, getActiveViewer, repositories, SQL, migrations) is real.
const { pending } = vi.hoisted(() => ({ pending: [] as Promise<unknown>[] }));

vi.mock("@/lib/db/client", async () => {
  const { createTestDb } = await import("@/test/pg-test-db");
  return { db: await createTestDb() };
});
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { NEXTAUTH_URL: "https://app.test" } }));
vi.mock("@/lib/email/send-coach-notification", () => ({ sendCoachNotificationEmail: vi.fn() }));
vi.mock("next/server", () => ({
  after: (callback: () => unknown) => {
    pending.push(Promise.resolve().then(callback));
  },
}));

import { db } from "@/lib/db/client";
import { auth } from "@/lib/auth/config";
import { sendCoachNotificationEmail } from "@/lib/email/send-coach-notification";
import { coachMessages, kpiGoals, users } from "@/lib/db/schema";
import { listSharedByUser } from "@/lib/kpi/goal-repository";
import { eq } from "drizzle-orm";
import * as messages from "../messages/route";
import * as read from "../read/route";
import * as threads from "../threads/route";
import * as goals from "../../admin/kpi/goals/route";
import * as goalById from "../../admin/kpi/goals/[id]/route";

const M1 = "11111111-1111-4111-8111-111111111111";
const M2 = "22222222-2222-4222-8222-222222222222";
const M3 = "33333333-3333-4333-8333-333333333333"; // deactivated later
const A1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DEMOTED = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; // token still says admin, database says member

const URL_BASE = "http://localhost";

function signInAs(id: string | null, tokenRole = "member") {
  (auth as Mock).mockResolvedValue(id ? { user: { id, role: tokenRole, name: "Token Name" } } : null);
}

function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${URL_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const flush = async () => {
  await Promise.all(pending.splice(0));
};
const json = async (res: Response) => res.json();

const goalBody = {
  userId: M1,
  cycleYear: 2027,
  type: "hard",
  skillKey: "clearing-settlement",
  title: "Own reconciliation",
  measure: "Match rate from 97% to 99.5% by Q3",
  developmentAction: "Pair with the settlement owner",
  milestones: [],
};

beforeAll(async () => {
  await db.insert(users).values([
    { id: M1, email: "m1@example.com", name: "Member One", role: "member", status: "active" },
    { id: M2, email: "m2@example.com", name: "Member Two", role: "member", status: "active" },
    { id: M3, email: "m3@example.com", name: "Member Three", role: "member", status: "active" },
    { id: A1, email: "a1@example.com", name: "Manager", role: "admin", status: "active" },
    { id: DEMOTED, email: "d@example.com", name: "Demoted", role: "member", status: "active" },
  ]);
});

beforeEach(async () => {
  vi.clearAllMocks();
  pending.length = 0;
  await db.delete(coachMessages);
  await db.delete(kpiGoals);
  await db.update(users).set({ status: "active" }).where(eq(users.id, M3));
  (sendCoachNotificationEmail as Mock).mockResolvedValue(undefined);
});

describe("a conversation between a member and the manager", () => {
  it("flows both ways, with unread counts that follow who has read what", async () => {
    signInAs(M1);
    expect((await messages.POST(request("POST", "/api/coach/messages", { body: "Hi" }))).status).toBe(201);
    await flush();

    signInAs(A1, "admin");
    const inbox = await json(await threads.GET());
    expect(inbox.data).toHaveLength(1);
    expect(inbox.data[0]).toMatchObject({ memberId: M1, memberName: "Member One", unreadCount: 1 });

    const thread = await json(await messages.GET(request("GET", `/api/coach/messages?memberId=${M1}`)));
    expect(thread.data.map((m: { body: string }) => m.body)).toEqual(["Hi"]);
    expect(thread.data[0].senderName).toBe("Member One");

    expect((await read.POST(request("POST", "/api/coach/read", { memberId: M1 }))).status).toBe(200);
    expect((await json(await threads.GET())).data[0].unreadCount).toBe(0);

    const reply = await messages.POST(request("POST", "/api/coach/messages", { body: "Hello", memberId: M1 }));
    expect(reply.status).toBe(201);
    await flush();

    signInAs(M1);
    const own = await json(await messages.GET(request("GET", "/api/coach/messages")));
    expect(own.data.map((m: { body: string }) => m.body)).toEqual(["Hi", "Hello"]);
  });
});

describe("isolation between members", () => {
  it("never lets one member read or write another's thread", async () => {
    signInAs(M2);
    await messages.POST(request("POST", "/api/coach/messages", { body: "Private to M2" }));
    await flush();

    signInAs(M1);
    expect((await messages.GET(request("GET", `/api/coach/messages?memberId=${M2}`))).status).toBe(403);
    expect(
      (await messages.POST(request("POST", "/api/coach/messages", { body: "Sneaky", memberId: M2 }))).status,
    ).toBe(403);
    expect((await read.POST(request("POST", "/api/coach/read", { memberId: M2 }))).status).toBe(403);
    expect((await threads.GET()).status).toBe(403);

    const own = await json(await messages.GET(request("GET", "/api/coach/messages")));
    expect(own.data).toEqual([]);
    expect(JSON.stringify(own)).not.toContain("Private to M2");

    const rows = await db.select().from(coachMessages);
    expect(rows.map((r) => r.body)).toEqual(["Private to M2"]);
  });
});

describe("accounts that changed after the session was issued", () => {
  it("locks out a member who was deactivated, even with a valid token", async () => {
    await db.update(users).set({ status: "inactive" }).where(eq(users.id, M3));
    signInAs(M3);
    expect((await messages.GET(request("GET", "/api/coach/messages"))).status).toBe(401);
    expect((await messages.POST(request("POST", "/api/coach/messages", { body: "Still here?" }))).status).toBe(401);
    expect(await db.select().from(coachMessages)).toEqual([]);
  });

  it("treats a demoted admin as a member, whatever the token says", async () => {
    signInAs(DEMOTED, "admin");
    expect((await threads.GET()).status).toBe(403);
    expect((await goals.POST(request("POST", "/api/admin/kpi/goals", goalBody))).status).toBe(403);
    expect(await db.select().from(kpiGoals)).toEqual([]);
  });
});

describe("notification emails", () => {
  it("sends one email per window, however many messages follow", async () => {
    signInAs(M1);
    await messages.POST(request("POST", "/api/coach/messages", { body: "one" }));
    await flush();
    await messages.POST(request("POST", "/api/coach/messages", { body: "two" }));
    await flush();
    await messages.POST(request("POST", "/api/coach/messages", { body: "three" }));
    await flush();

    expect(sendCoachNotificationEmail).toHaveBeenCalledTimes(1);
    expect(sendCoachNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a1@example.com", senderName: "Member One" }),
    );
    const notified = (await db.select().from(coachMessages)).filter((m) => m.notifiedAt !== null);
    expect(notified).toHaveLength(1);
  });

  it("keeps trying after a failed send instead of going quiet", async () => {
    (sendCoachNotificationEmail as Mock).mockRejectedValueOnce(new Error("SMTP down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    signInAs(M2);

    const first = await messages.POST(request("POST", "/api/coach/messages", { body: "one" }));
    await flush();
    expect(first.status).toBe(201);
    expect((await db.select().from(coachMessages)).every((m) => m.notifiedAt === null)).toBe(true);

    await messages.POST(request("POST", "/api/coach/messages", { body: "two" }));
    await flush();

    expect(sendCoachNotificationEmail).toHaveBeenCalledTimes(2);
    expect((await db.select().from(coachMessages)).filter((m) => m.notifiedAt !== null)).toHaveLength(1);
  });

  it("never puts what was written into the email", async () => {
    signInAs(M1);
    await messages.POST(request("POST", "/api/coach/messages", { body: "A very private worry" }));
    await flush();
    expect(JSON.stringify((sendCoachNotificationEmail as Mock).mock.calls)).not.toContain("private worry");
  });
});

describe("goals stay private until the manager shares them", () => {
  async function createGoal() {
    signInAs(A1, "admin");
    const res = await goals.POST(request("POST", "/api/admin/kpi/goals", goalBody));
    expect(res.status).toBe(201);
    return (await json(res)).data.id as string;
  }
  const patch = (id: string, body: unknown, headers: Record<string, string> = {}) =>
    goalById.PATCH(request("PATCH", `/api/admin/kpi/goals/${id}`, body, headers), {
      params: Promise.resolve({ id }),
    });

  it("hides a draft from the member, shows it once shared, and hides it again when unshared", async () => {
    const id = await createGoal();
    expect(await listSharedByUser(M1, 2027)).toEqual([]);

    expect((await patch(id, { status: "shared" })).status).toBe(200);
    expect((await listSharedByUser(M1, 2027)).map((g) => g.title)).toEqual(["Own reconciliation"]);

    expect((await patch(id, { status: "draft" })).status).toBe(200);
    expect(await listSharedByUser(M1, 2027)).toEqual([]);
  });

  it("does not let a member change or share a goal", async () => {
    const id = await createGoal();
    signInAs(M1);
    expect((await patch(id, { status: "shared" })).status).toBe(403);
    const [row] = await db.select().from(kpiGoals);
    expect(row.status).toBe("draft");
  });

  it("refuses a cross-site request even from the manager's browser session", async () => {
    signInAs(A1, "admin");
    const res = await goals.POST(
      request("POST", "/api/admin/kpi/goals", goalBody, { Origin: "https://evil.example.net" }),
    );
    expect(res.status).toBe(403);
    expect(await db.select().from(kpiGoals)).toEqual([]);
  });

  it("keeps a title-only edit from un-sharing a shared goal", async () => {
    const id = await createGoal();
    await patch(id, { status: "shared" });
    await patch(id, { title: "Renamed" });
    const [row] = await db.select().from(kpiGoals);
    expect(row.title).toBe("Renamed");
    expect(row.status).toBe("shared");
  });
});
