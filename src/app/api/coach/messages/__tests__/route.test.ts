import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/coach/viewer", () => ({ getActiveViewer: vi.fn() }));
vi.mock("@/lib/coach/message-repository", () => ({
  listThread: vi.fn(),
  create: vi.fn(),
  countSentSince: vi.fn(),
}));
vi.mock("@/lib/coach/member-repository", () => ({ findMemberById: vi.fn() }));
vi.mock("@/lib/coach/notify", () => ({ notifyNewMessage: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { NEXTAUTH_URL: "https://app.test" } }));
// `after` only works inside a real request scope; run the callback inline for tests.
vi.mock("next/server", () => ({
  after: (callback: () => unknown) => {
    void callback();
  },
}));

import { getActiveViewer } from "@/lib/coach/viewer";
import * as messageRepo from "@/lib/coach/message-repository";
import * as memberRepo from "@/lib/coach/member-repository";
import { notifyNewMessage } from "@/lib/coach/notify";
import { CURSOR_LOOKBACK_MS, MESSAGE_RATE_LIMIT } from "@/lib/coach/constants";
import { GET, POST } from "../route";

const MEMBER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const ADMIN_ID = "33333333-3333-4333-8333-333333333333";

const memberSession = { id: MEMBER_ID, role: "member", name: "Member" };
const adminSession = { id: ADMIN_ID, role: "admin", name: "Admin" };

const storedMessage = {
  id: "msg-1",
  memberId: MEMBER_ID,
  senderId: MEMBER_ID,
  body: "Hello",
  createdAt: new Date("2026-10-25T10:00:00Z"),
  readAt: null,
};

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/coach/messages${query}`);
}

function postRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/coach/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("GET /api/coach/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (messageRepo.listThread as Mock).mockResolvedValue([]);
  });

  it("returns 401 when unauthenticated", async () => {
    (getActiveViewer as Mock).mockResolvedValue(null);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    expect(messageRepo.listThread).not.toHaveBeenCalled();
  });

  it("returns the member's own thread when no memberId is given", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await GET(getRequest());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(messageRepo.listThread).toHaveBeenCalledWith(MEMBER_ID, undefined);
  });

  it("returns 403 when a member asks for another member's thread", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await GET(getRequest(`?memberId=${OTHER_MEMBER_ID}`));
    expect(res.status).toBe(403);
    expect(messageRepo.listThread).not.toHaveBeenCalled();
  });

  it("returns 400 when an admin does not say which member", async () => {
    (getActiveViewer as Mock).mockResolvedValue(adminSession);
    const res = await GET(getRequest());
    expect(res.status).toBe(400);
    expect(messageRepo.listThread).not.toHaveBeenCalled();
  });

  it("lets an admin read any member's thread", async () => {
    (getActiveViewer as Mock).mockResolvedValue(adminSession);
    const res = await GET(getRequest(`?memberId=${OTHER_MEMBER_ID}`));
    expect(res.status).toBe(200);
    expect(messageRepo.listThread).toHaveBeenCalledWith(OTHER_MEMBER_ID, undefined);
  });

  it("backs the polling cursor up by the look-back window, so out-of-order commits are not missed", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const cursor = new Date("2026-10-25T10:00:00.000Z");
    await GET(getRequest(`?after=${cursor.toISOString()}`));
    expect(messageRepo.listThread).toHaveBeenCalledWith(
      MEMBER_ID,
      new Date(cursor.getTime() - CURSOR_LOOKBACK_MS),
    );
  });

  it("returns 400 for a malformed query", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    expect((await GET(getRequest("?after=yesterday"))).status).toBe(400);
    expect((await GET(getRequest("?memberId=abc"))).status).toBe(400);
  });
});

describe("POST /api/coach/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (messageRepo.countSentSince as Mock).mockResolvedValue(0);
    (messageRepo.create as Mock).mockResolvedValue(storedMessage);
    (memberRepo.findMemberById as Mock).mockResolvedValue({
      id: OTHER_MEMBER_ID,
      name: "Other",
      email: "other@example.com",
      status: "active",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    (getActiveViewer as Mock).mockResolvedValue(null);
    const res = await POST(postRequest({ body: "Hi" }));
    expect(res.status).toBe(401);
    expect(messageRepo.create).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty body", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest({ body: "   " }));
    expect(res.status).toBe(400);
    expect(messageRepo.create).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest("{not json"));
    expect(res.status).toBe(400);
  });

  it("creates a member message in their own thread and returns 201 with senderName", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest({ body: "Hello" }));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data.senderName).toBe("Member");
    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: MEMBER_ID, senderId: MEMBER_ID, body: "Hello" }),
    );
  });

  it("returns 403 when a member posts into another member's thread", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest({ body: "Hello", memberId: OTHER_MEMBER_ID }));
    expect(res.status).toBe(403);
    expect(messageRepo.create).not.toHaveBeenCalled();
  });

  it("returns 400 when an admin does not say which member", async () => {
    (getActiveViewer as Mock).mockResolvedValue(adminSession);
    const res = await POST(postRequest({ body: "Hello" }));
    expect(res.status).toBe(400);
    expect(messageRepo.create).not.toHaveBeenCalled();
  });

  it("returns 404 when an admin targets someone who is not an active member", async () => {
    (getActiveViewer as Mock).mockResolvedValue(adminSession);
    (memberRepo.findMemberById as Mock).mockResolvedValue(null);
    const res = await POST(postRequest({ body: "Hello", memberId: OTHER_MEMBER_ID }));
    expect(res.status).toBe(404);
    expect(messageRepo.create).not.toHaveBeenCalled();
  });

  it("lets an admin post into a member's thread, with the admin as sender", async () => {
    (getActiveViewer as Mock).mockResolvedValue(adminSession);
    const res = await POST(postRequest({ body: "How are you?", memberId: OTHER_MEMBER_ID }));
    expect(res.status).toBe(201);
    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: OTHER_MEMBER_ID, senderId: ADMIN_ID, body: "How are you?" }),
    );
  });

  it("returns 429 when the sender exceeds the rate limit", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    (messageRepo.countSentSince as Mock).mockResolvedValue(MESSAGE_RATE_LIMIT);
    const res = await POST(postRequest({ body: "Spam" }));
    expect(res.status).toBe(429);
    expect(messageRepo.create).not.toHaveBeenCalled();
  });

  it("notifies the other party after saving, without putting the body in the call", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    await POST(postRequest({ body: "Secret content" }));
    expect(notifyNewMessage).toHaveBeenCalledTimes(1);
    const args = (notifyNewMessage as Mock).mock.calls[0][0];
    expect(args).toMatchObject({
      memberId: MEMBER_ID,
      messageId: "msg-1",
      sender: { id: MEMBER_ID, role: "member" },
    });
    expect(JSON.stringify(args)).not.toContain("Secret content");
  });

  it("sets the sender's name from the database-backed viewer, not a stale token", async () => {
    (getActiveViewer as Mock).mockResolvedValue({ ...memberSession, name: "Renamed Member" });
    const res = await POST(postRequest({ body: "Hello" }));
    const json = await res.json();
    expect(json.data.senderName).toBe("Renamed Member");
  });

  it("returns 403 for a cross-site request and writes nothing", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest({ body: "Hello" }, { Origin: "https://evil.example.net" }));
    expect(res.status).toBe(403);
    expect(messageRepo.create).not.toHaveBeenCalled();
    expect(notifyNewMessage).not.toHaveBeenCalled();
  });

  it("accepts a same-origin request", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await POST(postRequest({ body: "Hello" }, { Origin: "https://app.test" }));
    expect(res.status).toBe(201);
  });

  it("does not notify when the message was rejected", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    await POST(postRequest({ body: "" }));
    expect(notifyNewMessage).not.toHaveBeenCalled();
  });
});
