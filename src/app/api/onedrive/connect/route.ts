import { auth } from "@/lib/auth/config";
import { buildAuthUrl } from "@/lib/graph/token";
import { env } from "@/lib/env";
import { randomBytes } from "crypto";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${env.NEXTAUTH_URL}/api/onedrive/callback`;
  const url = buildAuthUrl(redirectUri, state);

  return Response.redirect(url);
}
