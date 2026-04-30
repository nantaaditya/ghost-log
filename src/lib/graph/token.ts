import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { onedriveCredentials } from "@/lib/db/schema";
import { encrypt, decrypt } from "./encrypt";
import { env } from "@/lib/env";

const TOKEN_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const SCOPES = "Files.ReadWrite offline_access User.Read";

export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });
  return `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<void> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      scope: SCOPES,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await saveCredentials(data.access_token, data.refresh_token, data.expires_in);
}

async function saveCredentials(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  await db
    .insert(onedriveCredentials)
    .values({
      id: "singleton",
      accessToken: encrypt(accessToken),
      refreshToken: encrypt(refreshToken),
      expiresAt,
    })
    .onConflictDoUpdate({
      target: onedriveCredentials.id,
      set: {
        accessToken: encrypt(accessToken),
        refreshToken: encrypt(refreshToken),
        expiresAt,
        updatedAt: new Date(),
      },
    });
}

export async function getValidAccessToken(): Promise<string> {
  const [creds] = await db
    .select()
    .from(onedriveCredentials)
    .where(eq(onedriveCredentials.id, "singleton"))
    .limit(1);

  if (!creds) throw new Error("OneDrive not connected — admin must authorize");

  // Refresh 5 minutes before expiry
  if (creds.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    return refreshAccessToken(decrypt(creds.refreshToken));
  }

  return decrypt(creds.accessToken);
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: SCOPES,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await saveCredentials(data.access_token, data.refresh_token, data.expires_in);
  return data.access_token;
}
