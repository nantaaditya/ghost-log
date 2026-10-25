import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

vi.mock("@/lib/db/client", async () => {
  const { createTestDb } = await import("@/test/pg-test-db");
  return { db: await createTestDb() };
});

import { db } from "@/lib/db/client";
import { coachMessages, users } from "@/lib/db/schema";
import * as repo from "../message-repository";

const M1 = "11111111-1111-4111-8111-111111111111";
const M2 = "22222222-2222-4222-8222-222222222222";
const A1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const A2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const at = (minute: number) => new Date(Date.UTC(2026, 9, 25, 10, minute, 0));

async function addMessage(params: {
  memberId: string;
  senderId: string;
  at: Date;
  body?: string;
  readAt?: Date | null;
  notifiedAt?: Date | null;
}) {
  const [row] = await db
    .insert(coachMessages)
    .values({
      memberId: params.memberId,
      senderId: params.senderId,
      body: params.body ?? "msg",
      createdAt: params.at,
      readAt: params.readAt ?? null,
      notifiedAt: params.notifiedAt ?? null,
    })
    .returning();
  return row;
}

async function readAtOf(id: string): Promise<Date | null> {
  const rows = await db.select().from(coachMessages);
  return rows.find((row) => row.id === id)?.readAt ?? null;
}

beforeAll(async () => {
  await db.insert(users).values([
    { id: M1, email: "m1@example.com", name: "Member One", role: "member", status: "active" },
    { id: M2, email: "m2@example.com", name: "Member Two", role: "member", status: "active" },
    { id: A1, email: "a1@example.com", name: "Admin One", role: "admin", status: "active" },
    { id: A2, email: "a2@example.com", name: "Admin Two", role: "admin", status: "active" },
  ]);
});

beforeEach(async () => {
  await db.delete(coachMessages);
});

describe("listThread", () => {
  it("returns the thread oldest-first with the sender's name", async () => {
    await addMessage({ memberId: M1, senderId: A1, at: at(2), body: "second" });
    await addMessage({ memberId: M1, senderId: M1, at: at(1), body: "first" });

    const messages = await repo.listThread(M1);

    expect(messages.map((m) => m.body)).toEqual(["first", "second"]);
    expect(messages.map((m) => m.senderName)).toEqual(["Member One", "Admin One"]);
  });

  it("never returns another member's thread", async () => {
    await addMessage({ memberId: M2, senderId: M2, at: at(1), body: "private to M2" });
    expect(await repo.listThread(M1)).toEqual([]);
  });

  it("with `after`, includes a message at exactly that instant and everything newer", async () => {
    await addMessage({ memberId: M1, senderId: M1, at: at(1), body: "old" });
    await addMessage({ memberId: M1, senderId: A1, at: at(2), body: "same instant" });
    await addMessage({ memberId: M1, senderId: M1, at: at(3), body: "newer" });

    const messages = await repo.listThread(M1, at(2));

    expect(messages.map((m) => m.body)).toEqual(["same instant", "newer"]);
  });

  it("caps the result at the most recent messages, still oldest-first", async () => {
    for (let minute = 1; minute <= 5; minute++) {
      await addMessage({ memberId: M1, senderId: M1, at: at(minute), body: `m${minute}` });
    }

    const messages = await repo.listThread(M1, undefined, 3);

    expect(messages.map((m) => m.body)).toEqual(["m3", "m4", "m5"]);
  });
});

describe("create", () => {
  it("stores the message with a JS-stamped createdAt", async () => {
    const message = await repo.create({ memberId: M1, senderId: M1, body: "hello" });

    expect(message.body).toBe("hello");
    expect(Math.abs(message.createdAt.getTime() - Date.now())).toBeLessThan(5_000);
    expect(message.readAt).toBeNull();
    expect(message.notifiedAt).toBeNull();
  });

  it("still stamps createdAt when the dto passes an explicit undefined", async () => {
    const message = await repo.create({ memberId: M1, senderId: M1, body: "hi", createdAt: undefined });
    expect(Math.abs(message.createdAt.getTime() - Date.now())).toBeLessThan(5_000);
  });

  it("keeps an explicit createdAt", async () => {
    const message = await repo.create({ memberId: M1, senderId: M1, body: "hi", createdAt: at(7) });
    expect(message.createdAt).toEqual(at(7));
  });
});

describe("markThreadRead / countUnread: unread means unread by the thread's counterpart", () => {
  it("an admin reading marks only the member's messages, never another admin's", async () => {
    const fromMember = await addMessage({ memberId: M1, senderId: M1, at: at(1) });
    const fromOtherAdmin = await addMessage({ memberId: M1, senderId: A2, at: at(2) });

    await repo.markThreadRead(M1, A1);

    expect(await readAtOf(fromMember.id)).not.toBeNull();
    expect(await readAtOf(fromOtherAdmin.id)).toBeNull();
  });

  it("a member reading marks every admin's messages but not their own", async () => {
    const fromA1 = await addMessage({ memberId: M1, senderId: A1, at: at(1) });
    const fromA2 = await addMessage({ memberId: M1, senderId: A2, at: at(2) });
    const own = await addMessage({ memberId: M1, senderId: M1, at: at(3) });

    await repo.markThreadRead(M1, M1);

    expect(await readAtOf(fromA1.id)).not.toBeNull();
    expect(await readAtOf(fromA2.id)).not.toBeNull();
    expect(await readAtOf(own.id)).toBeNull();
  });

  it("with `upTo`, leaves messages that arrived after what the reader saw unread", async () => {
    const seen = await addMessage({ memberId: M1, senderId: A1, at: at(1) });
    const unseen = await addMessage({ memberId: M1, senderId: A1, at: at(5) });

    await repo.markThreadRead(M1, M1, at(3));

    expect(await readAtOf(seen.id)).not.toBeNull();
    expect(await readAtOf(unseen.id)).toBeNull();
  });

  it("does not touch another member's thread", async () => {
    const other = await addMessage({ memberId: M2, senderId: M2, at: at(1) });
    await repo.markThreadRead(M1, A1);
    expect(await readAtOf(other.id)).toBeNull();
  });

  it("counts, for an admin, only the member's unread messages", async () => {
    await addMessage({ memberId: M1, senderId: M1, at: at(1) });
    await addMessage({ memberId: M1, senderId: M1, at: at(2), readAt: at(3) });
    await addMessage({ memberId: M1, senderId: A2, at: at(4) });

    expect(await repo.countUnread(M1, A1)).toBe(1);
  });

  it("counts, for a member, the unread messages from admins", async () => {
    await addMessage({ memberId: M1, senderId: A1, at: at(1) });
    await addMessage({ memberId: M1, senderId: A2, at: at(2) });
    await addMessage({ memberId: M1, senderId: M1, at: at(3) });

    expect(await repo.countUnread(M1, M1)).toBe(2);
  });

  it("counts zero for an empty thread", async () => {
    expect(await repo.countUnread(M1, A1)).toBe(0);
  });
});

describe("listThreadSummaries", () => {
  it("lists one row per member thread, most recent activity first", async () => {
    await addMessage({ memberId: M1, senderId: M1, at: at(1) });
    await addMessage({ memberId: M2, senderId: M2, at: at(9), readAt: at(10) });

    const summaries = await repo.listThreadSummaries();

    expect(summaries.map((s) => s.memberId)).toEqual([M2, M1]);
    expect(summaries[0].memberName).toBe("Member Two");
    expect(summaries[0].lastMessageAt).toBeInstanceOf(Date);
    expect(summaries[0].lastMessageAt).toEqual(at(9));
  });

  it("counts only unread messages sent by the member", async () => {
    await addMessage({ memberId: M1, senderId: M1, at: at(1) });
    await addMessage({ memberId: M1, senderId: M1, at: at(2) });
    await addMessage({ memberId: M1, senderId: M1, at: at(3), readAt: at(4) });
    await addMessage({ memberId: M1, senderId: A1, at: at(5) });

    const [summary] = await repo.listThreadSummaries();

    expect(summary.unreadCount).toBe(2);
  });

  it("is empty when there are no threads", async () => {
    expect(await repo.listThreadSummaries()).toEqual([]);
  });
});

describe("countSentSince", () => {
  it("counts the sender's messages at or after the cutoff, across threads", async () => {
    await addMessage({ memberId: M1, senderId: A1, at: at(1) });
    await addMessage({ memberId: M1, senderId: A1, at: at(5) });
    await addMessage({ memberId: M2, senderId: A1, at: at(6) });
    await addMessage({ memberId: M1, senderId: M1, at: at(7) });

    expect(await repo.countSentSince(A1, at(5))).toBe(2);
  });

  it("is zero for someone who has sent nothing", async () => {
    expect(await repo.countSentSince(A2, at(0))).toBe(0);
  });
});

describe("email throttle: keyed on emails actually sent", () => {
  it("is false when nothing was ever notified", async () => {
    await addMessage({ memberId: M1, senderId: A1, at: at(1) });
    expect(await repo.hasRecentNotification({ memberId: M1, senderId: A1, since: at(0) })).toBe(false);
  });

  it("is true after markNotified for a message from that sender in the window", async () => {
    const message = await addMessage({ memberId: M1, senderId: A1, at: at(1) });
    await repo.markNotified(message.id, at(2));

    expect(await repo.hasRecentNotification({ memberId: M1, senderId: A1, since: at(2) })).toBe(true);
  });

  it("is false once the notification is older than the window", async () => {
    const message = await addMessage({ memberId: M1, senderId: A1, at: at(1) });
    await repo.markNotified(message.id, at(2));

    expect(await repo.hasRecentNotification({ memberId: M1, senderId: A1, since: at(3) })).toBe(false);
  });

  it("ignores notifications for other senders and other threads", async () => {
    const otherSender = await addMessage({ memberId: M1, senderId: A2, at: at(1) });
    const otherThread = await addMessage({ memberId: M2, senderId: A1, at: at(1) });
    await repo.markNotified(otherSender.id, at(2));
    await repo.markNotified(otherThread.id, at(2));

    expect(await repo.hasRecentNotification({ memberId: M1, senderId: A1, since: at(0) })).toBe(false);
  });

  it("an unread, never-emailed message does not suppress later notifications", async () => {
    // The reviewer's chain scenario: earlier messages stayed unread but no email went out.
    await addMessage({ memberId: M1, senderId: A1, at: at(1) });
    await addMessage({ memberId: M1, senderId: A1, at: at(2) });

    expect(await repo.hasRecentNotification({ memberId: M1, senderId: A1, since: at(0) })).toBe(false);
  });
});
