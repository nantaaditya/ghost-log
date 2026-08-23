import { db } from "@/lib/db/client";
import { users, reports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentWeekId } from "@/lib/week/iso-week";
import { readFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { parseReport } from "@/lib/markdown/parse";
import { getHealthTrend } from "@/lib/db/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { PageShell } from "@/components/layout/PageShell";
import HealthTrendChart from "@/components/admin/HealthTrendChart";
import { HEALTH_LABELS } from "@/types/report";
import { TrendingUp, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import type { ReportData } from "@/types/report";

type ParsedMember = { userId: string; userName: string; report: ReportData };

export default async function TeamDashboard() {
  const weekId = getCurrentWeekId();
  const [activeMembers, submitted, trend] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.role, "member"), eq(users.status, "active"))),
    db.select({ userId: reports.userId, userName: users.name }).from(reports).innerJoin(users, eq(reports.userId, users.id)).where(and(eq(reports.weekId, weekId), eq(reports.status, "submitted"))),
    getHealthTrend(8),
  ]);

  const settled = await Promise.allSettled(submitted.map(async ({ userId, userName }) => {
    const markdown = await readFile(buildReportPath(userName, weekId));
    const report = parseReport(markdown);
    return { userId, userName, report };
  }));

  const present: ParsedMember[] = settled.filter((r): r is PromiseFulfilledResult<ParsedMember> => r.status === "fulfilled" && r.value.report !== null).map((r) => r.value);
  const submittedIds = new Set(submitted.map((s) => s.userId));
  const missing = activeMembers.filter((m) => !submittedIds.has(m.id));
  const healthCounts: Record<"on-track" | "at-risk" | "off-track", number> = { "on-track": 0, "at-risk": 0, "off-track": 0 };
  for (const { report } of present) healthCounts[report.healthIndicator]++;
  const allEscalations = present.flatMap(({ userName, report }) => report.escalations.map((e) => ({ ...e, userName })));
  const offTrackMembers = present.filter((m) => m.report.healthIndicator === "off-track");
  const total = activeMembers.length;
  const submissionRate = total > 0 ? Math.round((submitted.length / total) * 100) : 0;

  return (
    <PageShell maxWidth="4xl" className="pb-0 sm:pb-0">
      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40"><CardContent className="p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${submissionRate >= 80 ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}><TrendingUp className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold tabular-nums">{submissionRate}%</p><p className="text-[0.7rem] text-muted-foreground/70">{submitted.length}/{total}</p></div>
        </CardContent></Card>

        <Card className="border-border/40"><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><CheckCircle2 className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold tabular-nums text-primary">{healthCounts["on-track"]}</p><p className="text-[0.7rem] text-muted-foreground/70">On Track</p></div>
        </CardContent></Card>

        <Card className="border-border/40"><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0"><AlertTriangle className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold tabular-nums text-accent">{healthCounts["at-risk"]}</p><p className="text-[0.7rem] text-muted-foreground/70">At Risk</p></div>
        </CardContent></Card>

        <Card className={`border-border/40 ${offTrackMembers.length > 0 ? "ring-2 ring-destructive/20" : ""}`}><CardContent className="p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${offTrackMembers.length > 0 ? "bg-destructive/10 text-destructive" : "bg-muted/40 text-muted-foreground/40"}`}><ShieldAlert className="h-5 w-5" /></div>
          <div><p className={`text-2xl font-bold tabular-nums ${offTrackMembers.length > 0 ? "text-destructive" : "text-muted-foreground/40"}`}>{healthCounts["off-track"]}</p><p className="text-[0.7rem] text-muted-foreground/70">Off Track</p></div>
        </CardContent></Card>
      </div>

      <Card className="border-border/40">
        <CardHeader className="pb-2"><CardTitle className="text-[0.8rem] text-muted-foreground">8-Week Trend</CardTitle></CardHeader>
        <CardContent className="pt-0"><HealthTrendChart weeks={trend} variant="compact" /></CardContent>
      </Card>

      {offTrackMembers.length > 0 && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[0.85rem] text-destructive">Attention Required</p>
            <p className="text-[0.8rem] text-muted-foreground mt-0.5">{offTrackMembers.map((m) => m.userName).join(", ")} reporting off-track.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[0.9rem]">This Week — {weekId}</CardTitle>
            <LinkButton href={`/admin/recap?week=${weekId}`} variant="ghost" size="sm">Full Recap →</LinkButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[0.8rem] text-muted-foreground/60 shrink-0">{submitted.length}/{total} submitted</span>
            <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${submissionRate >= 80 ? "bg-primary" : submissionRate >= 50 ? "bg-accent" : "bg-destructive/60"}`} style={{ width: `${submissionRate}%` }} />
            </div>
            <span className="text-[0.8rem] font-medium shrink-0 tabular-nums">{submissionRate}%</span>
          </div>

          {present.length > 0 && (
            <div className="divide-y divide-border/30">
              {present.map((m) => {
                const report = m.report;
                const isOffTrack = report.healthIndicator === "off-track";
                return (
                  <div key={m.userId} className={`py-2.5 flex items-center justify-between gap-2 ${isOffTrack ? "bg-destructive/[0.02] -mx-5 px-5 rounded-lg" : ""}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`size-2 rounded-full shrink-0 ${isOffTrack ? "bg-destructive" : report.healthIndicator === "at-risk" ? "bg-accent" : "bg-primary"}`} />
                      <span className="text-[0.85rem] font-medium truncate">{m.userName}</span>
                      <span className="text-[0.7rem] text-muted-foreground/50">{HEALTH_LABELS[report.healthIndicator]}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[0.7rem] text-muted-foreground/50">
                      {report.escalations.length > 0 && <Badge variant="destructive" className="text-[0.6rem]">{report.escalations.length} escalation{report.escalations.length > 1 ? "s" : ""}</Badge>}
                      {report.productionHealth.length > 0 && <Badge variant="accent" className="text-[0.6rem]">{report.productionHealth.length} incident{report.productionHealth.length > 1 ? "s" : ""}</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {allEscalations.length > 0 && (
        <Card><CardHeader className="pb-3"><div className="flex items-center gap-2"><CardTitle className="text-[0.85rem]">Escalations</CardTitle><Badge variant="destructive" className="text-[0.6rem]">{allEscalations.length}</Badge></div></CardHeader><CardContent><div className="space-y-3">{allEscalations.map((e, i) => (<div key={i} className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-1.5 text-sm"><div className="flex items-center gap-2"><span className="font-medium text-[0.85rem]">{e.project}</span><Badge variant="outline" className="text-[0.65rem]">{e.userName}</Badge></div><p className="text-muted-foreground/70 text-[0.8rem]">{e.topic}</p><p className="text-[0.8rem]"><span className="font-medium">Ask:</span> {e.ask}</p></div>))}</div></CardContent></Card>
      )}

      {missing.length > 0 && (
        <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem] text-muted-foreground">Missing Reports ({missing.length})</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{missing.map((m) => <Badge key={m.id} variant="outline" className="text-[0.7rem]">{m.name}</Badge>)}</div></CardContent></Card>
      )}
    </PageShell>
  );
}
