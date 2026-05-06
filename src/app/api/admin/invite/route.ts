import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users, inviteTokens } from "@/lib/db/schema";
import { sendInviteEmail } from "@/lib/email/send-invite";
import { env } from "@/lib/env";
import { eq } from "drizzle-orm";
import { generateToken, hashToken, INVITE_TOKEN_EXPIRES_MS } from "@/lib/auth/tokens";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const { email, name } = parsed.data;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return Response.json({ success: false, error: "User already exists" }, { status: 409 });
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRES_MS);

  const [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, env.ADMIN_EMAIL))
    .limit(1);

  if (!adminUser) {
    return Response.json({ success: false, error: "Admin user not found" }, { status: 500 });
  }

  await db.insert(users).values({ email, name, role: "member", status: "pending" });
  await db.insert(inviteTokens).values({
    email,
    tokenHash,
    expiresAt,
    createdBy: adminUser.id,
  });

  const inviteUrl = `${env.NEXTAUTH_URL}/invite/${token}`;
  await sendInviteEmail({ to: email, inviteUrl, inviterName: session.user.name ?? "Admin" });

  return Response.json({ success: true, data: { email } });
}
