"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { FileText, Sparkles, Copy, TrendingUp, AlertTriangle, ShieldAlert, CheckCircle2, Users, ArrowRight } from "lucide-react";
import { HEALTH_LABELS } from "@/types/report";
import HealthTrendChart from "@/components/admin/HealthTrendChart";
import type { WeekHealthTrend } from "@/lib/db/health-trend";
import type { MemberRecap } from "./page";

type Props = { weekId: string; weeks: string[]; memberRecaps: MemberRecap[]; trend: WeekHealthTrend[] };

const HEALTH_BADGE: Record<string, "default" | "accent" | "destructive"> = {
  "on-track": "default", "at-risk": "accent", "off-track": "destructive",
};
const HEALTH_DOT: Record<string, string> = {
  "on-track": "bg-primary", "at-risk": "bg-accent", "off-track": "bg-destructive",
};
const HEALTH_RANK: Record<string, number> = { "off-track": 0, "at-risk": 1, "on-track": 2 };

function reportHref(userId: string, weekId: string) { return `/admin/reports/${userId}/${weekId}`; }

export default function RecapClient({ weekId, weeks, memberRecaps, trend }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const missing = memberRecaps.filter((m) => m.report === null);
  const present = memberRecaps.filter((m) => m.report !== null);
  const sortedPresent = [...present].sort((a, b) => {
    const rankDiff = HEALTH_RANK[a.report!.healthIndicator] - HEALTH_RANK[b.report!.healthIndicator];
    return rankDiff !== 0 ? rankDiff : a.userName.localeCompare(b.userName);
  });
  const allEscalations = present.flatMap((m) => m.report!.escalations.map((e) => ({ ...e, userId: m.userId, userName: m.userName })));

  const healthCounts = { "on-track": 0, "at-risk": 0, "off-track": 0 };
  for (const { report } of present) healthCounts[report!.healthIndicator]++;
  const total = memberRecaps.length;
  const submissionRate = total > 0 ? Math.round((present.length / total) * 100) : 0;
  const offTrackMembers = present.filter((m) => m.report!.healthIndicator === "off-track");
  const needsAttention = offTrackMembers.length > 0 || missing.length > 0 || allEscalations.length > 0;

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

      {/* ===== NEEDS YOUR ATTENTION ===== */}
      {needsAttention && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /><CardTitle className="text-[0.85rem]">Needs Your Attention</CardTitle></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {offTrackMembers.length > 0 && (
              <div className="flex items-start gap-2.5">
                <span className="size-2 rounded-full bg-destructive shrink-0 mt-1.5" />
                <p className="text-[0.8rem]"><span className="font-medium">{offTrackMembers.map((m) => m.userName).join(", ")}</span>{" "}{offTrackMembers.length === 1 ? "is" : "are"} reporting off-track this week.</p>
              </div>
            )}
            {missing.length > 0 && (
              <div className="flex items-start gap-2.5">
                <span className="size-2 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
                <p className="text-[0.8rem]"><span className="font-medium">{missing.length} member{missing.length > 1 ? "s" : ""}</span> haven&apos;t submitted: {missing.map((m) => m.userName).join(", ")}</p>
              </div>
            )}
            {allEscalations.length > 0 && (
              <div className="space-y-1">
                <p className="text-[0.7rem] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1.5">Escalations ({allEscalations.length})</p>
                {allEscalations.map((e, i) => (
                  <Link key={i} href={reportHref(e.userId, weekId)} className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/40 transition-colors">
                    <span className="text-[0.7rem] font-medium text-muted-foreground/60 shrink-0 pt-0.5 w-16 truncate">{e.userName}</span>
                    <span className="text-[0.8rem] flex-1 min-w-0 truncate"><span className="font-medium">{e.project}:</span> {e.ask}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground shrink-0 mt-0.5 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== 8-WEEK TREND ===== */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-[0.85rem]">8-Week Trend</CardTitle></CardHeader>
        <CardContent><HealthTrendChart weeks={trend} variant="full" /></CardContent>
      </Card>

      {generating && <Card><CardContent className="p-6 space-y-3"><div className="skeleton h-4 w-1/3" /><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-5/6" /></CardContent></Card>}

      {/* ===== TEAM STATUS — click any row for the full report ===== */}
      {present.length === 0 ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} title="No reports for this week" description={`No submitted reports found for ${weekId}.`} />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground/60" />
              <CardTitle className="text-[0.85rem]">Team Status</CardTitle>
              <span className="text-[0.7rem] text-muted-foreground/50 ml-auto">{present.length} submitted</span>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border/30 pt-0 px-0 pb-0">
            {sortedPresent.map((m) => {
              const report = m.report!;
              const escalationCount = report.escalations.length;
              const incidentCount = report.productionHealth.length;
              return (
                <Link key={m.userId} href={reportHref(m.userId, weekId)} className="group flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                  <span className={`size-2 rounded-full shrink-0 ${HEALTH_DOT[report.healthIndicator]}`} />
                  <span className="text-[0.85rem] font-medium w-24 sm:w-32 shrink-0 truncate">{m.userName}</span>
                  <Badge variant={HEALTH_BADGE[report.healthIndicator]} className="shrink-0 hidden sm:inline-flex text-[0.6rem]">{HEALTH_LABELS[report.healthIndicator]}</Badge>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {escalationCount > 0 && <Badge variant="destructive" className="text-[0.6rem]">{escalationCount} esc</Badge>}
                    {incidentCount > 0 && <Badge variant="accent" className="text-[0.6rem]">{incidentCount} inc</Badge>}
                  </div>
                  <span className="text-[0.75rem] text-muted-foreground/60 flex-1 min-w-0 truncate hidden md:block">{report.lookAhead.priority1 || "—"}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground shrink-0 transition-colors" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
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
