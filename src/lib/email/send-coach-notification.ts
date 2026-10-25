import { transporter } from "./transporter";
import { env } from "@/lib/env";

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Tells the recipient a message is waiting. Deliberately carries no message content. */
export async function sendCoachNotificationEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  url: string;
}): Promise<void> {
  const { to, recipientName, senderName, url } = params;

  await transporter.sendMail({
    from: `Alamak Team <${env.EMAIL_FROM}>`,
    to,
    subject: "You have a new message on Alamak Team",
    html: `
      <p>Hi ${escapeHtml(recipientName)},</p>
      <p><strong>${escapeHtml(senderName)}</strong> sent you a message in <strong>Alamak Team</strong>.</p>
      <p><a href="${escapeHtml(url)}">Open your 1:1</a></p>
      <p style="color:#888;font-size:12px;">For privacy, messages are never included in email.</p>
    `,
  });
}
