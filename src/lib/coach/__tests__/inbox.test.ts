import { describe, it, expect } from "vitest";
import { buildInbox } from "../inbox";

const members = [
  { id: "m-ana", name: "Ana" },
  { id: "m-budi", name: "Budi" },
  { id: "m-cici", name: "cici" },
  { id: "m-dodi", name: "Dodi" },
];

const summary = (memberId: string, lastMessageAt: string, unreadCount: number) => ({
  memberId,
  memberName: memberId,
  lastMessageAt: new Date(lastMessageAt),
  unreadCount,
});

describe("buildInbox", () => {
  it("lists every member, including those who have not written yet", () => {
    const rows = buildInbox(members, []);
    expect(rows.map((r) => r.memberId)).toEqual(["m-ana", "m-budi", "m-cici", "m-dodi"]);
    expect(rows.every((r) => r.lastMessageAt === null && r.unreadCount === 0)).toBe(true);
  });

  it("puts members with unread messages first, most recent first", () => {
    const rows = buildInbox(members, [
      summary("m-ana", "2026-10-25T10:00:00Z", 0),
      summary("m-budi", "2026-10-25T09:00:00Z", 2),
      summary("m-cici", "2026-10-25T11:00:00Z", 1),
    ]);
    expect(rows.map((r) => r.memberId).slice(0, 2)).toEqual(["m-cici", "m-budi"]);
  });

  it("then orders read threads by recent activity, then members with no thread by name", () => {
    const rows = buildInbox(members, [
      summary("m-ana", "2026-10-25T08:00:00Z", 0),
      summary("m-dodi", "2026-10-25T12:00:00Z", 0),
    ]);
    expect(rows.map((r) => r.memberId)).toEqual(["m-dodi", "m-ana", "m-budi", "m-cici"]);
  });

  it("sorts names case-insensitively", () => {
    const rows = buildInbox([{ id: "1", name: "bimo" }, { id: "2", name: "Adi" }, { id: "3", name: "Cici" }], []);
    expect(rows.map((r) => r.name)).toEqual(["Adi", "bimo", "Cici"]);
  });

  it("serializes the last activity as an ISO string for the client", () => {
    const [row] = buildInbox([members[0]], [summary("m-ana", "2026-10-25T10:00:00Z", 1)]);
    expect(row.lastMessageAt).toBe("2026-10-25T10:00:00.000Z");
    expect(row.unreadCount).toBe(1);
  });

  it("ignores a thread whose member is not in the list (inactive or removed)", () => {
    const rows = buildInbox([members[0]], [summary("m-gone", "2026-10-25T10:00:00Z", 5)]);
    expect(rows.map((r) => r.memberId)).toEqual(["m-ana"]);
  });

  it("does not mutate its inputs", () => {
    const snapshot = JSON.stringify(members);
    buildInbox(members, [summary("m-ana", "2026-10-25T10:00:00Z", 1)]);
    expect(JSON.stringify(members)).toBe(snapshot);
  });
});
