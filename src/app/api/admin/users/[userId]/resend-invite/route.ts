import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users, inviteTokens } from "@/lib/db/schema";
import { sendInviteEmail } from "@/lib/email/send-invite";
import { generateToken, hashToken, INVITE_TOKEN_EXPIRES_MS } from "@/lib/auth/tokens";
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
  if (user.status !== "pending") {
    return Response.json({ success: false, error: "User is not pending" }, { status: 409 });
  }

  await db
    .update(inviteTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(inviteTokens.email, user.email), isNull(inviteTokens.usedAt)));

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRES_MS);

  await db.insert(inviteTokens).values({
    email: user.email,
    tokenHash,
    expiresAt,
    createdBy: session.user.id as string,
  });

  const inviteUrl = `${env.NEXTAUTH_URL}/invite/${token}`;
  await sendInviteEmail({ to: user.email, inviteUrl, inviterName: session.user.name ?? "Admin" });

  return Response.json({ success: true });
}
