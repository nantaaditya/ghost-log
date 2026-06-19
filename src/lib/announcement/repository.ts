import { db } from "@/lib/db/client";
import { announcements, type Announcement, type NewAnnouncement } from "@/lib/db/schema";
import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";

export async function listPublished(now: Date): Promise<Announcement[]> {
  return db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.status, "published"),
        lte(announcements.publishedAt, now),
        or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now))
      )
    )
    .orderBy(desc(announcements.publishedAt));
}

export async function listAll(): Promise<Announcement[]> {
  return db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt));
}

export async function findById(id: string): Promise<Announcement | null> {
  const [row] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);

  return row ?? null;
}

export async function create(dto: NewAnnouncement): Promise<Announcement> {
  const [row] = await db.insert(announcements).values(dto).returning();
  return row;
}

export async function update(
  id: string,
  dto: Partial<NewAnnouncement>
): Promise<Announcement | null> {
  const [row] = await db
    .update(announcements)
    .set({ ...dto, updatedAt: new Date() })
    .where(eq(announcements.id, id))
    .returning();

  return row ?? null;
}

export async function remove(id: string): Promise<void> {
  await db.delete(announcements).where(eq(announcements.id, id));
}
