import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { reports } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { getCurrentWeekId } from "@/lib/week/iso-week";
import SignOutButton from "@/components/SignOutButton";
import CommunicationGuide from "@/components/dashboard/CommunicationGuide";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShieldCheck, Plus, Clock, PenLine, CircleCheck } from "lucide-react";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const isAdmin = (session.user as { role: string }).role === "admin";
  const currentWeekId = getCurrentWeekId();
  const userName = session.user.name ?? "User";

  const userReports = await db
    .select()
    .from(reports)
    .where(eq(reports.userId, session.user.id))
    .orderBy(desc(reports.updatedAt))
    .limit(20);

  const currentWeekReport = userReports.find((r) => r.weekId === currentWeekId);
  const pastReports = userReports.filter((r) => r.weekId !== currentWeekId);

  return (
    <PageShell>
      <PageHeader
        title={userName}
        subtitle={currentWeekId}
        leading={
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary-foreground">{initials(userName)}</span>
          </div>
        }
        actions={
          <>
            {isAdmin && (
              <LinkButton href="/admin" variant="secondary" size="sm" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </LinkButton>
            )}
            <SignOutButton />
          </>
        }
      />

      {/* Current week status card */}
      {!currentWeekReport ? (
        <Card className="border-primary/30 bg-primary/5 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-primary">This week's report is due</p>
                <p className="text-sm text-muted-foreground mt-0.5">{currentWeekId} · not started</p>
              </div>
            </div>
            <LinkButton href="/report/new" className="gap-1.5 w-full justify-center sm:w-auto">
              <Plus className="h-4 w-4" />
              New Report
            </LinkButton>
          </CardContent>
        </Card>
      ) : currentWeekReport.status === "draft" ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <PenLine className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">Draft in progress</p>
                <p className="text-sm text-muted-foreground mt-0.5">{currentWeekId} · not submitted</p>
              </div>
            </div>
            <LinkButton href={`/report/${currentWeekId}`} className="w-full justify-center sm:w-auto">
              Continue
            </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CircleCheck className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">Report submitted</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {currentWeekId} · {currentWeekReport.submittedAt?.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <LinkButton href={`/report/${currentWeekId}/view`} variant="outline" size="sm"
                className="min-h-11 flex-1 justify-center sm:min-h-0 sm:flex-none">
                View
              </LinkButton>
              <LinkButton href={`/report/${currentWeekId}`} variant="default" size="sm"
                className="min-h-11 flex-1 justify-center sm:min-h-0 sm:flex-none">
                Re-edit
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past reports */}
      {pastReports.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Past Reports</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {pastReports.map((report) => (
              <div key={report.id}
                className={`py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-l-2 pl-3 -ml-px ${
                  report.status === "draft" ? "border-amber-400" : "border-transparent"
                }`}>
                <div>
                  <p className="font-medium text-sm">{report.weekId}</p>
                  <p className="text-xs text-muted-foreground">
                    {report.submittedAt
                      ? `Submitted ${report.submittedAt.toLocaleDateString()}`
                      : "Draft"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={report.status === "submitted" ? "default" : "secondary"}>
                    {report.status}
                  </Badge>
                  {report.status === "submitted" ? (
                    <>
                      <LinkButton href={`/report/${report.weekId}/view`} variant="outline" size="sm"
                        className="min-h-11 sm:min-h-0">View</LinkButton>
                      <LinkButton href={`/report/${report.weekId}`} variant="ghost" size="sm"
                        className="min-h-11 sm:min-h-0 text-muted-foreground">Re-edit</LinkButton>
                    </>
                  ) : (
                    <LinkButton href={`/report/${report.weekId}`} size="sm"
                      className="min-h-11 sm:min-h-0">Continue</LinkButton>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Guide moved below primary content — reference material, not action */}
      <CommunicationGuide />
    </PageShell>
  );
}
