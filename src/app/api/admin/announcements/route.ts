import { auth } from "@/lib/auth/config";
import { create, listAll } from "@/lib/announcement/repository";
import { createAnnouncementSchema } from "@/lib/announcement/validation";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const data = await listAll();
  return Response.json({ success: true, data });
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createAnnouncementSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { title, body: mdBody, imageData, imageAlt, publishedAt, expiresAt } = parsed.data;
  const authorId = (session.user as { id: string }).id;

  const announcement = await create({
    title,
    body: mdBody,
    imageData: imageData ?? null,
    imageAlt: imageAlt ?? null,
    authorId,
    publishedAt: publishedAt ? new Date(publishedAt) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });

  return Response.json({ success: true, data: announcement }, { status: 201 });
}
