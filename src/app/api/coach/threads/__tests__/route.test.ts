import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/coach/viewer", () => ({ getActiveViewer: vi.fn() }));
vi.mock("@/lib/coach/message-repository", () => ({ listThreadSummaries: vi.fn() }));

import { getActiveViewer } from "@/lib/coach/viewer";
import * as messageRepo from "@/lib/coach/message-repository";
import { GET } from "../route";

const memberSession = { id: "member-1", role: "member", name: "Member" };
const adminSession = { id: "admin-1", role: "admin", name: "Admin" };

describe("GET /api/coach/threads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (messageRepo.listThreadSummaries as Mock).mockResolvedValue([
      {
        memberId: "member-1",
        memberName: "Member",
        lastMessageAt: new Date("2026-10-25T10:00:00Z"),
        unreadCount: 2,
      },
    ]);
  });

  it("returns 401 when unauthenticated", async () => {
    (getActiveViewer as Mock).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns 403 for a member, so members can never list other members' threads", async () => {
    (getActiveViewer as Mock).mockResolvedValue(memberSession);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(messageRepo.listThreadSummaries).not.toHaveBeenCalled();
  });

  it("returns the inbox for an admin", async () => {
    (getActiveViewer as Mock).mockResolvedValue(adminSession);
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].unreadCount).toBe(2);
  });
});
