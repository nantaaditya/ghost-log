import { describe, it, expect } from "vitest";
import { buildHealthTrend } from "../health-trend";

describe("buildHealthTrend", () => {
  it("distributes counts into the matching health buckets per week", () => {
    const result = buildHealthTrend(
      ["W1-01-2026", "W2-01-2026"],
      [
        { weekId: "W1-01-2026", healthIndicator: "on-track", count: 3 },
        { weekId: "W1-01-2026", healthIndicator: "at-risk", count: 1 },
        { weekId: "W2-01-2026", healthIndicator: "off-track", count: 2 },
      ],
      5,
    );

    expect(result).toEqual([
      { weekId: "W1-01-2026", onTrack: 3, atRisk: 1, offTrack: 0, unknown: 0, submitted: 4, total: 5 },
      { weekId: "W2-01-2026", onTrack: 0, atRisk: 0, offTrack: 2, unknown: 0, submitted: 2, total: 5 },
    ]);
  });

  it("returns zeroed buckets for a week with no submitted reports", () => {
    const result = buildHealthTrend(["W3-01-2026"], [], 4);
    expect(result).toEqual([
      { weekId: "W3-01-2026", onTrack: 0, atRisk: 0, offTrack: 0, unknown: 0, submitted: 0, total: 4 },
    ]);
  });

  it("counts legacy rows with a null health indicator as unknown, not dropped", () => {
    const result = buildHealthTrend(
      ["W4-01-2026"],
      [{ weekId: "W4-01-2026", healthIndicator: null, count: 2 }],
      4,
    );
    expect(result[0]).toEqual({
      weekId: "W4-01-2026", onTrack: 0, atRisk: 0, offTrack: 0, unknown: 2, submitted: 2, total: 4,
    });
  });

  it("preserves the given weekId order (oldest first) regardless of row order", () => {
    const result = buildHealthTrend(
      ["W1-01-2026", "W2-01-2026", "W3-01-2026"],
      [{ weekId: "W3-01-2026", healthIndicator: "on-track", count: 1 }],
      2,
    );
    expect(result.map((r) => r.weekId)).toEqual(["W1-01-2026", "W2-01-2026", "W3-01-2026"]);
  });
});
