import { auth } from "@/lib/auth/config";
import type { Viewer } from "./access";
import { findUserAccess } from "./member-repository";

export type ActiveViewer = Viewer & { name: string };

/**
 * The signed-in user as the database sees them right now. The session token's role is only a
 * hint: it is minted at sign-in and never refreshed, so a deactivated or demoted user would
 * otherwise keep their old access until it expires. Returns null unless the account is active.
 */
export async function getActiveViewer(): Promise<ActiveViewer | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await findUserAccess(id);
  if (!user || user.status !== "active") return null;

  return { id: user.id, role: user.role, name: user.name };
}
