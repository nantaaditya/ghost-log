import { env } from "@/lib/env";
import { resolveThreadMemberId } from "@/lib/coach/access";
import { fail } from "@/lib/coach/http";
import { markThreadRead } from "@/lib/coach/message-repository";
import { isTrustedOrigin } from "@/lib/coach/origin";
import { threadTargetSchema } from "@/lib/coach/validation";
import { getActiveViewer } from "@/lib/coach/viewer";

export async function POST(req: Request): Promise<Response> {
  if (!isTrustedOrigin(req.headers.get("origin"), env.NEXTAUTH_URL)) return fail(403, "Forbidden");

  const viewer = await getActiveViewer();
  if (!viewer) return fail(401, "Unauthorized");

  // The body is optional: a member marks their own thread, so they send nothing.
  const json: unknown = await req.json().catch(() => ({}));
  const parsed = threadTargetSchema.safeParse(json);
  if (!parsed.success) return fail(400, "Invalid input");

  const target = resolveThreadMemberId(viewer, parsed.data.memberId);
  if (!target.ok) return fail(target.status, target.error);

  await markThreadRead(target.memberId, viewer.id, parsed.data.upTo);
  return Response.json({ success: true });
}
