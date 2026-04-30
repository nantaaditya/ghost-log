import { describe, it, expect } from "vitest";
import { formatWeekId, parseWeekId, isValidWeekId, getCurrentWeekId } from "../iso-week";

describe("formatWeekId", () => {
  it("formats a normal week using week-of-month", () => {
    // 2026-04-21 is Tuesday. ISO week Monday = 2026-04-20. Thursday = 2026-04-23.
    // month=04, year=2026, dayOfMonth=23, weekOfMonth=ceil(23/7)=4
    expect(formatWeekId(new Date("2026-04-21"))).toBe("W4-04-2026");
  });

  it("uses Thursday of the ISO week for month derivation (year boundary)", () => {
    // 2015-12-28 is Monday. Thursday = 2015-12-31 → month 12, dayOfMonth=31, weekOfMonth=5
    expect(formatWeekId(new Date("2015-12-28"))).toBe("W5-12-2015");
  });

  it("handles a week that crosses year boundary (Jan week belonging to prev year)", () => {
    // 2016-01-01 is Friday. ISO week Monday = 2015-12-28. Thursday = 2015-12-31.
    expect(formatWeekId(new Date("2016-01-01"))).toBe("W5-12-2015");
  });

  it("produces W1 for the first week of a month", () => {
    // 2026-04-06 is Monday. Thursday = 2026-04-09. dayOfMonth=9, weekOfMonth=ceil(9/7)=2.
    // 2026-03-30 is Monday. Thursday = 2026-04-02. dayOfMonth=2, weekOfMonth=1 → W1-04-2026.
    expect(formatWeekId(new Date("2026-03-30"))).toBe("W1-04-2026");
  });
});

describe("isValidWeekId", () => {
  it("accepts valid week ids", () => {
    expect(isValidWeekId("W1-01-2026")).toBe(true);
    expect(isValidWeekId("W4-04-2026")).toBe(true);
    // January 2026: Jan 1 is Thursday → 5 Thursdays (Jan 1,8,15,22,29)
    expect(isValidWeekId("W5-01-2026")).toBe(true);
  });

  it("rejects structurally invalid week ids", () => {
    expect(isValidWeekId("W0-01-2026")).toBe(false);
    expect(isValidWeekId("W6-01-2026")).toBe(false);
    expect(isValidWeekId("17-04-2026")).toBe(false);
    expect(isValidWeekId("W1-4-2026")).toBe(false);
    expect(isValidWeekId("../../etc")).toBe(false);
  });

  it("rejects W5 for months with only 4 Thursdays", () => {
    // Feb 2026: first Thursday = Feb 5 → only 4 Thursdays (5,12,19,26)
    expect(isValidWeekId("W5-02-2026")).toBe(false);
  });
});

describe("parseWeekId", () => {
  it("returns a date for a valid week id", () => {
    const d = parseWeekId("W4-04-2026");
    expect(d).not.toBeNull();
  });

  it("returns the Monday of the week", () => {
    // W4-04-2026: 4th Thursday of April 2026 = Apr 23 → Monday = Apr 20
    const d = parseWeekId("W4-04-2026");
    expect(d?.getDay()).toBe(1);     // Monday
    expect(d?.getDate()).toBe(20);   // 20th
    expect(d?.getMonth()).toBe(3);   // April (0-indexed)
  });

  it("returns null for invalid id", () => {
    expect(parseWeekId("invalid")).toBeNull();
  });

  it("returns null for out-of-range week", () => {
    expect(parseWeekId("W5-02-2026")).toBeNull();
  });
});

describe("getCurrentWeekId", () => {
  it("returns a valid week id", () => {
    expect(isValidWeekId(getCurrentWeekId())).toBe(true);
  });
});
