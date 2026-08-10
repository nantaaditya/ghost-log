import { auth } from "@/lib/auth/config";
import { findById, remove } from "@/lib/announcement-comment/repository";

type Params = { params: Promise<{ id: string; commentId: string }> };

export async function DELETE(_req: Request, { params }: Params): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id, commentId } = await params;
  const comment = await findById(commentId);
  if (!comment) {
    return Response.json({ success: false, error: "Comment not found" }, { status: 404 });
  }

  if (comment.announcementId !== id) {
    return Response.json(
      { success: false, error: "Comment does not belong to this announcement" },
      { status: 400 }
    );
  }

  const isAdmin = (session.user as { role: string }).role === "admin";
  if (comment.userId !== session.user.id && !isAdmin) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await remove(commentId);
  return Response.json({ success: true });
}
