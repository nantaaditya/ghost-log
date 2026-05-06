import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";
import { generateToken, hashToken, RESET_TOKEN_EXPIRES_MS } from "@/lib/auth/tokens";
import { env } from "@/lib/env";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    return Response.json({ success: false, error: "User not found" }, { status: 404 });
  }
  if (user.status !== "active") {
    return Response.json({ success: false, error: "User is not active" }, { status: 409 });
  }
  if (user.role === "admin") {
    return Response.json({ success: false, error: "Cannot reset admin password via this endpoint" }, { status: 409 });
  }

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);

  await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

  const resetUrl = `${env.NEXTAUTH_URL}/reset-password/${token}`;
  await sendPasswordResetEmail({ to: user.email, resetUrl, userName: user.name });

  return Response.json({ success: true });
}
