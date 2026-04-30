import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendInviteEmail(params: {
  to: string;
  inviteUrl: string;
  inviterName: string;
}): Promise<void> {
  const { to, inviteUrl, inviterName } = params;

  await resend.emails.send({
    from: "Alamak Team <onboarding@resend.dev>",
    to,
    subject: "You've been invited to Alamak Team",
    html: `
      <p>Hi,</p>
      <p>${inviterName} has invited you to join <strong>Alamak Team</strong> — the weekly report platform.</p>
      <p>Click the link below to set up your account:</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>This link expires in 48 hours.</p>
      <p style="color:#888;font-size:12px;">If you didn't expect this, you can ignore this email.</p>
    `,
  });
}
