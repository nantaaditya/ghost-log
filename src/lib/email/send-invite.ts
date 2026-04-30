import nodemailer from "nodemailer";
import { env } from "@/lib/env";

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 587,
  secure: false,
  auth: {
    user: env.EMAIL_FROM,
    pass: env.EMAIL_PASSWORD,
  },
});

export async function sendInviteEmail(params: {
  to: string;
  inviteUrl: string;
  inviterName: string;
}): Promise<void> {
  const { to, inviteUrl, inviterName } = params;

  await transporter.sendMail({
    from: `Alamak Team <${env.EMAIL_FROM}>`,
    to,
    subject: "You've been invited to Alamak Team Ghost Logs",
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
