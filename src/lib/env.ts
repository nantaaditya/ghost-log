import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  EMAIL_PASSWORD: z.string().min(1),
  MICROSOFT_CLIENT_ID: z.string().min(1),
  MICROSOFT_CLIENT_SECRET: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  TOKEN_ENCRYPTION_KEY: z.string().min(32),
  ONEDRIVE_BASE_PATH: z.string().default("nanta-obsidian/work/report"),
  ADMIN_EMAIL: z.string().email(),
  GEMINI_API_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — check .env.local");
}

export const env = parsed.data;
