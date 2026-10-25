/** A chat message as the browser holds it: dates are ISO strings, as they arrive over JSON. */
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

/** Maps a database message (with Date fields) to the browser's shape. */
export function toChatMessage(message: {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
}): ChatMessage {
  return {
    id: message.id,
    senderId: message.senderId,
    senderName: message.senderName,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt ? message.readAt.toISOString() : null,
  };
}

function compareMessages(a: ChatMessage, b: ChatMessage): number {
  // ISO-8601 UTC strings of equal length sort the same as the instants they name.
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Folds freshly fetched messages into the thread. De-duplicates by id (polling deliberately
 * re-fetches a short look-back window), lets the newer copy win so read receipts update, and
 * returns a new list ordered oldest first.
 */
export function mergeMessages(
  existing: readonly ChatMessage[],
  incoming: readonly ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of existing) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(compareMessages);
}

export function newestCreatedAt(messages: readonly ChatMessage[]): string | null {
  return messages.reduce<string | null>(
    (newest, message) => (newest === null || message.createdAt > newest ? message.createdAt : newest),
    null,
  );
}

/**
 * Timestamp of the newest message the viewer has not read yet, or null. Unread is relative to the
 * thread's counterpart: the member reads what admins sent; an admin reads what the member sent.
 */
export function unreadUpTo(
  messages: readonly ChatMessage[],
  viewerId: string,
  memberId: string,
): string | null {
  const fromOtherSide = (message: ChatMessage) =>
    viewerId === memberId ? message.senderId !== memberId : message.senderId === memberId;
  return newestCreatedAt(messages.filter((m) => fromOtherSide(m) && m.readAt === null));
}
