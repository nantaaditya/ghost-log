import type { WeekHealthTrend } from "@/lib/db/health-trend";

export type TrendSegmentKind = "on-track" | "at-risk" | "off-track" | "unknown";

export type TrendBarSegment = {
  kind: TrendSegmentKind;
  yTop: number;
  height: number;
};

export type TrendPoint = {
  weekId: string;
  barX: number;
  barWidth: number;
  segments: TrendBarSegment[];
  lineX: number;
  lineY: number;
  submissionRatePct: number;
  submitted: number;
  total: number;
};

export type ShapedHealthTrend = {
  points: TrendPoint[];
  linePath: string;
};

const BAR_GAP_RATIO = 0.35;

/** Normalizes weekly health/submission counts into a 0-100 SVG coordinate space. Pure — no DOM. */
export function shapeHealthTrend(weeks: WeekHealthTrend[]): ShapedHealthTrend {
  if (weeks.length === 0) return { points: [], linePath: "" };

  const slotWidth = 100 / weeks.length;
  const barWidth = slotWidth * (1 - BAR_GAP_RATIO);
  const barGap = (slotWidth - barWidth) / 2;

  const points: TrendPoint[] = weeks.map((week, i) => {
    const barX = i * slotWidth + barGap;
    const lineX = i * slotWidth + slotWidth / 2;
    const total = week.total > 0 ? week.total : 1;

    const stackOrder: { kind: TrendSegmentKind; count: number }[] = [
      { kind: "on-track", count: week.onTrack },
      { kind: "at-risk", count: week.atRisk },
      { kind: "off-track", count: week.offTrack },
      { kind: "unknown", count: week.unknown },
    ];

    let cursor = 100;
    const segments: TrendBarSegment[] = [];
    for (const { kind, count } of stackOrder) {
      if (count === 0) continue;
      const height = (count / total) * 100;
      cursor -= height;
      segments.push({ kind, yTop: cursor, height });
    }

    const submissionRatePct = week.total > 0 ? Math.round((week.submitted / week.total) * 100) : 0;

    return {
      weekId: week.weekId,
      barX,
      barWidth,
      segments,
      lineX,
      lineY: 100 - submissionRatePct,
      submissionRatePct,
      submitted: week.submitted,
      total: week.total,
    };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.lineX.toFixed(2)} ${p.lineY.toFixed(2)}`).join(" ");

  return { points, linePath };
}
