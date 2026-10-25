/** Max messages one user may send within MESSAGE_RATE_WINDOW_MS. */
export const MESSAGE_RATE_LIMIT = 20;
export const MESSAGE_RATE_WINDOW_MS = 60_000;

/** At most one "new message" email per sender and thread within this window (counted from emails actually sent). */
export const NOTIFY_THROTTLE_MS = 15 * 60_000;

/**
 * Polling asks for messages at or after the newest one it has seen, minus this look-back.
 * `createdAt` is stamped before commit, so a slower request can land with an older timestamp
 * than one already delivered; the look-back re-fetches that window and the client de-duplicates by id.
 */
export const CURSOR_LOOKBACK_MS = 10_000;

/** Most messages returned for one thread in a single fetch (the latest ones). */
export const THREAD_PAGE_LIMIT = 200;
