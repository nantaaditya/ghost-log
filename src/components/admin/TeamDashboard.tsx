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
import { HEALTH_LABELS } from "@/types/report";
import type { ReportData } from "@/types/report";

type ParsedMember = { userId: string; userName: string; report: ReportData };

export default async function TeamDashboard() {
  const weekId = getCurrentWeekId();

  const [activeMembers, submitted] = await Promise.all([
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.role, "member"), eq(users.status, "active"))),
    db
      .select({ userId: reports.userId, userName: users.name })
      .from(reports)
      .innerJoin(users, eq(reports.userId, users.id))
      .where(and(eq(reports.weekId, weekId), eq(reports.status, "submitted"))),
  ]);

  const settled = await Promise.allSettled(
    submitted.map(async ({ userId, userName }) => {
      const markdown = await readFile(buildReportPath(userName, weekId));
      const report = parseReport(markdown);
      return { userId, userName, report };
    })
  );

  const present: ParsedMember[] = settled
    .filter(
      (r): r is PromiseFulfilledResult<{ userId: string; userName: string; report: ReportData }> =>
        r.status === "fulfilled" && r.value.report !== null
    )
    .map((r) => r.value);

  const submittedIds = new Set(submitted.map((s) => s.userId));
  const missing = activeMembers.filter((m) => !submittedIds.has(m.id));

  const healthCounts: Record<"on-track" | "at-risk" | "off-track", number> = {
    "on-track": 0,
    "at-risk": 0,
    "off-track": 0,
  };
  for (const { report } of present) {
    healthCounts[report.healthIndicator]++;
  }

  const allEscalations = present.flatMap(({ userName, report }) =>
    report.escalations.map((e) => ({ ...e, userName }))
  );

  const total = activeMembers.length;
  const submissionRate = total > 0 ? Math.round((submitted.length / total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 pt-6 space-y-4">
      {/* Submission + health overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">This Week — {weekId}</CardTitle>
            <LinkButton href={`/admin/recap?week=${weekId}`} variant="ghost" size="sm">
              Full Recap →
            </LinkButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground shrink-0">
              {submitted.length} / {total} submitted
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${submissionRate}%` }}
              />
            </div>
            <span className="text-sm font-medium shrink-0">{submissionRate}%</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["on-track", "at-risk", "off-track"] as const).map((h) => (
              <div key={h} className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{healthCounts[h]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{HEALTH_LABELS[h]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Required */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">🚨 Action Required</CardTitle>
            {allEscalations.length > 0 && (
              <Badge variant="destructive" className="text-xs">{allEscalations.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {allEscalations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No escalations this week.</p>
          ) : (
            <div className="space-y-3">
              {allEscalations.map((e, i) => (
                <div key={i} className="border rounded-lg p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.project}</span>
                    <Badge variant="outline" className="text-xs">{e.userName}</Badge>
                  </div>
                  <p className="text-muted-foreground">{e.topic}</p>
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
                <Badge key={m.id} variant="outline">{m.name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
