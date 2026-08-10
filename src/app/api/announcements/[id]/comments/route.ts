import { auth } from "@/lib/auth/config";
import { findById as findAnnouncementById } from "@/lib/announcement/repository";
import { isPublishedAndVisible } from "@/lib/announcement/visibility";
import { create, listByAnnouncement } from "@/lib/announcement-comment/repository";
import { createCommentSchema } from "@/lib/announcement-comment/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const announcement = await findAnnouncementById(id);
  const isAdmin = (session.user as { role: string }).role === "admin";
  if (!announcement || (!isAdmin && !isPublishedAndVisible(announcement, new Date()))) {
    return Response.json({ success: false, error: "Announcement not found" }, { status: 404 });
  }

  const comments = await listByAnnouncement(id);
  return Response.json({ success: true, data: comments });
}

export async function POST(req: Request, { params }: Params): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const announcement = await findAnnouncementById(id);
  const isAdmin = (session.user as { role: string }).role === "admin";
  if (!announcement || (!isAdmin && !isPublishedAndVisible(announcement, new Date()))) {
    return Response.json({ success: false, error: "Announcement not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const comment = await create({
    announcementId: id,
    userId: session.user.id,
    body: parsed.data.body,
  });

  return Response.json(
    { success: true, data: { ...comment, authorName: session.user.name ?? "User" } },
    { status: 201 }
  );
}
