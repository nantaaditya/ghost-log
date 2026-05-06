import nodemailer from "nodemailer";
import { env } from "@/lib/env";

export const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 587,
  secure: false,
  auth: {
    user: env.EMAIL_FROM,
    pass: env.EMAIL_PASSWORD,
  },
});
