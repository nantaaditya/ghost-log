import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { isValidWeekId } from "@/lib/week/iso-week";
import { readFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { parseReport } from "@/lib/markdown/parse";
import { LinkButton } from "@/components/ui/link-button";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";
import { HEALTH_LABELS } from "@/types/report";
import type { ReportData } from "@/types/report";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ weekId: string }> };

type MemberRecap = { userId: string; userName: string; report: ReportData | null };

const HEALTH_BADGE: Record<string, "accent" | "secondary" | "destructive"> = {
  "on-track": "accent", "at-risk": "secondary", "off-track": "destructive",
};
const SPRINT_BADGE: Record<string, "accent" | "secondary" | "destructive"> = {
  Achieved: "accent", Ongoing: "secondary", Missed: "destructive",
};

export default async function TeamWeekPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const { weekId } = await params;
  if (!isValidWeekId(weekId)) notFound();

  const submitted = await db
    .select({ userId: reports.userId, userName: users.name })
    .from(reports)
    .innerJoin(users, eq(reports.userId, users.id))
    .where(and(eq(reports.weekId, weekId), eq(reports.status, "submitted")));
  if (submitted.length === 0) notFound();

  const memberRecaps: MemberRecap[] = await Promise.all(
    submitted.map(async ({ userId, userName }) => {
      try {
        const markdown = await readFile(buildReportPath(userName, weekId));
        return { userId, userName, report: parseReport(markdown) };
      } catch { return { userId, userName, report: null }; }
    })
  );

  const present = memberRecaps.filter((m) => m.report !== null);
  const allEscalations = present.flatMap((m) => m.report!.escalations.map((e) => ({ ...e, userName: m.userName })));
  const allIncidents = present.flatMap((m) => m.report!.productionHealth.map((inc) => ({ ...inc, userName: m.userName })));

  return (
    <PageShell maxWidth="4xl">
      <PageHeader title="Team Report" subtitle={weekId}
        actions={<LinkButton href="/" variant="ghost" size="sm">← Dashboard</LinkButton>} />

      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Team Summaries</CardTitle></CardHeader>
          <CardContent>
            {present.length === 0 ? (
              <EmptyState icon={<FileText className="h-5 w-5" />} title="No reports available" description="Reports could not be loaded for this week." />
            ) : (
              <div className="divide-y divide-border/30">
                {present.map((m) => {
                  const report = m.report!;
                  const escalationCount = report.escalations.length;
                  const incidentCount = report.productionHealth.length;
                  const deliveryCounts = report.delivery.reduce((acc, d) => { acc[d.sprintGoalStatus] = (acc[d.sprintGoalStatus] ?? 0) + 1; return acc; }, {} as Record<string, number>);
                  return (
                    <div key={m.userId} className="py-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[0.85rem] font-semibold">{m.userName}</span>
                        <Badge variant={HEALTH_BADGE[report.healthIndicator]}>{HEALTH_LABELS[report.healthIndicator]}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[0.7rem]">
                        {escalationCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/5 px-2 py-0.5 text-destructive/80">{escalationCount} escalation{escalationCount > 1 ? "s" : ""}</span>}
                        {incidentCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-amber-400">{incidentCount} incident{incidentCount > 1 ? "s" : ""}</span>}
                        {report.delivery.length > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-muted/30 px-2 py-0.5 text-muted-foreground/70">{["Achieved", "Ongoing", "Missed"].filter((s) => deliveryCounts[s]).map((s) => `${deliveryCounts[s]} ${s}`).join(" · ")}</span>}
                      </div>
                      {report.lookAhead.priority1 && <p className="text-[0.75rem] text-muted-foreground/60 pl-1 border-l-2 border-border/30">{report.lookAhead.priority1}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {allEscalations.length > 0 && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Escalations</CardTitle></CardHeader><CardContent><div className="space-y-3">{allEscalations.map((e, i) => (<div key={i} className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-1.5 text-sm"><div className="flex items-center gap-2"><span className="font-medium text-[0.85rem]">{e.project}</span><Badge variant="outline" className="text-[0.65rem]">{e.userName}</Badge></div><p className="text-muted-foreground/70 text-[0.8rem]">{e.topic}</p><p className="text-[0.8rem]"><span className="font-medium">Problem:</span> {e.problem}</p><p className="text-[0.8rem]"><span className="font-medium">Impact:</span> {e.impact}</p><p className="text-[0.8rem]"><span className="font-medium">Ask:</span> {e.ask}</p></div>))}</div></CardContent></Card>
        )}

        {allIncidents.length > 0 && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Production Incidents</CardTitle></CardHeader><CardContent><div className="space-y-3">{allIncidents.map((inc, i) => (<div key={i} className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-1.5 text-sm"><div className="flex items-center gap-2"><span className="font-medium text-[0.85rem]">{inc.project}</span><Badge variant="outline" className="text-[0.65rem]">{inc.userName}</Badge></div><p className="text-muted-foreground/70 text-[0.8rem]">{inc.topic}</p><p className="text-[0.8rem]"><span className="font-medium">Problem:</span> {inc.problem}</p><p className="text-[0.8rem]"><span className="font-medium">Root cause:</span> {inc.rootCause}</p><p className="text-[0.8rem]"><span className="font-medium">Next:</span> {inc.nextAction}</p></div>))}</div></CardContent></Card>
        )}

        {present.some((m) => m.report!.delivery.length > 0) && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Sprint Goals</CardTitle></CardHeader><CardContent><div className="space-y-5">{present.map((m) => (<div key={m.userId}><p className="text-[0.8rem] font-medium">{m.userName}</p>{m.report!.delivery.length === 0 ? <p className="text-[0.75rem] text-muted-foreground/50 ml-2 mt-1">No delivery items.</p> : <div className="space-y-2 ml-2 mt-2">{m.report!.delivery.map((d, i) => (<div key={i} className="rounded-lg border border-border/30 bg-muted/20 p-2.5 text-sm space-y-1"><div className="flex items-center gap-2"><span className="font-medium text-[0.8rem]">{d.project}</span><Badge variant={SPRINT_BADGE[d.sprintGoalStatus]} className="text-[0.6rem]">{d.sprintGoalStatus}</Badge></div><p className="text-muted-foreground/70 text-[0.75rem]">{d.progress}</p>{d.nextSteps && <p className="text-[0.75rem]"><span className="font-medium">Next:</span> {d.nextSteps}</p>}</div>))}</div>}</div>))}</div></CardContent></Card>
        )}

        {present.some((m) => m.report!.lookAhead.priority1 || m.report!.lookAhead.priority2) && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Look Ahead</CardTitle></CardHeader><CardContent><div className="divide-y divide-border/30">{present.map((m) => (<div key={m.userId} className="py-3"><p className="text-[0.8rem] font-medium">{m.userName}</p><ol className="list-decimal list-inside text-[0.8rem] text-muted-foreground/70 space-y-0.5 ml-2 mt-1">{m.report!.lookAhead.priority1 && <li>{m.report!.lookAhead.priority1}</li>}{m.report!.lookAhead.priority2 && <li>{m.report!.lookAhead.priority2}</li>}</ol></div>))}</div></CardContent></Card>
        )}
      </div>
    </PageShell>
  );
}
