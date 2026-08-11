"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { FileText, Sparkles, Copy, ExternalLink } from "lucide-react";
import { HEALTH_LABELS } from "@/types/report";
import type { MemberRecap } from "./page";

type Props = { weekId: string; weeks: string[]; memberRecaps: MemberRecap[] };

const HEALTH_BADGE: Record<string, "accent" | "secondary" | "destructive"> = { "on-track": "accent", "at-risk": "secondary", "off-track": "destructive" };
const SPRINT_BADGE: Record<string, "accent" | "secondary" | "destructive"> = { Achieved: "accent", Ongoing: "secondary", Missed: "destructive" };
function reportHref(userId: string, weekId: string) { return `/admin/reports/${userId}/${weekId}`; }

export default function RecapClient({ weekId, weeks, memberRecaps }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const missing = memberRecaps.filter((m) => m.report === null);
  const present = memberRecaps.filter((m) => m.report !== null);
  const allEscalations = present.flatMap((m) => m.report!.escalations.map((e) => ({ ...e, userId: m.userId, userName: m.userName })));
  const allIncidents = present.flatMap((m) => m.report!.productionHealth.map((inc) => ({ ...inc, userId: m.userId, userName: m.userName })));

  async function handleGenerateSummary() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/recap/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekId }) });
      const json = await res.json();
      if (json.success) { setSummary(json.data.summary); setSavedPath(json.data.savedPath ?? null); if (json.data.savedToOneDrive) toast.success("Summary saved to OneDrive"); else toast.warning("Generated but could not save"); }
      else toast.error(json.error ?? "Failed to generate summary");
    } catch { toast.error("Failed to generate summary"); }
    finally { setGenerating(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <label htmlFor="week-select" className="text-[0.8rem] font-medium text-muted-foreground/70 shrink-0">Week</label>
          <select id="week-select" value={weekId} onChange={(e) => router.push(`?week=${e.target.value}`)}
            className="rounded-full border border-border/40 bg-muted/40 px-3.5 py-2 text-[0.8rem] outline-none focus-visible:ring-2 focus-visible:ring-ring/20 transition-all">
            {weeks.map((w) => (<option key={w} value={w}>{w}</option>))}
          </select>
        </div>
        <Button onClick={handleGenerateSummary} disabled={present.length === 0} loading={generating} size="sm" className="w-full sm:w-auto min-h-11 sm:min-h-0">
          <Sparkles className="h-3.5 w-3.5" />{generating ? "Generating…" : "AI Summary"}
        </Button>
      </div>

      {missing.length > 0 && (
        <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem] text-muted-foreground">Missing Reports ({missing.length})</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{missing.map((m) => <Badge key={m.userId} variant="outline" className="text-[0.7rem]">{m.userName}</Badge>)}</div></CardContent></Card>
      )}

      {generating && (
        <Card><CardContent className="p-6 space-y-3"><div className="skeleton h-4 w-1/3" /><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-5/6" /><div className="skeleton h-3 w-4/6" /></CardContent></Card>
      )}

      {present.length === 0 ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} title="No reports for this week" description={`No submitted reports found for ${weekId}.`} />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Team Summaries</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y divide-border/30">
                {present.map((m) => {
                  const report = m.report!;
                  const escalationCount = report.escalations.length;
                  const incidentCount = report.productionHealth.length;
                  const deliveryCounts = report.delivery.reduce((acc, d) => { acc[d.sprintGoalStatus] = (acc[d.sprintGoalStatus] ?? 0) + 1; return acc; }, {} as Record<string, number>);
                  return (
                    <div key={m.userId} className="py-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Link href={reportHref(m.userId, weekId)} className="text-[0.85rem] font-semibold hover:underline">{m.userName}</Link>
                        <div className="flex items-center gap-2">
                          <Badge variant={HEALTH_BADGE[report.healthIndicator]}>{HEALTH_LABELS[report.healthIndicator]}</Badge>
                          <LinkButton href={reportHref(m.userId, weekId)} variant="ghost" size="xs" className="text-muted-foreground/50"><ExternalLink className="h-3 w-3" /></LinkButton>
                        </div>
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
            </CardContent>
          </Card>

          <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Escalations</CardTitle></CardHeader><CardContent>{allEscalations.length === 0 ? <p className="text-[0.8rem] text-muted-foreground/50">None reported.</p> : <div className="space-y-3">{allEscalations.map((e, i) => (<div key={i} className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-1.5 text-sm"><div className="flex items-center gap-2"><span className="font-medium text-[0.85rem]">{e.project}</span><Link href={reportHref(e.userId, weekId)}><Badge variant="outline" className="text-[0.65rem] cursor-pointer hover:bg-muted">{e.userName}</Badge></Link></div><p className="text-muted-foreground/70 text-[0.8rem]">{e.topic}</p><p className="text-[0.8rem]"><span className="font-medium">Problem:</span> {e.problem}</p><p className="text-[0.8rem]"><span className="font-medium">Impact:</span> {e.impact}</p><p className="text-[0.8rem]"><span className="font-medium">Ask:</span> {e.ask}</p></div>))}</div>}</CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Production Incidents</CardTitle></CardHeader><CardContent>{allIncidents.length === 0 ? <p className="text-[0.8rem] text-muted-foreground/50">None reported.</p> : <div className="space-y-3">{allIncidents.map((inc, i) => (<div key={i} className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-1.5 text-sm"><div className="flex items-center gap-2"><span className="font-medium text-[0.85rem]">{inc.project}</span><Link href={reportHref(inc.userId, weekId)}><Badge variant="outline" className="text-[0.65rem] cursor-pointer hover:bg-muted">{inc.userName}</Badge></Link></div><p className="text-muted-foreground/70 text-[0.8rem]">{inc.topic}</p><p className="text-[0.8rem]"><span className="font-medium">Problem:</span> {inc.problem}</p><p className="text-[0.8rem]"><span className="font-medium">Root cause:</span> {inc.rootCause}</p><p className="text-[0.8rem]"><span className="font-medium">Next:</span> {inc.nextAction}</p></div>))}</div>}</CardContent></Card>

          <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Sprint Goals</CardTitle></CardHeader><CardContent><div className="space-y-5">{present.map((m) => (<div key={m.userId}><Link href={reportHref(m.userId, weekId)} className="text-[0.8rem] font-medium hover:underline">{m.userName}</Link>{m.report!.delivery.length === 0 ? <p className="text-[0.75rem] text-muted-foreground/50 ml-2 mt-1">No delivery items.</p> : <div className="space-y-2 ml-2 mt-2">{m.report!.delivery.map((d, i) => (<div key={i} className="rounded-lg border border-border/30 bg-muted/20 p-2.5 text-sm space-y-1"><div className="flex items-center gap-2"><span className="font-medium text-[0.8rem]">{d.project}</span><Badge variant={SPRINT_BADGE[d.sprintGoalStatus]} className="text-[0.6rem]">{d.sprintGoalStatus}</Badge></div><p className="text-muted-foreground/70 text-[0.75rem]">{d.progress}</p>{d.nextSteps && <p className="text-[0.75rem]"><span className="font-medium">Next:</span> {d.nextSteps}</p>}</div>))}</div>}</div>))}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Look Ahead</CardTitle></CardHeader><CardContent><div className="divide-y divide-border/30">{present.map((m) => (<div key={m.userId} className="py-3"><Link href={reportHref(m.userId, weekId)} className="text-[0.8rem] font-medium hover:underline">{m.userName}</Link><ol className="list-decimal list-inside text-[0.8rem] text-muted-foreground/70 space-y-0.5 ml-2 mt-1">{m.report!.lookAhead.priority1 && <li>{m.report!.lookAhead.priority1}</li>}{m.report!.lookAhead.priority2 && <li>{m.report!.lookAhead.priority2}</li>}</ol></div>))}</div></CardContent></Card>
        </>
      )}

      {!generating && summary && (
        <Card className="border-accent/20 ambient-glow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between"><CardTitle className="text-[0.85rem]">AI Executive Summary</CardTitle><Button size="xs" variant="ghost" onClick={() => { navigator.clipboard.writeText(summary); toast.success("Copied"); }}><Copy className="h-3 w-3" />Copy</Button></div>
            {savedPath && <p className="text-[0.7rem] text-muted-foreground/50 mt-1 font-mono">{savedPath}</p>}
          </CardHeader>
          <CardContent><p className="text-[0.85rem] whitespace-pre-wrap leading-relaxed text-foreground/80">{summary}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
