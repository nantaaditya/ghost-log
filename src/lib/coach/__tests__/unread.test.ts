import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("../message-repository", () => ({
  countUnread: vi.fn(),
  listThreadSummaries: vi.fn(),
}));

import { countUnread, listThreadSummaries } from "../message-repository";
import { getUnreadTotal } from "../unread";

const summary = (unreadCount: number) => ({
  memberId: `m-${unreadCount}`,
  memberName: "x",
  lastMessageAt: new Date("2026-10-25T10:00:00Z"),
  unreadCount,
});

describe("getUnreadTotal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("counts, for a member, what the managers have sent them", async () => {
    (countUnread as Mock).mockResolvedValue(3);
    expect(await getUnreadTotal({ id: "member-1", role: "member" })).toBe(3);
    expect(countUnread).toHaveBeenCalledWith("member-1", "member-1");
  });

  it("adds up, for an admin, every member's unread messages", async () => {
    (listThreadSummaries as Mock).mockResolvedValue([summary(2), summary(5), summary(0)]);
    expect(await getUnreadTotal({ id: "admin-1", role: "admin" })).toBe(7);
  });

  it("is zero for an admin with no conversations", async () => {
    (listThreadSummaries as Mock).mockResolvedValue([]);
    expect(await getUnreadTotal({ id: "admin-1", role: "admin" })).toBe(0);
  });

  it("is zero for an unknown role, without touching the database", async () => {
    expect(await getUnreadTotal({ id: "x", role: "guest" })).toBe(0);
    expect(countUnread).not.toHaveBeenCalled();
    expect(listThreadSummaries).not.toHaveBeenCalled();
  });

  it("degrades to zero instead of throwing, so a missing table cannot take the dashboard down", async () => {
    (countUnread as Mock).mockRejectedValue(new Error('relation "coach_messages" does not exist'));
    (listThreadSummaries as Mock).mockRejectedValue(new Error("db down"));
    expect(await getUnreadTotal({ id: "member-1", role: "member" })).toBe(0);
    expect(await getUnreadTotal({ id: "admin-1", role: "admin" })).toBe(0);
    expect(console.error).toHaveBeenCalled();
  });
});
