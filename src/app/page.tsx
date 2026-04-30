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
import { ShieldCheck, Plus } from "lucide-react";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
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

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary-foreground">{initials(userName)}</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">{userName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{currentWeekId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <LinkButton href="/admin" variant="secondary" size="sm" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </LinkButton>
          )}
          <SignOutButton />
        </div>
      </div>

      {/* Current week CTA */}
      {!currentWeekReport ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="font-semibold text-primary">This week's report is due</p>
              <p className="text-sm text-muted-foreground mt-0.5">{currentWeekId} · not started</p>
            </div>
            <LinkButton href="/report/new" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Report
            </LinkButton>
          </CardContent>
        </Card>
      ) : currentWeekReport.status === "draft" ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-400">Draft in progress</p>
              <p className="text-sm text-muted-foreground mt-0.5">{currentWeekId} · not submitted</p>
            </div>
            <LinkButton href={`/report/${currentWeekId}`}>Continue</LinkButton>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="font-semibold text-green-700 dark:text-green-400">Report submitted</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {currentWeekId} · {currentWeekReport.submittedAt?.toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LinkButton href={`/report/${currentWeekId}/view`} variant="outline" size="sm">View</LinkButton>
              <LinkButton href={`/report/${currentWeekId}`} variant="ghost" size="sm" className="text-muted-foreground">Re-edit</LinkButton>
            </div>
          </CardContent>
        </Card>
      )}

      <CommunicationGuide />

      {/* Past reports (excluding current week — already shown above) */}
      {userReports.filter((r) => r.weekId !== currentWeekId).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Past Reports</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {userReports
              .filter((r) => r.weekId !== currentWeekId)
              .map((report) => (
                <div key={report.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{report.weekId}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.submittedAt
                        ? `Submitted ${report.submittedAt.toLocaleDateString()}`
                        : "Draft"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={report.status === "submitted" ? "default" : "secondary"}>
                      {report.status}
                    </Badge>
                    {report.status === "submitted" ? (
                      <>
                        <LinkButton href={`/report/${report.weekId}/view`} variant="outline" size="sm">View</LinkButton>
                        <LinkButton href={`/report/${report.weekId}`} variant="ghost" size="sm" className="text-muted-foreground">Re-edit</LinkButton>
                      </>
                    ) : (
                      <LinkButton href={`/report/${report.weekId}`} size="sm">Continue</LinkButton>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
