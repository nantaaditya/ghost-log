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
import { FileText, Sparkles, Copy, TrendingUp, AlertTriangle, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { HEALTH_LABELS } from "@/types/report";
import type { MemberRecap } from "./page";

type Props = { weekId: string; weeks: string[]; memberRecaps: MemberRecap[] };

const HEALTH_BADGE: Record<string, "default" | "accent" | "destructive"> = {
  "on-track": "default", "at-risk": "accent", "off-track": "destructive",
};
const SPRINT_BADGE: Record<string, "default" | "accent" | "destructive"> = {
  Achieved: "default", Ongoing: "accent", Missed: "destructive",
};
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

  const healthCounts = { "on-track": 0, "at-risk": 0, "off-track": 0 };
  for (const { report } of present) healthCounts[report!.healthIndicator]++;
  const total = memberRecaps.length;
  const submissionRate = total > 0 ? Math.round((present.length / total) * 100) : 0;
  const offTrackMembers = present.filter((m) => m.report!.healthIndicator === "off-track");

  async function handleGenerateSummary() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/recap/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekId }) });
      const json = await res.json();
      if (json.success) { setSummary(json.data.summary); setSavedPath(json.data.savedPath ?? null); toast.success(json.data.savedToOneDrive ? "Saved to OneDrive" : "Generated"); }
      else toast.error(json.error ?? "Failed");
    } catch { toast.error("Failed"); }
    finally { setGenerating(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <label htmlFor="week-select" className="text-[0.8rem] font-medium text-muted-foreground/70 shrink-0">Week</label>
          <select id="week-select" value={weekId} onChange={(e) => router.push(`?week=${e.target.value}`)}
            className="rounded-full border border-border bg-background px-3.5 py-2 text-[0.8rem] outline-none focus-visible:ring-2 focus-visible:ring-ring/20 transition-all">
            {weeks.map((w) => (<option key={w} value={w}>{w}</option>))}
          </select>
        </div>
        <Button onClick={handleGenerateSummary} disabled={present.length === 0} loading={generating} size="sm" className="w-full sm:w-auto min-h-11 sm:min-h-0">
          <Sparkles className="h-3.5 w-3.5" />{generating ? "Generating…" : "AI Summary"}
        </Button>
      </div>

      {/* ===== STATS OVERVIEW ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40"><CardContent className="p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${submissionRate >= 80 ? "bg-primary/10 text-primary" : submissionRate >= 50 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}><TrendingUp className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold tabular-nums">{submissionRate}%</p><p className="text-[0.7rem] text-muted-foreground/70">{present.length}/{total} submitted</p></div>
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

      {/* Off-track alert banner */}
      {offTrackMembers.length > 0 && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[0.85rem] text-destructive">Attention Required</p>
            <p className="text-[0.8rem] text-muted-foreground mt-0.5">
              {offTrackMembers.map((m) => m.userName).join(", ")} {offTrackMembers.length === 1 ? "is" : "are"} reporting off-track.
            </p>
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <Card><CardHeader className="pb-3"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground/50" /><CardTitle className="text-[0.85rem]">Missing Reports ({missing.length})</CardTitle></div></CardHeader><CardContent><div className="flex flex-wrap gap-2">{missing.map((m) => <Badge key={m.userId} variant="outline" className="text-[0.7rem]">{m.userName}</Badge>)}</div></CardContent></Card>
      )}

      {generating && <Card><CardContent className="p-6 space-y-3"><div className="skeleton h-4 w-1/3" /><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-5/6" /></CardContent></Card>}

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
                  const isOffTrack = report.healthIndicator === "off-track";
                  return (
                    <div key={m.userId} className={`py-4 space-y-2 ${isOffTrack ? "bg-destructive/[0.03] -mx-5 px-5 rounded-lg" : ""}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Link href={reportHref(m.userId, weekId)} className="text-[0.85rem] font-semibold hover:underline">{m.userName}</Link>
                        <div className="flex items-center gap-2">
                          <Badge variant={HEALTH_BADGE[report.healthIndicator]}>{HEALTH_LABELS[report.healthIndicator]}</Badge>
                          <LinkButton href={reportHref(m.userId, weekId)} variant="ghost" size="xs" className="text-muted-foreground/40">View</LinkButton>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[0.7rem]">
                        {escalationCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/5 px-2 py-0.5 text-destructive/80">{escalationCount} escalation{escalationCount > 1 ? "s" : ""}</span>}
                        {incidentCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/5 px-2 py-0.5 text-accent">{incidentCount} incident{incidentCount > 1 ? "s" : ""}</span>}
                        {report.delivery.length > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-muted/30 px-2 py-0.5 text-muted-foreground/70">{["Achieved", "Ongoing", "Missed"].filter((s) => deliveryCounts[s]).map((s) => `${deliveryCounts[s]} ${s}`).join(" · ")}</span>}
                      </div>
                      {report.lookAhead.priority1 && <p className="text-[0.75rem] text-muted-foreground/60">{report.lookAhead.priority1}</p>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Escalations{allEscalations.length > 0 && <span className="ml-2 text-[0.7rem] text-muted-foreground/50 font-normal">{allEscalations.length}</span>}</CardTitle></CardHeader><CardContent>{allEscalations.length === 0 ? <p className="text-[0.8rem] text-muted-foreground/50">None reported.</p> : <div className="space-y-3">{allEscalations.map((e, i) => (<div key={i} className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-1.5 text-sm"><div className="flex items-center gap-2"><span className="font-medium text-[0.85rem]">{e.project}</span><Link href={reportHref(e.userId, weekId)}><Badge variant="outline" className="text-[0.65rem] cursor-pointer hover:bg-muted">{e.userName}</Badge></Link></div><p className="text-muted-foreground/70 text-[0.8rem]">{e.topic}</p><p className="text-[0.8rem]"><span className="font-medium">Problem:</span> {e.problem}</p><p className="text-[0.8rem]"><span className="font-medium">Impact:</span> {e.impact}</p><p className="text-[0.8rem]"><span className="font-medium">Ask:</span> {e.ask}</p></div>))}</div>}</CardContent></Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Production Incidents{allIncidents.length > 0 && <span className="ml-2 text-[0.7rem] text-muted-foreground/50 font-normal">{allIncidents.length}</span>}</CardTitle></CardHeader><CardContent>{allIncidents.length === 0 ? <p className="text-[0.8rem] text-muted-foreground/50">None reported.</p> : <div className="space-y-3">{allIncidents.map((inc, i) => (<div key={i} className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-1.5 text-sm"><div className="flex items-center gap-2"><span className="font-medium text-[0.85rem]">{inc.project}</span><Link href={reportHref(inc.userId, weekId)}><Badge variant="outline" className="text-[0.65rem] cursor-pointer hover:bg-muted">{inc.userName}</Badge></Link></div><p className="text-muted-foreground/70 text-[0.8rem]">{inc.topic}</p><p className="text-[0.8rem]"><span className="font-medium">Root cause:</span> {inc.rootCause}</p><p className="text-[0.8rem]"><span className="font-medium">Next:</span> {inc.nextAction}</p></div>))}</div>}</CardContent></Card>

            <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Sprint Goals</CardTitle></CardHeader><CardContent><div className="space-y-4">{present.map((m) => (<div key={m.userId}><Link href={reportHref(m.userId, weekId)} className="text-[0.8rem] font-medium hover:underline">{m.userName}</Link>{m.report!.delivery.length === 0 ? <p className="text-[0.75rem] text-muted-foreground/50 ml-2 mt-1">No delivery items.</p> : <div className="space-y-2 ml-2 mt-2">{m.report!.delivery.map((d, i) => (<div key={i} className="rounded-lg border border-border/30 bg-muted/20 p-2.5 text-sm space-y-1"><div className="flex items-center gap-2"><span className="font-medium text-[0.8rem]">{d.project}</span><Badge variant={SPRINT_BADGE[d.sprintGoalStatus]} className="text-[0.6rem]">{d.sprintGoalStatus}</Badge></div><p className="text-muted-foreground/70 text-[0.75rem]">{d.progress}</p>{d.nextSteps && <p className="text-[0.75rem]"><span className="font-medium">Next:</span> {d.nextSteps}</p>}</div>))}</div>}</div>))}</div></CardContent></Card>
          </div>

          <Card><CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">Look Ahead</CardTitle></CardHeader><CardContent><div className="divide-y divide-border/30">{present.map((m) => (<div key={m.userId} className="py-3"><Link href={reportHref(m.userId, weekId)} className="text-[0.8rem] font-medium hover:underline">{m.userName}</Link><ol className="list-decimal list-inside text-[0.8rem] text-muted-foreground/70 space-y-0.5 ml-2 mt-1">{m.report!.lookAhead.priority1 && <li>{m.report!.lookAhead.priority1}</li>}{m.report!.lookAhead.priority2 && <li>{m.report!.lookAhead.priority2}</li>}</ol></div>))}</div></CardContent></Card>
        </>
      )}

      {!generating && summary && (
        <Card className="border-primary/20 ambient-glow">
          <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-[0.85rem]">AI Executive Summary</CardTitle><Button size="xs" variant="ghost" onClick={() => { navigator.clipboard.writeText(summary); toast.success("Copied"); }}><Copy className="h-3 w-3" />Copy</Button></div>{savedPath && <p className="text-[0.7rem] text-muted-foreground/50 mt-1 font-mono">{savedPath}</p>}</CardHeader>
          <CardContent><p className="text-[0.85rem] whitespace-pre-wrap leading-relaxed text-foreground/80">{summary}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
