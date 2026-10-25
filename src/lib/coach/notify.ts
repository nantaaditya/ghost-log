import { env } from "@/lib/env";
import { sendCoachNotificationEmail } from "@/lib/email/send-coach-notification";
import { NOTIFY_THROTTLE_MS } from "./constants";
import { findMemberById, listActiveAdmins, type Contact } from "./member-repository";
import { hasRecentNotification, markNotified } from "./message-repository";

export interface NotifyParams {
  memberId: string;
  messageId: string;
  sender: { id: string; name: string; role: string };
  now?: Date;
}

async function recipientsFor(params: NotifyParams): Promise<Contact[]> {
  if (params.sender.role === "admin") {
    const member = await findMemberById(params.memberId);
    return member ? [member] : [];
  }
  return listActiveAdmins();
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

/**
 * Emails the other party about a new message, at most once per throttle window per sender and
 * thread. The window is measured from emails actually sent (`notifiedAt`), so a failed send or a
 * skipped message never suppresses later ones. Never throws: a failed email must not fail the chat.
 */
export async function notifyNewMessage(params: NotifyParams): Promise<void> {
  try {
    const { memberId, messageId, sender, now = new Date() } = params;

    const alreadyNotified = await hasRecentNotification({
      memberId,
      senderId: sender.id,
      since: new Date(now.getTime() - NOTIFY_THROTTLE_MS),
    });
    if (alreadyNotified) return;

    const recipients = await recipientsFor(params);
    const url = `${env.NEXTAUTH_URL}/coach`;

    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        sendCoachNotificationEmail({
          to: recipient.email,
          recipientName: recipient.name,
          senderName: sender.name,
          url,
        }),
      ),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[coach] notification email failed:", describeError(result.reason));
      }
    }

    if (results.some((result) => result.status === "fulfilled")) {
      await markNotified(messageId, now);
    }
  } catch (error) {
    console.error("[coach] notification failed:", describeError(error));
  }
}
