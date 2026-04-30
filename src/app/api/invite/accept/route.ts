import { db } from "@/lib/db/client";
import { inviteTokens, users } from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { z } from "zod";

const acceptSchema = z.object({
  token: z.string().length(64),
  password: z.string().min(8),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();

  const [invite] = await db
    .select()
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.tokenHash, tokenHash),
        isNull(inviteTokens.usedAt),
        gt(inviteTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!invite) {
    return Response.json(
      { success: false, error: "Invalid or expired invite link" },
      { status: 400 }
    );
  }

  const passwordHash = await hash(password, 12);

  await db
    .update(users)
    .set({ passwordHash, status: "active" })
    .where(eq(users.email, invite.email));

  await db
    .update(inviteTokens)
    .set({ usedAt: now })
    .where(eq(inviteTokens.id, invite.id));

  return Response.json({ success: true });
}
