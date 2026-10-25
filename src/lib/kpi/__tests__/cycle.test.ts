import { describe, it, expect } from "vitest";
import {
  PLAN_CYCLE_YEAR,
  SURVEY_CYCLE_YEAR,
  describeYearMismatch,
  parsePlanningYear,
} from "../cycle";

describe("describeYearMismatch", () => {
  it("is silent when the export matches the years the app shows", () => {
    expect(describeYearMismatch({ cycleYear: SURVEY_CYCLE_YEAR })).toEqual([]);
    expect(
      describeYearMismatch({ cycleYear: SURVEY_CYCLE_YEAR, goalsCycleYear: PLAN_CYCLE_YEAR }),
    ).toEqual([]);
  });

  it("warns when the survey year is not the one /coach reads, naming both years", () => {
    const warnings = describeYearMismatch({ cycleYear: SURVEY_CYCLE_YEAR + 1 });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.join(" ")).toContain(String(SURVEY_CYCLE_YEAR + 1));
    expect(warnings.join(" ")).toContain(String(SURVEY_CYCLE_YEAR));
  });

  it("warns when the goals would be stored under a year the plan tab does not show", () => {
    const warnings = describeYearMismatch({
      cycleYear: SURVEY_CYCLE_YEAR,
      goalsCycleYear: PLAN_CYCLE_YEAR + 1,
    });
    expect(warnings.some((w) => w.includes(String(PLAN_CYCLE_YEAR + 1)))).toBe(true);
  });

  it("works out the goals year the same way the import does when none is given", () => {
    // survey 2027 -> goals default to 2028, which is not the plan year the app shows
    const warnings = describeYearMismatch({ cycleYear: SURVEY_CYCLE_YEAR + 1 });
    expect(warnings.some((w) => w.includes(String(SURVEY_CYCLE_YEAR + 2)))).toBe(true);
  });
});

describe("parsePlanningYear", () => {
  it("uses the fallback when no year was given", () => {
    expect(parsePlanningYear(null, 2027)).toBe(2027);
  });

  it("accepts a whole year, ignoring surrounding spaces", () => {
    expect(parsePlanningYear("2028", 2027)).toBe(2028);
    expect(parsePlanningYear(" 2028 ", 2027)).toBe(2028);
  });

  it.each(["abc", "", "2027.5", "20x7", "1999", "2101", "NaN", "Infinity"])(
    "rejects %j rather than writing a broken export",
    (raw) => {
      expect(parsePlanningYear(raw, 2027)).toBeNull();
    },
  );
});
