import type { HealthIndicator } from "@/types/report";

export type WeekHealthTrend = {
  weekId: string;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  unknown: number;
  submitted: number;
  total: number;
};

export type HealthCountRow = {
  weekId: string;
  healthIndicator: HealthIndicator | null;
  count: number;
};

/** Pure aggregation, kept free of any DB import so it can be unit tested without a database connection. */
export function buildHealthTrend(weekIds: string[], rows: HealthCountRow[], total: number): WeekHealthTrend[] {
  return weekIds.map((weekId) => {
    const weekRows = rows.filter((r) => r.weekId === weekId);
    const countFor = (indicator: HealthIndicator | null) =>
      weekRows.find((r) => r.healthIndicator === indicator)?.count ?? 0;
    const onTrack = countFor("on-track");
    const atRisk = countFor("at-risk");
    const offTrack = countFor("off-track");
    const unknown = countFor(null);
    return { weekId, onTrack, atRisk, offTrack, unknown, submitted: onTrack + atRisk + offTrack + unknown, total };
  });
}
