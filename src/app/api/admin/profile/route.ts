import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const patchSchema = z
  .object({
    currentPassword: z.string().min(1),
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    newPassword: z.string().min(8).optional(),
  })
  .refine((d) => d.name || d.email || d.newPassword, {
    message: "At least one of name, email, or newPassword is required",
  });

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as { id: string }).id;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { currentPassword, name, email, newPassword } = parsed.data;

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  if (!admin || !admin.passwordHash) {
    return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 });
  }

  const valid = await compare(currentPassword, admin.passwordHash);
  if (!valid) {
    return NextResponse.json({ success: false, error: "Current password is incorrect" }, { status: 400 });
  }

  if (email && email !== admin.email) {
    const [conflict] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (conflict) {
      return NextResponse.json({ success: false, error: "Email already in use" }, { status: 400 });
    }
  }

  const updates: Partial<typeof admin> = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (newPassword) updates.passwordHash = await hash(newPassword, 12);

  await db.update(users).set(updates).where(eq(users.id, adminId));

  return NextResponse.json({
    success: true,
    requiresRelogin: !!email && email !== admin.email,
  });
}
