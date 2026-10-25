import { after } from "next/server";
import { env } from "@/lib/env";
import { isAdminViewer, resolveThreadMemberId } from "@/lib/coach/access";
import {
  CURSOR_LOOKBACK_MS,
  MESSAGE_RATE_LIMIT,
  MESSAGE_RATE_WINDOW_MS,
} from "@/lib/coach/constants";
import { fail } from "@/lib/coach/http";
import { findMemberById } from "@/lib/coach/member-repository";
import { countSentSince, create, listThread } from "@/lib/coach/message-repository";
import { notifyNewMessage } from "@/lib/coach/notify";
import { isTrustedOrigin } from "@/lib/coach/origin";
import { createMessageSchema, listMessagesQuerySchema } from "@/lib/coach/validation";
import { getActiveViewer } from "@/lib/coach/viewer";

export async function GET(req: Request): Promise<Response> {
  const viewer = await getActiveViewer();
  if (!viewer) return fail(401, "Unauthorized");

  const { searchParams } = new URL(req.url);
  const query = listMessagesQuerySchema.safeParse({
    memberId: searchParams.get("memberId") ?? undefined,
    after: searchParams.get("after") ?? undefined,
  });
  if (!query.success) return fail(400, "Invalid query");

  const target = resolveThreadMemberId(viewer, query.data.memberId);
  if (!target.ok) return fail(target.status, target.error);

  // Back the cursor up so a message committed out of order is still picked up; clients de-dupe by id.
  const after = query.data.after
    ? new Date(query.data.after.getTime() - CURSOR_LOOKBACK_MS)
    : undefined;
  const messages = await listThread(target.memberId, after);
  return Response.json({ success: true, data: messages });
}

export async function POST(req: Request): Promise<Response> {
  if (!isTrustedOrigin(req.headers.get("origin"), env.NEXTAUTH_URL)) return fail(403, "Forbidden");

  const viewer = await getActiveViewer();
  if (!viewer) return fail(401, "Unauthorized");

  const json: unknown = await req.json().catch(() => null);
  const parsed = createMessageSchema.safeParse(json);
  if (!parsed.success) return fail(400, "Invalid input");

  const target = resolveThreadMemberId(viewer, parsed.data.memberId);
  if (!target.ok) return fail(target.status, target.error);

  // An admin names the member; make sure that is a real, active member before writing to it.
  if (isAdminViewer(viewer) && !(await findMemberById(target.memberId))) {
    return fail(404, "Member not found");
  }

  const recentlySent = await countSentSince(
    viewer.id,
    new Date(Date.now() - MESSAGE_RATE_WINDOW_MS),
  );
  if (recentlySent >= MESSAGE_RATE_LIMIT) return fail(429, "Too many messages. Please wait a moment.");

  const message = await create({
    memberId: target.memberId,
    senderId: viewer.id,
    body: parsed.data.body,
  });

  const senderName = viewer.name;
  after(() =>
    notifyNewMessage({
      memberId: target.memberId,
      messageId: message.id,
      sender: { id: viewer.id, name: senderName, role: viewer.role },
    }),
  );

  return Response.json({ success: true, data: { ...message, senderName } }, { status: 201 });
}
