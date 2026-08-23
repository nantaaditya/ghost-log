import { shapeHealthTrend, type TrendSegmentKind } from "./health-trend-shape";
import type { WeekHealthTrend } from "@/lib/db/health-trend";

type Props = {
  weeks: WeekHealthTrend[];
  variant?: "full" | "compact";
};

const SEGMENT_CLASS: Record<TrendSegmentKind, string> = {
  "on-track": "fill-primary",
  "at-risk": "fill-accent",
  "off-track": "fill-destructive",
  unknown: "fill-muted-foreground/25",
};

export default function HealthTrendChart({ weeks, variant = "full" }: Props) {
  const { points, linePath } = shapeHealthTrend(weeks);
  const hasData = weeks.some((w) => w.submitted > 0);

  if (points.length === 0 || !hasData) {
    return <p className="text-[0.8rem] text-muted-foreground/50">Not enough history yet to show a trend.</p>;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.submissionRatePct - first.submissionRatePct;
  const trendSummary =
    `Submission rate ${delta > 0 ? "rose" : delta < 0 ? "fell" : "held steady"} from ` +
    `${first.submissionRatePct}% in ${first.weekId} to ${last.submissionRatePct}% in ${last.weekId}.`;

  const heightClass = variant === "compact" ? "h-14" : "h-40 sm:h-48";

  return (
    <div className="space-y-2">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={trendSummary} className={`w-full ${heightClass}`}>
        <line x1="0" y1="100" x2="100" y2="100" className="stroke-border" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

        {points.map((p) => (
          <g key={p.weekId} className="group">
            <rect x={p.barX} y="0" width={p.barWidth} height="100" fill="transparent" className="transition-colors group-hover:fill-foreground/[0.04]" />
            <title>{`${p.weekId}: ${p.submitted}/${p.total} submitted (${p.submissionRatePct}%)`}</title>
            {p.segments.map((s, i) => (
              <rect key={i} x={p.barX} y={s.yTop} width={p.barWidth} height={s.height} className={SEGMENT_CLASS[s.kind]} />
            ))}
          </g>
        ))}

        <path d={linePath} fill="none" className="stroke-foreground/70" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {variant === "full" && (
        <>
          <div className="flex justify-between text-[0.65rem] text-muted-foreground/50">
            <span>{first.weekId}</span>
            <span>{last.weekId}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[0.7rem] text-muted-foreground/70">
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" />On Track</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" />At Risk</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-destructive" />Off Track</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-foreground/70" />Submission Rate</span>
          </div>
        </>
      )}

      <p className="sr-only">{trendSummary}</p>
    </div>
  );
}
