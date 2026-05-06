import { db } from "@/lib/db/client";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";
import { generateToken, hashToken, RESET_TOKEN_EXPIRES_MS } from "@/lib/auth/tokens";
import { env } from "@/lib/env";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const { email } = parsed.data;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (user && user.status === "active") {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);

    await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

    const resetUrl = `${env.NEXTAUTH_URL}/reset-password/${token}`;
    await sendPasswordResetEmail({ to: email, resetUrl, userName: user.name });
  }

  // Always return success — no email enumeration
  return Response.json({ success: true });
}
