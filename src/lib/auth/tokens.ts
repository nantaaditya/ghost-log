import { randomBytes, createHash } from "crypto";

export const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour
export const INVITE_TOKEN_EXPIRES_MS = 48 * 60 * 60 * 1000; // 48 hours

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
