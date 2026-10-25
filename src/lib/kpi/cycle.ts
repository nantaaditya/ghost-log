import { MAX_CYCLE_YEAR, MIN_CYCLE_YEAR } from "./validation";

/** The year of the self-reflection survey whose results members see. */
export const SURVEY_CYCLE_YEAR = 2026;

/** The year the KPI plan is being prepared for. Bump both constants when the next cycle starts. */
export const PLAN_CYCLE_YEAR = SURVEY_CYCLE_YEAR + 1;

/**
 * Warnings for an export whose years the /coach page would not display. The import still works,
 * but the results or goals it stores would be invisible, so the person running it must be told.
 */
export function describeYearMismatch(years: { cycleYear: number; goalsCycleYear?: number }): string[] {
  const goalsYear = years.goalsCycleYear ?? years.cycleYear + 1;
  const warnings: string[] = [];

  if (years.cycleYear !== SURVEY_CYCLE_YEAR) {
    warnings.push(
      `The export is for survey year ${years.cycleYear}, but /coach shows survey year ${SURVEY_CYCLE_YEAR}. ` +
        `These results will not appear until SURVEY_CYCLE_YEAR in src/lib/kpi/cycle.ts is changed.`,
    );
  }
  if (goalsYear !== PLAN_CYCLE_YEAR) {
    warnings.push(
      `Goals would be stored for ${goalsYear}, but /coach shows the ${PLAN_CYCLE_YEAR} plan. ` +
        `They will not appear until PLAN_CYCLE_YEAR in src/lib/kpi/cycle.ts is changed.`,
    );
  }
  return warnings;
}

/** A whole year within the supported range, or null. `raw` null means "not given": use the fallback. */
export function parsePlanningYear(raw: string | null, fallback: number): number | null {
  if (raw === null) return fallback;
  if (!/^\s*\d{4}\s*$/.test(raw)) return null;
  const year = Number(raw.trim());
  return year >= MIN_CYCLE_YEAR && year <= MAX_CYCLE_YEAR ? year : null;
}
