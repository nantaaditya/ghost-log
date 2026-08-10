import { db } from "@/lib/db/client";
import {
  announcementComments,
  users,
  type AnnouncementComment,
  type NewAnnouncementComment,
} from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

export type CommentWithAuthor = {
  id: string;
  body: string;
  createdAt: Date;
  userId: string;
  authorName: string;
};

export async function listByAnnouncement(announcementId: string): Promise<CommentWithAuthor[]> {
  return db
    .select({
      id: announcementComments.id,
      body: announcementComments.body,
      createdAt: announcementComments.createdAt,
      userId: announcementComments.userId,
      authorName: users.name,
    })
    .from(announcementComments)
    .innerJoin(users, eq(announcementComments.userId, users.id))
    .where(eq(announcementComments.announcementId, announcementId))
    .orderBy(asc(announcementComments.createdAt));
}

export async function create(dto: NewAnnouncementComment): Promise<AnnouncementComment> {
  const [row] = await db.insert(announcementComments).values(dto).returning();
  return row;
}

export async function findById(id: string): Promise<AnnouncementComment | null> {
  const [row] = await db
    .select()
    .from(announcementComments)
    .where(eq(announcementComments.id, id))
    .limit(1);

  return row ?? null;
}

export async function remove(id: string): Promise<void> {
  await db.delete(announcementComments).where(eq(announcementComments.id, id));
}
