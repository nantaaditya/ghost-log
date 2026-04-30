import { auth } from "@/lib/auth/config";
import { exchangeCodeForTokens } from "@/lib/graph/token";
import { env } from "@/lib/env";

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return Response.redirect(new URL("/admin?onedrive=error", env.NEXTAUTH_URL));
  }

  try {
    const redirectUri = `${env.NEXTAUTH_URL}/api/onedrive/callback`;
    await exchangeCodeForTokens(code, redirectUri);
    return Response.redirect(new URL("/admin?onedrive=connected", env.NEXTAUTH_URL));
  } catch {
    return Response.redirect(new URL("/admin?onedrive=error", env.NEXTAUTH_URL));
  }
}
