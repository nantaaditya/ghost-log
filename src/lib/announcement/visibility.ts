import type { Announcement } from "@/lib/db/schema";

/** Mirrors listPublished's predicate, for checking an already-fetched announcement. */
export function isPublishedAndVisible(announcement: Announcement, now: Date): boolean {
  return (
    announcement.status === "published" &&
    announcement.publishedAt !== null &&
    announcement.publishedAt <= now &&
    (announcement.expiresAt === null || announcement.expiresAt > now)
  );
}
