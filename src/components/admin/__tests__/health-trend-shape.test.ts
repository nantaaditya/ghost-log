import { describe, it, expect } from "vitest";
import { shapeHealthTrend } from "../health-trend-shape";

describe("shapeHealthTrend", () => {
  it("returns empty output for an empty week list", () => {
    expect(shapeHealthTrend([])).toEqual({ points: [], linePath: "" });
  });

  it("stacks segments bottom-up as on-track, at-risk, off-track, unknown", () => {
    const [point] = shapeHealthTrend([
      { weekId: "W1-01-2026", onTrack: 2, atRisk: 1, offTrack: 1, unknown: 0, submitted: 4, total: 4 },
    ]).points;

    expect(point.segments.map((s) => s.kind)).toEqual(["on-track", "at-risk", "off-track"]);
    // on-track is the base: 2/4 = 50 height, sitting at the bottom (yTop = 50)
    expect(point.segments[0]).toEqual({ kind: "on-track", yTop: 50, height: 50 });
    // at-risk stacks on top of on-track: 1/4 = 25 height, yTop = 50 - 25 = 25
    expect(point.segments[1]).toEqual({ kind: "at-risk", yTop: 25, height: 25 });
    // off-track stacks on top of that: 1/4 = 25 height, yTop = 25 - 25 = 0
    expect(point.segments[2]).toEqual({ kind: "off-track", yTop: 0, height: 25 });
  });

  it("omits zero-count segments entirely", () => {
    const [point] = shapeHealthTrend([
      { weekId: "W1-01-2026", onTrack: 4, atRisk: 0, offTrack: 0, unknown: 0, submitted: 4, total: 4 },
    ]).points;
    expect(point.segments).toHaveLength(1);
    expect(point.segments[0].kind).toBe("on-track");
  });

  it("computes submission rate and line y as its inverse (0-100 domain)", () => {
    const [point] = shapeHealthTrend([
      { weekId: "W1-01-2026", onTrack: 3, atRisk: 0, offTrack: 0, unknown: 0, submitted: 3, total: 4 },
    ]).points;
    expect(point.submissionRatePct).toBe(75);
    expect(point.lineY).toBe(25);
  });

  it("guards against divide-by-zero when total is 0", () => {
    const [point] = shapeHealthTrend([
      { weekId: "W1-01-2026", onTrack: 0, atRisk: 0, offTrack: 0, unknown: 0, submitted: 0, total: 0 },
    ]).points;
    expect(point.submissionRatePct).toBe(0);
    expect(point.segments).toHaveLength(0);
  });

  it("lays out bar slots left to right and builds a matching line path", () => {
    const { points, linePath } = shapeHealthTrend([
      { weekId: "W1-01-2026", onTrack: 2, atRisk: 0, offTrack: 0, unknown: 0, submitted: 2, total: 2 },
      { weekId: "W2-01-2026", onTrack: 1, atRisk: 1, offTrack: 0, unknown: 0, submitted: 2, total: 2 },
    ]);
    expect(points[0].barX).toBeLessThan(points[1].barX);
    expect(points[0].lineX).toBeLessThan(points[1].lineX);
    expect(linePath.startsWith("M ")).toBe(true);
    expect(linePath.includes(" L ")).toBe(true);
  });
});
