import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import { getCurrentWeekId, getRecentPastWeekIds } from "@/lib/week/iso-week";
import { buildHealthTrend, type WeekHealthTrend } from "@/lib/db/health-trend";

import type { HealthIndicator } from "@/types/report";

type UpsertSubmittedReportInput = {
  userId: string;
  weekId: string;
  onedrivePath: string;
  healthIndicator: HealthIndicator;
  escalationCount: number;
  incidentCount: number;
};

export async function upsertSubmittedReport({
  userId,
  weekId,
  onedrivePath,
  healthIndicator,
  escalationCount,
  incidentCount,
}: UpsertSubmittedReportInput): Promise<void> {
  const now = new Date();
  await db
    .insert(reports)
    .values({
      userId,
      weekId,
      onedrivePath,
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
      healthIndicator,
      escalationCount,
      incidentCount,
    })
    .onConflictDoUpdate({
      target: [reports.userId, reports.weekId],
      set: { status: "submitted", submittedAt: now, updatedAt: now, healthIndicator, escalationCount, incidentCount },
    });
}

export type { WeekHealthTrend };

/** Returns per-week health mix + submission counts for the last `weeks` weeks (oldest first), current week included. */
export async function getHealthTrend(weeks: number): Promise<WeekHealthTrend[]> {
  const currentWeekId = getCurrentWeekId();
  const weekIds = [...getRecentPastWeekIds(weeks - 1)].reverse().concat(currentWeekId);

  const [activeMembers, grouped] = await Promise.all([
    db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "member"), eq(users.status, "active"))),
    db
      .select({
        weekId: reports.weekId,
        healthIndicator: reports.healthIndicator,
        count: sql<number>`count(*)::int`,
      })
      .from(reports)
      .where(and(eq(reports.status, "submitted"), inArray(reports.weekId, weekIds)))
      .groupBy(reports.weekId, reports.healthIndicator),
  ]);

  return buildHealthTrend(weekIds, grouped, activeMembers.length);
}
