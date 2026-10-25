import { describe, it, expect } from "vitest";
import {
  mergeMessages,
  newestCreatedAt,
  toChatMessage,
  unreadUpTo,
  type ChatMessage,
} from "../thread-state";

describe("toChatMessage", () => {
  it("turns database dates into ISO strings and keeps only what the browser needs", () => {
    // A variable, as real callers pass a repository row; it carries a memberId the browser must not get.
    const row = {
      id: "a",
      memberId: "member-1",
      senderId: "admin-1",
      senderName: "Manager",
      body: "Hello",
      createdAt: new Date("2026-10-25T10:00:00.000Z"),
      readAt: new Date("2026-10-25T10:05:00.000Z"),
    };
    const dto = toChatMessage(row);
    expect(dto).toEqual({
      id: "a",
      senderId: "admin-1",
      senderName: "Manager",
      body: "Hello",
      createdAt: "2026-10-25T10:00:00.000Z",
      readAt: "2026-10-25T10:05:00.000Z",
    });
  });

  it("keeps an unread message's readAt as null", () => {
    const row = {
      id: "a",
      senderId: "s",
      senderName: "S",
      body: "x",
      createdAt: new Date("2026-10-25T10:00:00.000Z"),
      readAt: null,
    };
    expect(toChatMessage(row).readAt).toBeNull();
  });
});

const MEMBER = "member-1";
const ADMIN = "admin-1";
const OTHER_ADMIN = "admin-2";

function msg(id: string, senderId: string, createdAt: string, readAt: string | null = null): ChatMessage {
  return { id, senderId, senderName: senderId, body: `body ${id}`, createdAt, readAt };
}

describe("mergeMessages", () => {
  it("adds new messages and returns them oldest first", () => {
    const merged = mergeMessages([msg("b", MEMBER, "2026-10-25T10:02:00.000Z")], [msg("a", ADMIN, "2026-10-25T10:01:00.000Z")]);
    expect(merged.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("de-duplicates by id, which is what makes the polling look-back safe", () => {
    const first = msg("a", MEMBER, "2026-10-25T10:01:00.000Z");
    const merged = mergeMessages([first], [first, first]);
    expect(merged).toHaveLength(1);
  });

  it("lets the incoming copy win, so a message becoming read is reflected", () => {
    const before = msg("a", MEMBER, "2026-10-25T10:01:00.000Z", null);
    const after = msg("a", MEMBER, "2026-10-25T10:01:00.000Z", "2026-10-25T10:05:00.000Z");
    expect(mergeMessages([before], [after])[0].readAt).toBe("2026-10-25T10:05:00.000Z");
  });

  it("orders messages with the same timestamp by id, so the order is stable", () => {
    const same = "2026-10-25T10:01:00.000Z";
    const merged = mergeMessages([msg("b", MEMBER, same)], [msg("a", ADMIN, same)]);
    expect(merged.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("does not mutate its inputs", () => {
    const existing = [msg("a", MEMBER, "2026-10-25T10:01:00.000Z")];
    const incoming = [msg("b", ADMIN, "2026-10-25T10:02:00.000Z")];
    const snapshot = JSON.stringify([existing, incoming]);
    const merged = mergeMessages(existing, incoming);
    expect(JSON.stringify([existing, incoming])).toBe(snapshot);
    expect(merged).not.toBe(existing);
  });
});

describe("newestCreatedAt", () => {
  it("is null for an empty thread", () => {
    expect(newestCreatedAt([])).toBeNull();
  });

  it("is the latest timestamp, whatever the order of the list", () => {
    const list = [msg("b", MEMBER, "2026-10-25T10:03:00.000Z"), msg("a", ADMIN, "2026-10-25T10:01:00.000Z")];
    expect(newestCreatedAt(list)).toBe("2026-10-25T10:03:00.000Z");
  });
});

describe("unreadUpTo: the newest unread message from the other side", () => {
  const thread = [
    msg("m1", MEMBER, "2026-10-25T10:01:00.000Z"),
    msg("a1", ADMIN, "2026-10-25T10:02:00.000Z"),
    msg("a2", OTHER_ADMIN, "2026-10-25T10:03:00.000Z"),
    msg("m2", MEMBER, "2026-10-25T10:04:00.000Z", "2026-10-25T10:05:00.000Z"),
  ];

  it("for the member, is the newest unread message sent by any admin", () => {
    expect(unreadUpTo(thread, MEMBER, MEMBER)).toBe("2026-10-25T10:03:00.000Z");
  });

  it("for an admin, looks only at the member's unread messages, not another admin's", () => {
    expect(unreadUpTo(thread, ADMIN, MEMBER)).toBe("2026-10-25T10:01:00.000Z");
  });

  it("is null when everything from the other side has been read", () => {
    const allRead = thread.map((m) => ({ ...m, readAt: "2026-10-25T11:00:00.000Z" }));
    expect(unreadUpTo(allRead, MEMBER, MEMBER)).toBeNull();
  });

  it("is null for an empty thread", () => {
    expect(unreadUpTo([], MEMBER, MEMBER)).toBeNull();
  });
});
