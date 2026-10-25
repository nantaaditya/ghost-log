import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/coach/viewer", () => ({ getActiveViewer: vi.fn() }));
vi.mock("@/lib/kpi/goal-repository", () => ({
  update: vi.fn(),
  remove: vi.fn(),
  findById: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ env: { NEXTAUTH_URL: "https://app.test" } }));

import { getActiveViewer } from "@/lib/coach/viewer";
import * as goalRepo from "@/lib/kpi/goal-repository";
import { DELETE, PATCH } from "../route";

const GOAL_ID = "44444444-4444-4444-8444-444444444444";
const adminViewer = { id: "33333333-3333-4333-8333-333333333333", role: "admin", name: "Admin" };
const memberViewer = { id: "11111111-1111-4111-8111-111111111111", role: "member", name: "Member" };
const params = (id = GOAL_ID) => ({ params: Promise.resolve({ id }) });

function request(method: "PATCH" | "DELETE", body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost/api/admin/kpi/goals/${GOAL_ID}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("PATCH /api/admin/kpi/goals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getActiveViewer as Mock).mockResolvedValue(adminViewer);
    (goalRepo.update as Mock).mockImplementation(async (id, dto) => ({ id, ...dto }));
  });

  it("returns 401 when unauthenticated and 403 for a member", async () => {
    (getActiveViewer as Mock).mockResolvedValue(null);
    expect((await PATCH(request("PATCH", { title: "x" }), params())).status).toBe(401);
    (getActiveViewer as Mock).mockResolvedValue(memberViewer);
    expect((await PATCH(request("PATCH", { title: "x" }), params())).status).toBe(403);
    expect(goalRepo.update).not.toHaveBeenCalled();
  });

  it("returns 403 for a cross-site request", async () => {
    const res = await PATCH(request("PATCH", { title: "x" }, { Origin: "https://evil.example.net" }), params());
    expect(res.status).toBe(403);
    expect(goalRepo.update).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-uuid id, an empty update, bad JSON or an invalid field", async () => {
    expect((await PATCH(request("PATCH", { title: "x" }), params("abc"))).status).toBe(400);
    expect((await PATCH(request("PATCH", {}), params())).status).toBe(400);
    expect((await PATCH(request("PATCH", "{nope"), params())).status).toBe(400);
    expect((await PATCH(request("PATCH", { status: "archived" }), params())).status).toBe(400);
    expect(goalRepo.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the goal does not exist", async () => {
    (goalRepo.update as Mock).mockResolvedValue(null);
    expect((await PATCH(request("PATCH", { title: "x" }), params())).status).toBe(404);
  });

  it("updates only the given fields and returns the goal", async () => {
    const res = await PATCH(request("PATCH", { status: "shared" }), params());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(goalRepo.update).toHaveBeenCalledWith(GOAL_ID, { status: "shared" });
    expect(json.data.status).toBe("shared");
  });

  it("ignores an attempt to reassign the goal to someone else", async () => {
    await PATCH(request("PATCH", { title: "x", userId: "55555555-5555-4555-8555-555555555555" }), params());
    expect(goalRepo.update).toHaveBeenCalledWith(GOAL_ID, { title: "x" });
  });
});

describe("DELETE /api/admin/kpi/goals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getActiveViewer as Mock).mockResolvedValue(adminViewer);
    (goalRepo.findById as Mock).mockResolvedValue({ id: GOAL_ID });
    (goalRepo.remove as Mock).mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated and 403 for a member", async () => {
    (getActiveViewer as Mock).mockResolvedValue(null);
    expect((await DELETE(request("DELETE"), params())).status).toBe(401);
    (getActiveViewer as Mock).mockResolvedValue(memberViewer);
    expect((await DELETE(request("DELETE"), params())).status).toBe(403);
    expect(goalRepo.remove).not.toHaveBeenCalled();
  });

  it("returns 403 for a cross-site request", async () => {
    const res = await DELETE(request("DELETE", undefined, { Origin: "https://evil.example.net" }), params());
    expect(res.status).toBe(403);
    expect(goalRepo.remove).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-uuid id and 404 for an unknown goal", async () => {
    expect((await DELETE(request("DELETE"), params("abc"))).status).toBe(400);
    (goalRepo.findById as Mock).mockResolvedValue(null);
    expect((await DELETE(request("DELETE"), params())).status).toBe(404);
    expect(goalRepo.remove).not.toHaveBeenCalled();
  });

  it("deletes the goal", async () => {
    const res = await DELETE(request("DELETE"), params());
    expect(res.status).toBe(200);
    expect(goalRepo.remove).toHaveBeenCalledWith(GOAL_ID);
  });
});
