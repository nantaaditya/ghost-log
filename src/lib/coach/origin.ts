/**
 * CSRF defence in depth for cookie-authenticated POSTs: browsers always attach `Origin` to
 * cross-site requests, so a mismatch (or the opaque "null" origin) is rejected. A missing header
 * means a non-browser client, which cannot ride a victim's cookies.
 */
export function isTrustedOrigin(origin: string | null, appUrl: string): boolean {
  if (origin === null) return true;
  try {
    return new URL(origin).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}
