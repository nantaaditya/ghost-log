import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users, reports } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";

type Props = { params: Promise<{ userId: string }> };

export default async function MemberHistoryPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    redirect("/");
  }

  const { userId } = await params;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) notFound();

  const memberReports = await db
    .select({
      id: reports.id,
      weekId: reports.weekId,
      status: reports.status,
      submittedAt: reports.submittedAt,
      updatedAt: reports.updatedAt,
    })
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.updatedAt));

  return (
    <PageShell maxWidth="3xl">
      <PageHeader
        title={user.name}
        subtitle={user.email}
        actions={
          <LinkButton href="/admin" variant="ghost" size="sm">← Admin</LinkButton>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Report History</CardTitle>
            <Badge variant={
              user.status === "active" ? "default" :
              user.status === "pending" ? "secondary" : "outline"
            }>
              {user.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {memberReports.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="No reports yet"
              description="This member hasn't submitted any reports."
            />
          ) : (
            <div className="divide-y">
              {memberReports.map((report) => (
                <div
                  key={report.id}
                  className={`py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-l-2 pl-3 -ml-px ${report.status === "draft" ? "border-amber-400" : "border-transparent"}`}
                >
                  <div>
                    <p className="font-medium text-sm">{report.weekId}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.submittedAt
                        ? `Submitted ${new Date(report.submittedAt).toLocaleDateString()}`
                        : `Updated ${new Date(report.updatedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={report.status === "submitted" ? "default" : "secondary"}>
                      {report.status}
                    </Badge>
                    {report.status === "submitted" && (
                      <LinkButton
                        href={`/admin/reports/${userId}/${report.weekId}`}
                        variant="outline"
                        size="sm"
                        className="min-h-11 sm:min-h-0"
                      >
                        View
                      </LinkButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
