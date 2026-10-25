import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/coach/viewer", () => ({ getActiveViewer: vi.fn() }));
vi.mock("@/lib/kpi/goal-repository", () => ({ create: vi.fn(), listByUser: vi.fn() }));
vi.mock("@/lib/coach/member-repository", () => ({ findMemberById: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { NEXTAUTH_URL: "https://app.test" } }));

import { getActiveViewer } from "@/lib/coach/viewer";
import * as goalRepo from "@/lib/kpi/goal-repository";
import * as memberRepo from "@/lib/coach/member-repository";
import { POST } from "../route";

const MEMBER_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_ID = "33333333-3333-4333-8333-333333333333";
const adminViewer = { id: ADMIN_ID, role: "admin", name: "Admin" };
const memberViewer = { id: MEMBER_ID, role: "member", name: "Member" };

const validBody = {
  userId: MEMBER_ID,
  cycleYear: 2027,
  type: "hard",
  skillKey: "clearing-settlement",
  title: "Own reconciliation",
  measure: "Match rate from 97% to 99.5%",
  developmentAction: "Pair with the settlement owner",
  milestones: [{ quarter: "Q1", description: "Map the flow" }],
};

function postRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/admin/kpi/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/admin/kpi/goals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getActiveViewer as Mock).mockResolvedValue(adminViewer);
    (memberRepo.findMemberById as Mock).mockResolvedValue({ id: MEMBER_ID, name: "M", email: "m@x.io", status: "active" });
    (goalRepo.listByUser as Mock).mockResolvedValue([{ sortOrder: 0 }, { sortOrder: 1 }]);
    (goalRepo.create as Mock).mockImplementation(async (dto) => ({ id: "goal-1", ...dto }));
  });

  it("returns 401 when unauthenticated", async () => {
    (getActiveViewer as Mock).mockResolvedValue(null);
    expect((await POST(postRequest(validBody))).status).toBe(401);
    expect(goalRepo.create).not.toHaveBeenCalled();
  });

  it("returns 403 for a member: only the manager writes goals", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberViewer);
    expect((await POST(postRequest(validBody))).status).toBe(403);
    expect(goalRepo.create).not.toHaveBeenCalled();
  });

  it("returns 403 for a cross-site request", async () => {
    const res = await POST(postRequest(validBody, { Origin: "https://evil.example.net" }));
    expect(res.status).toBe(403);
    expect(goalRepo.create).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON and for invalid input", async () => {
    expect((await POST(postRequest("{nope"))).status).toBe(400);
    expect((await POST(postRequest({ ...validBody, title: "" }))).status).toBe(400);
    expect((await POST(postRequest({ ...validBody, userId: "abc" }))).status).toBe(400);
    expect(goalRepo.create).not.toHaveBeenCalled();
  });

  it("returns 404 when the goal's owner is not an active member", async () => {
    (memberRepo.findMemberById as Mock).mockResolvedValue(null);
    expect((await POST(postRequest(validBody))).status).toBe(404);
    expect(goalRepo.create).not.toHaveBeenCalled();
  });

  it("creates a draft goal at the end of the user's list and returns 201", async () => {
    const res = await POST(postRequest(validBody));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data.id).toBe("goal-1");
    expect(goalRepo.listByUser).toHaveBeenCalledWith(MEMBER_ID, 2027);
    expect(goalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: MEMBER_ID,
        cycleYear: 2027,
        type: "hard",
        skillKey: "clearing-settlement",
        status: "draft",
        sortOrder: 2,
      }),
    );
  });

  it("places a new goal after the highest existing sortOrder, even when earlier goals were deleted", async () => {
    (goalRepo.listByUser as Mock).mockResolvedValue([{ sortOrder: 2 }, { sortOrder: 5 }]);
    await POST(postRequest(validBody));
    expect(goalRepo.create).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 6 }));
  });

  it("starts at 0 for a member with no goals yet", async () => {
    (goalRepo.listByUser as Mock).mockResolvedValue([]);
    await POST(postRequest(validBody));
    expect(goalRepo.create).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 0 }));
  });

  it("accepts a request from the app's own origin", async () => {
    const res = await POST(postRequest(validBody, { Origin: "https://app.test" }));
    expect(res.status).toBe(201);
  });
});
