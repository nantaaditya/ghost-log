import { db } from "@/lib/db/client";
import { kpiProfiles, type KpiProfile, type NewKpiProfile } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { profileUpdateSet } from "./import";

/** The columns a member may see. Deliberately excludes the manager's summary and decisions. */
export type MemberProfile = Pick<
  KpiProfile,
  "id" | "userId" | "cycleYear" | "scores" | "profile" | "answers" | "memberSummary" | "importedAt"
>;

/**
 * A member's own profile, selected by explicit column so the manager-only fields are never even
 * read from the database. Pair it with the viewer check in the caller; this is defence in depth.
 */
export async function findForMember(
  userId: string,
  cycleYear: number,
): Promise<MemberProfile | null> {
  const [row] = await db
    .select({
      id: kpiProfiles.id,
      userId: kpiProfiles.userId,
      cycleYear: kpiProfiles.cycleYear,
      scores: kpiProfiles.scores,
      profile: kpiProfiles.profile,
      answers: kpiProfiles.answers,
      memberSummary: kpiProfiles.memberSummary,
      importedAt: kpiProfiles.importedAt,
    })
    .from(kpiProfiles)
    .where(and(eq(kpiProfiles.userId, userId), eq(kpiProfiles.cycleYear, cycleYear)))
    .limit(1);

  return row ?? null;
}

export async function findByUser(userId: string, cycleYear: number): Promise<KpiProfile | null> {
  const [row] = await db
    .select()
    .from(kpiProfiles)
    .where(and(eq(kpiProfiles.userId, userId), eq(kpiProfiles.cycleYear, cycleYear)))
    .limit(1);

  return row ?? null;
}

/** Idempotent import: one profile per (user, cycle year); re-import replaces the previous one. */
export async function upsert(dto: NewKpiProfile): Promise<KpiProfile> {
  const [row] = await db
    .insert(kpiProfiles)
    .values(dto)
    .onConflictDoUpdate({
      target: [kpiProfiles.userId, kpiProfiles.cycleYear],
      set: profileUpdateSet(dto),
    })
    .returning();

  return row;
}
