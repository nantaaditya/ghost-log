import { db } from "@/lib/db/client";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { eq, and, isNull, gt } from "drizzle-orm";
import { hash } from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  token: z.string().length(64),
  password: z.string().min(8),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);
  const now = new Date();

  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!resetToken) {
    return Response.json({ success: false, error: "Invalid or expired reset link" }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, resetToken.userId), eq(users.status, "active")))
    .limit(1);

  if (!user) {
    return Response.json({ success: false, error: "Invalid or expired reset link" }, { status: 400 });
  }

  const passwordHash = await hash(password, 12);

  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, resetToken.id));

  return Response.json({ success: true });
}
