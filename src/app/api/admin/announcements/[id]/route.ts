import { auth } from "@/lib/auth/config";
import { findById, update, remove } from "@/lib/announcement/repository";
import { updateAnnouncementSchema } from "@/lib/announcement/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findById(id);
  if (!existing) {
    return Response.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateAnnouncementSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const dto = parsed.data;

  // Auto-set publishedAt when publishing for the first time
  const publishedAt =
    dto.status === "published" && !existing.publishedAt && !dto.publishedAt
      ? new Date()
      : dto.publishedAt
      ? new Date(dto.publishedAt)
      : undefined;

  const updated = await update(id, {
    ...dto,
    publishedAt,
    expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : dto.expiresAt === null ? null : undefined,
  });

  return Response.json({ success: true, data: updated });
}

export async function DELETE(_req: Request, { params }: Params): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findById(id);
  if (!existing) {
    return Response.json({ success: false, error: "Not found" }, { status: 404 });
  }

  await remove(id);
  return Response.json({ success: true });
}
