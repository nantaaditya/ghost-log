import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/coach/viewer", () => ({ getActiveViewer: vi.fn() }));
vi.mock("@/lib/coach/message-repository", () => ({ markThreadRead: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { NEXTAUTH_URL: "https://app.test" } }));

import { getActiveViewer } from "@/lib/coach/viewer";
import * as messageRepo from "@/lib/coach/message-repository";
import { POST } from "../route";

const MEMBER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const ADMIN_ID = "33333333-3333-4333-8333-333333333333";

const memberSession = { id: MEMBER_ID, role: "member", name: "Member" };
const adminSession = { id: ADMIN_ID, role: "admin", name: "Admin" };

function postRequest(body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/coach/read", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("POST /api/coach/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (messageRepo.markThreadRead as Mock).mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    (getActiveViewer as Mock).mockResolvedValue(null);
    const res = await POST(postRequest({}));
    expect(res.status).toBe(401);
    expect(messageRepo.markThreadRead).not.toHaveBeenCalled();
  });

  it("marks the member's own thread read, as the reader", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest());
    expect(res.status).toBe(200);
    expect(messageRepo.markThreadRead).toHaveBeenCalledWith(MEMBER_ID, MEMBER_ID, undefined);
  });

  it("returns 403 when a member tries to mark another member's thread", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest({ memberId: OTHER_MEMBER_ID }));
    expect(res.status).toBe(403);
    expect(messageRepo.markThreadRead).not.toHaveBeenCalled();
  });

  it("returns 400 when an admin does not say which member", async () => {
    (getActiveViewer as Mock).mockResolvedValue(adminSession);
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("lets an admin mark a member's thread read, with the admin as reader", async () => {
    (getActiveViewer as Mock).mockResolvedValue(adminSession);
    const res = await POST(postRequest({ memberId: OTHER_MEMBER_ID }));
    expect(res.status).toBe(200);
    expect(messageRepo.markThreadRead).toHaveBeenCalledWith(OTHER_MEMBER_ID, ADMIN_ID, undefined);
  });

  it("returns 400 for a non-uuid memberId", async () => {
    (getActiveViewer as Mock).mockResolvedValue(adminSession);
    const res = await POST(postRequest({ memberId: "abc" }));
    expect(res.status).toBe(400);
  });

  it("passes `upTo` through so messages the reader has not seen stay unread", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest({ upTo: "2026-10-25T10:00:00.000Z" }));
    expect(res.status).toBe(200);
    expect(messageRepo.markThreadRead).toHaveBeenCalledWith(
      MEMBER_ID,
      MEMBER_ID,
      new Date("2026-10-25T10:00:00.000Z"),
    );
  });

  it("returns 400 for a malformed `upTo`", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest({ upTo: "later" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 for a cross-site request and does not change anything", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest({}, { Origin: "https://evil.example.net" }));
    expect(res.status).toBe(403);
    expect(messageRepo.markThreadRead).not.toHaveBeenCalled();
  });

  it("accepts a same-origin request", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest({}, { Origin: "https://app.test" }));
    expect(res.status).toBe(200);
  });
});
