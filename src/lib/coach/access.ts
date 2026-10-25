export interface Viewer {
  id: string;
  role: string;
}

export type MaybeViewer = Viewer | null | undefined;

export function isAdminViewer(viewer: MaybeViewer): boolean {
  return Boolean(viewer?.id) && viewer?.role === "admin";
}

/** A member may touch only their own data; an admin may touch any member's. */
export function canAccessMemberData(viewer: MaybeViewer, memberId: string): boolean {
  if (!viewer?.id || !memberId) return false;
  if (isAdminViewer(viewer)) return true;
  return viewer.role === "member" && viewer.id === memberId;
}

export type ThreadTarget =
  | { ok: true; memberId: string }
  | { ok: false; status: 400 | 401 | 403; error: string };

/**
 * Decides whose 1:1 thread a request is about. A member always gets their own thread
 * (asking for someone else's is forbidden); an admin must say which member.
 */
export function resolveThreadMemberId(
  viewer: MaybeViewer,
  requestedMemberId: string | undefined,
): ThreadTarget {
  if (!viewer?.id) return { ok: false, status: 401, error: "Unauthorized" };

  if (isAdminViewer(viewer)) {
    return requestedMemberId
      ? { ok: true, memberId: requestedMemberId }
      : { ok: false, status: 400, error: "memberId is required" };
  }

  if (viewer.role !== "member") return { ok: false, status: 403, error: "Forbidden" };
  if (requestedMemberId && requestedMemberId !== viewer.id) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, memberId: viewer.id };
}

/**
 * The only profile fields a member may see. An allowlist, not a denylist: a column added to the
 * profile later stays hidden from members until someone consciously lists it here.
 */
const MEMBER_VISIBLE_KEYS = [
  "id",
  "userId",
  "cycleYear",
  "scores",
  "profile",
  "answers",
  "memberSummary",
  "importedAt",
] as const;

type MemberVisibleKey = (typeof MEMBER_VISIBLE_KEYS)[number];

/** Returns a copy holding only the member-visible fields. */
export function toMemberProfileView<T extends Record<string, unknown>>(
  profile: T,
): Pick<T, Extract<keyof T, MemberVisibleKey>> {
  const visible = MEMBER_VISIBLE_KEYS.filter((key) => key in profile).map((key) => [key, profile[key]]);
  return Object.fromEntries(visible) as Pick<T, Extract<keyof T, MemberVisibleKey>>;
}

/** Admins see every goal (including drafts); a member sees only their own shared goals. */
export function visibleGoalsFor<T extends { userId: string; status: "draft" | "shared" }>(
  viewer: MaybeViewer,
  goals: readonly T[],
): T[] {
  if (isAdminViewer(viewer)) return [...goals];
  if (!viewer?.id) return [];
  return goals.filter((goal) => goal.status === "shared" && canAccessMemberData(viewer, goal.userId));
}
