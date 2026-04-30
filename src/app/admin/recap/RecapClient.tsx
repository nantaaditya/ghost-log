"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HEALTH_LABELS } from "@/types/report";
import type { MemberRecap } from "./page";

type Props = {
  weekId: string;
  weeks: string[];
  memberRecaps: MemberRecap[];
};

const HEALTH_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  "on-track": "default",
  "at-risk": "secondary",
  "off-track": "destructive",
};

const SPRINT_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  Achieved: "default",
  Ongoing: "secondary",
  Missed: "destructive",
};

function reportHref(userId: string, weekId: string) {
  return `/admin/reports/${userId}/${weekId}`;
}

export default function RecapClient({ weekId, weeks, memberRecaps }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const missing = memberRecaps.filter((m) => m.report === null);
  const present = memberRecaps.filter((m) => m.report !== null);

  const allEscalations = present.flatMap((m) =>
    m.report!.escalations.map((e) => ({ ...e, userId: m.userId, userName: m.userName }))
  );
  const allIncidents = present.flatMap((m) =>
    m.report!.productionHealth.map((inc) => ({ ...inc, userId: m.userId, userName: m.userName }))
  );

  async function handleGenerateSummary() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/recap/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId }),
      });
      const json = await res.json();
      if (json.success) {
        setSummary(json.data.summary);
        setSavedPath(json.data.savedPath ?? null);
        if (json.data.savedToOneDrive) {
          toast.success("Summary saved to OneDrive");
        } else {
          toast.warning("Summary generated but could not save to OneDrive");
        }
      } else {
        toast.error(json.error ?? "Failed to generate summary");
      }
    } catch {
      toast.error("Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="week-select" className="text-sm font-medium">
            Week
          </label>
          <select
            id="week-select"
            value={weekId}
            onChange={(e) => router.push(`?week=${e.target.value}`)}
            className="border rounded px-2 py-1 text-sm bg-background"
          >
            {weeks.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleGenerateSummary}
          disabled={generating || present.length === 0}
          size="sm"
        >
          {generating ? "Generating…" : "Generate AI Summary"}
        </Button>
      </div>

      {/* Missing reporters */}
      {missing.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              Missing Reports ({missing.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {missing.map((m) => (
                <Badge key={m.userId} variant="outline">{m.userName}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {present.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No submitted reports found for {weekId}.
        </p>
      ) : (
        <>
          {/* Team Summaries */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team Summaries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {present.map((m) => {
                  const report = m.report!;
                  const escalationCount = report.escalations.length;
                  const incidentCount = report.productionHealth.length;
                  const deliveryCounts = report.delivery.reduce(
                    (acc, d) => {
                      acc[d.sprintGoalStatus] = (acc[d.sprintGoalStatus] ?? 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  );

                  return (
                    <div key={m.userId} className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link
                            href={reportHref(m.userId, weekId)}
                            className="text-sm font-semibold hover:underline"
                          >
                            {m.userName}
                          </Link>
                          <Badge variant={HEALTH_BADGE[report.healthIndicator]}>
                            {HEALTH_LABELS[report.healthIndicator]}
                          </Badge>
                        </div>
                        <Link
                          href={reportHref(m.userId, weekId)}
                          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                          View Report →
                        </Link>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        {escalationCount > 0 && (
                          <span className="inline-flex items-center gap-1 border rounded px-2 py-0.5 text-destructive border-destructive/30 bg-destructive/5">
                            🚨 {escalationCount} escalation{escalationCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {incidentCount > 0 && (
                          <span className="inline-flex items-center gap-1 border rounded px-2 py-0.5 text-orange-600 border-orange-200 bg-orange-50 dark:text-orange-400 dark:border-orange-900 dark:bg-orange-950/30">
                            📉 {incidentCount} incident{incidentCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {report.delivery.length > 0 && (
                          <span className="inline-flex items-center gap-1 border rounded px-2 py-0.5 text-muted-foreground">
                            🚀{" "}
                            {["Achieved", "Ongoing", "Missed"]
                              .filter((s) => deliveryCounts[s])
                              .map((s) => `${deliveryCounts[s]} ${s}`)
                              .join(" · ")}
                          </span>
                        )}
                      </div>

                      {report.lookAhead.priority1 && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Next:</span>{" "}
                          {report.lookAhead.priority1}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Escalations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Escalations</CardTitle>
            </CardHeader>
            <CardContent>
              {allEscalations.length === 0 ? (
                <p className="text-sm text-muted-foreground">None reported.</p>
              ) : (
                <div className="space-y-4">
                  {allEscalations.map((e, i) => (
                    <div key={i} className="border rounded p-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{e.project}</span>
                        <Link href={reportHref(e.userId, weekId)}>
                          <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer">
                            {e.userName}
                          </Badge>
                        </Link>
                      </div>
                      <p className="text-muted-foreground">{e.topic}</p>
                      <p><span className="font-medium">Problem:</span> {e.problem}</p>
                      <p><span className="font-medium">Impact:</span> {e.impact}</p>
                      <p><span className="font-medium">Ask:</span> {e.ask}</p>
                      {e.jiraLink && (
                        <a
                          href={e.jiraLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline break-all"
                        >
                          {e.jiraLink}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Production Incidents */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Production Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              {allIncidents.length === 0 ? (
                <p className="text-sm text-muted-foreground">None reported.</p>
              ) : (
                <div className="space-y-4">
                  {allIncidents.map((inc, i) => (
                    <div key={i} className="border rounded p-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{inc.project}</span>
                        <Link href={reportHref(inc.userId, weekId)}>
                          <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer">
                            {inc.userName}
                          </Badge>
                        </Link>
                      </div>
                      <p className="text-muted-foreground">{inc.topic}</p>
                      <p><span className="font-medium">Problem:</span> {inc.problem}</p>
                      <p><span className="font-medium">Root cause:</span> {inc.rootCause}</p>
                      <p><span className="font-medium">Next action:</span> {inc.nextAction}</p>
                      {inc.jiraLink && (
                        <a
                          href={inc.jiraLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline break-all"
                        >
                          {inc.jiraLink}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sprint Goals */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sprint Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {present.map((m) => (
                  <div key={m.userId}>
                    <Link
                      href={reportHref(m.userId, weekId)}
                      className="text-sm font-medium hover:underline"
                    >
                      {m.userName}
                    </Link>
                    {m.report!.delivery.length === 0 ? (
                      <p className="text-xs text-muted-foreground ml-2 mt-1">No delivery items.</p>
                    ) : (
                      <div className="space-y-2 ml-2 mt-2">
                        {m.report!.delivery.map((d, i) => (
                          <div key={i} className="border rounded p-2 text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{d.project}</span>
                              <Badge variant={SPRINT_BADGE[d.sprintGoalStatus]} className="text-xs">
                                {d.sprintGoalStatus}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">{d.progress}</p>
                            {d.nextSteps && (
                              <p><span className="font-medium">Next:</span> {d.nextSteps}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Look Ahead */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Look Ahead</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {present.map((m) => (
                  <div key={m.userId} className="py-3">
                    <Link
                      href={reportHref(m.userId, weekId)}
                      className="text-sm font-medium hover:underline"
                    >
                      {m.userName}
                    </Link>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-0.5 ml-2 mt-1">
                      {m.report!.lookAhead.priority1 && (
                        <li>{m.report!.lookAhead.priority1}</li>
                      )}
                      {m.report!.lookAhead.priority2 && (
                        <li>{m.report!.lookAhead.priority2}</li>
                      )}
                    </ol>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* AI Summary */}
      {summary && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">AI Executive Summary</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(summary);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>
            </div>
            {savedPath && (
              <p className="text-xs text-muted-foreground mt-1">
                Saved to OneDrive: <span className="font-mono">{savedPath}</span>
              </p>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
