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

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const isAdmin = (session.user as { role: string }).role === "admin";
  const currentWeekId = getCurrentWeekId();

  const userReports = await db
    .select()
    .from(reports)
    .where(eq(reports.userId, session.user.id))
    .orderBy(desc(reports.updatedAt))
    .limit(20);

  const hasCurrentWeek = userReports.some((r) => r.weekId === currentWeekId);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Weekly Reports</h1>
          <p className="text-sm text-muted-foreground">
            {session.user.name} · {currentWeekId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <LinkButton href="/admin" variant="outline" size="sm">Admin</LinkButton>
          )}
          <SignOutButton />
        </div>
      </div>

      <CommunicationGuide />

      {!hasCurrentWeek && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">No report this week</p>
              <p className="text-sm text-muted-foreground">{currentWeekId} · not submitted</p>
            </div>
            <LinkButton href="/report/new">New Report</LinkButton>
          </CardContent>
        </Card>
      )}

      {userReports.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Past Reports</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {userReports.map((report) => (
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
                  {report.status === "submitted" && (
                    <LinkButton href={`/report/${report.weekId}/view`} variant="ghost" size="sm">View</LinkButton>
                  )}
                  <LinkButton href={`/report/${report.weekId}`} variant="ghost" size="sm">Edit</LinkButton>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
