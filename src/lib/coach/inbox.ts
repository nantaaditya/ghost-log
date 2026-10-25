import type { ThreadSummary } from "./message-repository";

export interface InboxMember {
  id: string;
  name: string;
}

export interface InboxRow {
  memberId: string;
  name: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

// 0 = has unread, 1 = has a thread, 2 = nothing yet.
function group(row: InboxRow): number {
  if (row.unreadCount > 0) return 0;
  return row.lastMessageAt === null ? 2 : 1;
}

function compareRows(a: InboxRow, b: InboxRow): number {
  const byGroup = group(a) - group(b);
  if (byGroup !== 0) return byGroup;
  if (a.lastMessageAt !== b.lastMessageAt && a.lastMessageAt !== null && b.lastMessageAt !== null) {
    return a.lastMessageAt < b.lastMessageAt ? 1 : -1;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

/**
 * The admin's member list: everyone appears (even with no messages yet), with unread conversations
 * first, then recent ones, then people who haven't written, alphabetically.
 */
export function buildInbox(
  members: readonly InboxMember[],
  summaries: readonly ThreadSummary[],
): InboxRow[] {
  const summaryByMember = new Map(summaries.map((summary) => [summary.memberId, summary]));
  return members
    .map((member): InboxRow => {
      const summary = summaryByMember.get(member.id);
      return {
        memberId: member.id,
        name: member.name,
        lastMessageAt: summary ? summary.lastMessageAt.toISOString() : null,
        unreadCount: summary?.unreadCount ?? 0,
      };
    })
    .sort(compareRows);
}
