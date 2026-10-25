import { env } from "@/lib/env";
import { isAdminViewer } from "./access";
import { fail } from "./http";
import { isTrustedOrigin } from "./origin";
import { getActiveViewer, type ActiveViewer } from "./viewer";

export type AdminWriteGuard = { viewer: ActiveViewer } | { response: Response };

/**
 * Gate for state-changing admin endpoints: same-origin only, then a signed-in active user whose
 * current role in the database is admin. Returns the viewer, or the response to send back.
 */
export async function guardAdminWrite(req: Request): Promise<AdminWriteGuard> {
  if (!isTrustedOrigin(req.headers.get("origin"), env.NEXTAUTH_URL)) {
    return { response: fail(403, "Forbidden") };
  }
  const viewer = await getActiveViewer();
  if (!viewer) return { response: fail(401, "Unauthorized") };
  if (!isAdminViewer(viewer)) return { response: fail(403, "Forbidden") };
  return { viewer };
}
