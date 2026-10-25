import { db } from "@/lib/db/client";
import { coachMessages, users, type CoachMessage, type NewCoachMessage } from "@/lib/db/schema";
import { and, desc, eq, gte, isNull, lte, ne, sql } from "drizzle-orm";
import { THREAD_PAGE_LIMIT } from "./constants";

export type MessageWithSender = {
  id: string;
  memberId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
};

export type ThreadSummary = {
  memberId: string;
  memberName: string;
  lastMessageAt: Date;
  unreadCount: number;
};

/**
 * "Unread" is always relative to the thread's counterpart: a member has unread whatever any admin
 * sent them; an admin has unread whatever the member sent. One admin reading must never mark
 * another admin's outgoing messages as read by the member.
 */
function sentToReader(memberId: string, readerId: string) {
  return readerId === memberId
    ? ne(coachMessages.senderId, memberId)
    : eq(coachMessages.senderId, memberId);
}

/**
 * The latest `limit` messages of one member's thread, oldest first. Pass `after` to fetch only
 * messages at or after it (polling). The comparison is inclusive because two messages can share a
 * millisecond; callers de-duplicate by id.
 */
export async function listThread(
  memberId: string,
  after?: Date,
  limit: number = THREAD_PAGE_LIMIT,
): Promise<MessageWithSender[]> {
  const inThread = eq(coachMessages.memberId, memberId);
  const rows = await db
    .select({
      id: coachMessages.id,
      memberId: coachMessages.memberId,
      senderId: coachMessages.senderId,
      senderName: users.name,
      body: coachMessages.body,
      createdAt: coachMessages.createdAt,
      readAt: coachMessages.readAt,
    })
    .from(coachMessages)
    .innerJoin(users, eq(coachMessages.senderId, users.id))
    .where(after ? and(inThread, gte(coachMessages.createdAt, after)) : inThread)
    .orderBy(desc(coachMessages.createdAt), desc(coachMessages.id))
    .limit(limit);

  return rows.reverse();
}

export async function create(dto: NewCoachMessage): Promise<CoachMessage> {
  // Stamp in JS so the stored time has millisecond precision, matching what a polling client
  // sees (the column default keeps microseconds a JS Date cannot represent) and so it never
  // depends on the database session's time zone. `??` also covers an explicit `undefined`.
  const [row] = await db
    .insert(coachMessages)
    .values({ ...dto, createdAt: dto.createdAt ?? new Date() })
    .returning();
  return row;
}

/**
 * Marks the counterpart's unread messages in this thread as read. Pass `upTo` (the newest message
 * the reader has actually seen) so a message that arrived mid-request is not marked read unseen.
 */
export async function markThreadRead(
  memberId: string,
  readerId: string,
  upTo?: Date,
): Promise<void> {
  await db
    .update(coachMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(coachMessages.memberId, memberId),
        sentToReader(memberId, readerId),
        isNull(coachMessages.readAt),
        upTo ? lte(coachMessages.createdAt, upTo) : undefined,
      ),
    );
}

/** Number of messages in this thread the reader has not read yet. */
export async function countUnread(memberId: string, readerId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(coachMessages)
    .where(
      and(
        eq(coachMessages.memberId, memberId),
        sentToReader(memberId, readerId),
        isNull(coachMessages.readAt),
      ),
    );
  return row?.count ?? 0;
}

/** Admin inbox: one row per member thread, most recent first, with unread messages from the member. */
export async function listThreadSummaries(): Promise<ThreadSummary[]> {
  const lastMessageAt = sql<Date>`max(${coachMessages.createdAt})`;
  return db
    .select({
      memberId: coachMessages.memberId,
      memberName: users.name,
      lastMessageAt: lastMessageAt.mapWith(coachMessages.createdAt),
      unreadCount: sql<number>`count(*) filter (where ${coachMessages.readAt} is null and ${coachMessages.senderId} = ${coachMessages.memberId})::int`,
    })
    .from(coachMessages)
    .innerJoin(users, eq(coachMessages.memberId, users.id))
    .groupBy(coachMessages.memberId, users.name)
    .orderBy(desc(lastMessageAt));
}

/** How many messages this user sent at or after `since` (rate limiting). */
export async function countSentSince(senderId: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(coachMessages)
    .where(and(eq(coachMessages.senderId, senderId), gte(coachMessages.createdAt, since)));
  return row?.count ?? 0;
}

/** Records that a "new message" email was actually sent for this message. */
export async function markNotified(messageId: string, at: Date = new Date()): Promise<void> {
  await db.update(coachMessages).set({ notifiedAt: at }).where(eq(coachMessages.id, messageId));
}

/**
 * True if this sender already triggered an email in this thread at or after `since`.
 * Keyed on emails actually sent, so a failed send or a skipped message never suppresses later ones.
 */
export async function hasRecentNotification(params: {
  memberId: string;
  senderId: string;
  since: Date;
}): Promise<boolean> {
  const { memberId, senderId, since } = params;
  const [row] = await db
    .select({ id: coachMessages.id })
    .from(coachMessages)
    .where(
      and(
        eq(coachMessages.memberId, memberId),
        eq(coachMessages.senderId, senderId),
        gte(coachMessages.notifiedAt, since),
      ),
    )
    .limit(1);
  return Boolean(row);
}
