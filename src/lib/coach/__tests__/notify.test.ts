import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/env", () => ({ env: { NEXTAUTH_URL: "https://app.test" } }));
vi.mock("@/lib/coach/message-repository", () => ({
  hasRecentNotification: vi.fn(),
  markNotified: vi.fn(),
}));
vi.mock("@/lib/coach/member-repository", () => ({
  findMemberById: vi.fn(),
  listActiveAdmins: vi.fn(),
}));
vi.mock("@/lib/email/send-coach-notification", () => ({ sendCoachNotificationEmail: vi.fn() }));

import * as messageRepo from "../message-repository";
import * as memberRepo from "../member-repository";
import { sendCoachNotificationEmail } from "@/lib/email/send-coach-notification";
import { NOTIFY_THROTTLE_MS } from "../constants";
import { notifyNewMessage } from "../notify";

const NOW = new Date("2026-10-25T10:00:00Z");
const member = { id: "member-1", name: "Member", email: "member@example.com", status: "active" };
const admins = [{ id: "admin-1", name: "Admin", email: "admin@example.com" }];

describe("notifyNewMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    (messageRepo.hasRecentNotification as Mock).mockResolvedValue(false);
    (messageRepo.markNotified as Mock).mockResolvedValue(undefined);
    (memberRepo.findMemberById as Mock).mockResolvedValue(member);
    (memberRepo.listActiveAdmins as Mock).mockResolvedValue(admins);
    (sendCoachNotificationEmail as Mock).mockResolvedValue(undefined);
  });

  it("emails the active admins when a member writes", async () => {
    await notifyNewMessage({
      memberId: "member-1",
      messageId: "msg-1",
      sender: { id: "member-1", name: "Member", role: "member" },
      now: NOW,
    });
    expect(sendCoachNotificationEmail).toHaveBeenCalledTimes(1);
    expect(sendCoachNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "admin@example.com", senderName: "Member" }),
    );
  });

  it("emails the member when an admin writes", async () => {
    await notifyNewMessage({
      memberId: "member-1",
      messageId: "msg-1",
      sender: { id: "admin-1", name: "Admin", role: "admin" },
      now: NOW,
    });
    expect(sendCoachNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "member@example.com", senderName: "Admin" }),
    );
  });

  it("links to the coach page and never includes message content", async () => {
    await notifyNewMessage({
      memberId: "member-1",
      messageId: "msg-1",
      sender: { id: "admin-1", name: "Admin", role: "admin" },
      now: NOW,
    });
    const params = (sendCoachNotificationEmail as Mock).mock.calls[0][0];
    expect(params.url).toBe("https://app.test/coach");
    expect(Object.keys(params).sort()).toEqual(["recipientName", "senderName", "to", "url"]);
  });

  it("is throttled: skips the email if one was already sent for this sender recently", async () => {
    (messageRepo.hasRecentNotification as Mock).mockResolvedValue(true);
    await notifyNewMessage({
      memberId: "member-1",
      messageId: "msg-2",
      sender: { id: "member-1", name: "Member", role: "member" },
      now: NOW,
    });
    expect(sendCoachNotificationEmail).not.toHaveBeenCalled();
  });

  it("asks whether this sender emailed this thread within the throttle window", async () => {
    await notifyNewMessage({
      memberId: "member-1",
      messageId: "msg-2",
      sender: { id: "member-1", name: "Member", role: "member" },
      now: NOW,
    });
    expect(messageRepo.hasRecentNotification).toHaveBeenCalledWith({
      memberId: "member-1",
      senderId: "member-1",
      since: new Date(NOW.getTime() - NOTIFY_THROTTLE_MS),
    });
  });

  it("records the message as notified once an email went out", async () => {
    await notifyNewMessage({
      memberId: "member-1",
      messageId: "msg-1",
      sender: { id: "admin-1", name: "Admin", role: "admin" },
      now: NOW,
    });
    expect(messageRepo.markNotified).toHaveBeenCalledWith("msg-1", NOW);
  });

  it("does not record a notification when the send failed, so the next message retries", async () => {
    (sendCoachNotificationEmail as Mock).mockRejectedValue(new Error("SMTP down"));
    await notifyNewMessage({
      memberId: "member-1",
      messageId: "msg-1",
      sender: { id: "member-1", name: "Member", role: "member" },
      now: NOW,
    });
    expect(messageRepo.markNotified).not.toHaveBeenCalled();
  });

  it("does not record a notification when there was nobody to email", async () => {
    (memberRepo.listActiveAdmins as Mock).mockResolvedValue([]);
    await notifyNewMessage({
      memberId: "member-1",
      messageId: "msg-1",
      sender: { id: "member-1", name: "Member", role: "member" },
      now: NOW,
    });
    expect(messageRepo.markNotified).not.toHaveBeenCalled();
  });

  it("records the notification if at least one of several recipients was emailed", async () => {
    (memberRepo.listActiveAdmins as Mock).mockResolvedValue([
      { id: "admin-1", name: "A1", email: "a1@example.com" },
      { id: "admin-2", name: "A2", email: "a2@example.com" },
    ]);
    (sendCoachNotificationEmail as Mock)
      .mockRejectedValueOnce(new Error("bounce"))
      .mockResolvedValueOnce(undefined);
    await notifyNewMessage({
      memberId: "member-1",
      messageId: "msg-1",
      sender: { id: "member-1", name: "Member", role: "member" },
      now: NOW,
    });
    expect(messageRepo.markNotified).toHaveBeenCalledWith("msg-1", NOW);
  });

  it("does not email an inactive or missing member", async () => {
    (memberRepo.findMemberById as Mock).mockResolvedValue(null);
    await notifyNewMessage({
      memberId: "member-1",
      messageId: "msg-1",
      sender: { id: "admin-1", name: "Admin", role: "admin" },
      now: NOW,
    });
    expect(sendCoachNotificationEmail).not.toHaveBeenCalled();
  });

  it("never throws when sending fails, and logs without the recipient's email", async () => {
    (sendCoachNotificationEmail as Mock).mockRejectedValue(new Error("SMTP down"));
    await expect(
      notifyNewMessage({
        memberId: "member-1",
        messageId: "msg-1",
        sender: { id: "member-1", name: "Member", role: "member" },
        now: NOW,
      }),
    ).resolves.toBeUndefined();
    const logged = JSON.stringify((console.error as Mock).mock.calls);
    expect(logged).toContain("SMTP down");
    expect(logged).not.toContain("admin@example.com");
  });

  it("never throws when the throttle lookup fails", async () => {
    (messageRepo.hasRecentNotification as Mock).mockRejectedValue(new Error("db down"));
    await expect(
      notifyNewMessage({
        memberId: "member-1",
        messageId: "msg-1",
        sender: { id: "member-1", name: "Member", role: "member" },
        now: NOW,
      }),
    ).resolves.toBeUndefined();
  });
});
