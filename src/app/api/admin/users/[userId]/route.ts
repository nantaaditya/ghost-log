import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

type Params = { params: Promise<{ userId: string }> };

export async function PATCH(req: Request, { params }: Params): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  await db.update(users).set({ status: parsed.data.status }).where(eq(users.id, userId));

  return Response.json({ success: true });
}
