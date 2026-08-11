import { db } from "@/lib/db/client";
import { users, reports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentWeekId } from "@/lib/week/iso-week";
import { readFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { parseReport } from "@/lib/markdown/parse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { PageShell } from "@/components/layout/PageShell";
import { HEALTH_LABELS } from "@/types/report";
import type { ReportData } from "@/types/report";

type ParsedMember = { userId: string; userName: string; report: ReportData };

export default async function TeamDashboard() {
  const weekId = getCurrentWeekId();
  const [activeMembers, submitted] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.role, "member"), eq(users.status, "active"))),
    db.select({ userId: reports.userId, userName: users.name }).from(reports).innerJoin(users, eq(reports.userId, users.id)).where(and(eq(reports.weekId, weekId), eq(reports.status, "submitted"))),
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
  const total = activeMembers.length;
  const submissionRate = total > 0 ? Math.round((submitted.length / total) * 100) : 0;

  return (
    <PageShell maxWidth="4xl" className="pb-0 sm:pb-0">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[0.9rem]">This Week — {weekId}</CardTitle>
            <LinkButton href={`/admin/recap?week=${weekId}`} variant="ghost" size="sm">Full Recap →</LinkButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="text-[0.8rem] text-muted-foreground/60 shrink-0">{submitted.length}/{total} submitted</span>
            <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${submissionRate >= 80 ? "bg-accent" : submissionRate >= 50 ? "bg-amber-400/70" : "bg-destructive/60"}`} style={{ width: `${submissionRate}%` }} />
            </div>
            <span className="text-[0.8rem] font-medium shrink-0 tabular-nums">{submissionRate}%</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["on-track", "at-risk", "off-track"] as const).map((key) => (
              <div key={key} className="rounded-xl border border-border/40 bg-muted/20 p-3 text-center">
                <p className="text-2xl font-semibold tabular-nums text-foreground/80">{healthCounts[key]}</p>
                <p className="text-[0.7rem] text-muted-foreground/60 mt-0.5">{HEALTH_LABELS[key]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2"><CardTitle className="text-[0.85rem]">Escalations</CardTitle>{allEscalations.length > 0 && <Badge variant="destructive" className="text-[0.6rem]">{allEscalations.length}</Badge>}</div>
        </CardHeader>
        <CardContent>
          {allEscalations.length === 0 ? <p className="text-[0.8rem] text-muted-foreground/50">No escalations this week.</p> : (
            <div className="space-y-3">
              {allEscalations.map((e, i) => (
                <div key={i} className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2"><span className="font-medium text-[0.85rem]">{e.project}</span><Badge variant="outline" className="text-[0.65rem]">{e.userName}</Badge></div>
                  <p className="text-muted-foreground/70 text-[0.8rem]">{e.topic}</p>
                  <p className="text-[0.8rem]"><span className="font-medium">Ask:</span> {e.ask}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {missing.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-[0.85rem] text-muted-foreground">Missing Reports ({missing.length})</CardTitle></CardHeader>
          <CardContent><div className="flex flex-wrap gap-2">{missing.map((m) => <Badge key={m.id} variant="outline" className="text-[0.7rem]">{m.name}</Badge>)}</div></CardContent>
        </Card>
      )}
    </PageShell>
  );
}
