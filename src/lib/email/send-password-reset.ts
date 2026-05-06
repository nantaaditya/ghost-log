import { transporter } from "./transporter";
import { env } from "@/lib/env";

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
  userName: string;
}): Promise<void> {
  const { to, resetUrl, userName } = params;

  await transporter.sendMail({
    from: `Alamak Team <${env.EMAIL_FROM}>`,
    to,
    subject: "Reset your Alamak Team password",
    html: `
      <p>Hi ${userName},</p>
      <p>We received a request to reset your password for <strong>Alamak Team</strong>.</p>
      <p>Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour.</p>
      <p style="color:#888;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
