import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { reports } from "@/lib/db/schema";
import { eq, desc, ne, and, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { getCurrentWeekId, getRecentPastWeekIds, groupWeekIdsByMonth } from "@/lib/week/iso-week";
import SignOutButton from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import CommunicationGuide from "@/components/dashboard/CommunicationGuide";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  ShieldCheck, Plus, Clock, PenLine, CircleCheck, Users,
  FileText, ArrowRight, ChevronRight,
} from "lucide-react";
import AnnouncementBanner from "@/components/announcement/AnnouncementBanner";
import { listPublished } from "@/lib/announcement/repository";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const isAdmin = (session.user as { role: string }).role === "admin";
  const currentWeekId = getCurrentWeekId();
  const userName = session.user.name ?? "User";

  const now = new Date();
  const recentWeekIds = getRecentPastWeekIds(8, now);
  const [userReports, teamPastRaw, publishedAnnouncements, recentUserReports] = await Promise.all([
    db
      .select()
      .from(reports)
      .where(eq(reports.userId, session.user.id))
      .orderBy(desc(reports.updatedAt))
      .limit(20),
    db
      .select({ weekId: reports.weekId })
      .from(reports)
      .where(and(eq(reports.status, "submitted"), ne(reports.weekId, currentWeekId)))
      .orderBy(desc(reports.submittedAt)),
    listPublished(now),
    db
      .select({ weekId: reports.weekId })
      .from(reports)
      .where(and(eq(reports.userId, session.user.id), inArray(reports.weekId, recentWeekIds))),
  ]);

  const currentWeekReport = userReports.find((r) => r.weekId === currentWeekId);
  const pastReports = userReports.filter((r) => r.weekId !== currentWeekId);

  const reportedRecentWeekIds = new Set(recentUserReports.map((r) => r.weekId));
  const skippedWeeks = recentWeekIds.filter((weekId) => !reportedRecentWeekIds.has(weekId));

  const weekCountMap = new Map<string, number>();
  for (const r of teamPastRaw) {
    weekCountMap.set(r.weekId, (weekCountMap.get(r.weekId) ?? 0) + 1);
  }
  const teamPastWeeks = Array.from(weekCountMap.entries()).map(([weekId, count]) => ({ weekId, count }));
  const teamPastWeekGroups = groupWeekIdsByMonth(teamPastWeeks);

  return (
    <PageShell maxWidth="4xl">
      {/* Header */}
      <PageHeader
        title={userName}
        subtitle={`Week ${currentWeekId}`}
        leading={
          <div className="h-9 w-9 rounded-full bg-muted/60 ring-1 ring-border/40 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-foreground/60">{initials(userName)}</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {isAdmin && (
              <LinkButton href="/admin" variant="ghost" size="sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </LinkButton>
            )}
            <SignOutButton />
          </div>
        }
      />

      {/* Announcements */}
      <AnnouncementBanner
        announcements={publishedAnnouncements}
        currentUserId={session.user.id}
        isAdmin={isAdmin}
      />

      {/* ============================================
          MAIN LAYOUT: 2 cols on desktop
          LEFT (2/3): Status → Guide (full width)
          RIGHT (1/3): Your Reports → Team Activity
          ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === LEFT COLUMN (spans 2) === */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status Card */}
          {!currentWeekReport ? (
            <Card className="border-accent/20 ambient-glow overflow-hidden">
              <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-[1rem]">This week&apos;s report</p>
                    <p className="text-[0.8rem] text-muted-foreground mt-0.5">
                      {currentWeekId} — not started yet
                    </p>
                  </div>
                </div>
                <LinkButton href="/report/new" variant="accent" size="lg" className="w-full sm:w-auto gap-2">
                  <Plus className="h-4 w-4" />
                  Write Report
                </LinkButton>
              </CardContent>
            </Card>
          ) : currentWeekReport.status === "draft" ? (
            <Card className="border-amber-500/10 overflow-hidden">
              <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0">
                    <PenLine className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-[1rem]">Draft in progress</p>
                    <p className="text-[0.8rem] text-muted-foreground mt-0.5">
                      {currentWeekId} — not yet submitted
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <LinkButton href={`/report/${currentWeekId}/view`} variant="ghost" size="lg"
                    className="w-full sm:w-auto">Preview</LinkButton>
                  <LinkButton href={`/report/${currentWeekId}`} variant="default" size="lg"
                    className="w-full sm:w-auto">Continue Editing</LinkButton>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-accent/10 overflow-hidden">
              <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center shrink-0">
                    <CircleCheck className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-[1rem]">Report submitted</p>
                    <p className="text-[0.8rem] text-muted-foreground mt-0.5">
                      {currentWeekId} · {currentWeekReport.submittedAt?.toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <LinkButton href={`/report/${currentWeekId}/view`} variant="ghost" size="lg"
                    className="w-full sm:w-auto">View</LinkButton>
                  <LinkButton href={`/report/${currentWeekId}`} variant="secondary" size="lg"
                    className="w-full sm:w-auto">Re-edit</LinkButton>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Writing Guide — full width under status */}
          <CommunicationGuide />

          {/* Skipped weeks */}
          {skippedWeeks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[0.85rem]">Skipped Weeks</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border/30 pt-0 px-0 pb-0">
                {skippedWeeks.map((weekId) => (
                  <div key={weekId} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="size-2 rounded-full bg-muted-foreground/30 shrink-0" />
                      <p className="font-medium text-[0.85rem]">{weekId}</p>
                    </div>
                    <LinkButton href={`/report/${weekId}`} variant="ghost" size="xs">
                      Backfill
                      <ArrowRight className="h-3 w-3" />
                    </LinkButton>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* === RIGHT COLUMN === */}
        <div className="space-y-5">
          {/* Past reports */}
          {pastReports.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground/60" />
                  <CardTitle>Your Reports</CardTitle>
                  <span className="text-[0.7rem] text-muted-foreground/50 ml-auto">
                    {pastReports.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-border/30 pt-0 px-0 pb-0">
                {pastReports.slice(0, 8).map((report) => (
                  <div
                    key={report.id}
                    className="group px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`size-2 rounded-full shrink-0 ${
                        report.status === "submitted" ? "bg-accent" : "bg-amber-400"
                      }`} />
                      <div className="min-w-0">
                        <p className="font-medium text-[0.85rem] truncate">{report.weekId}</p>
                        <p className="text-[0.7rem] text-muted-foreground/60">
                          {report.submittedAt
                            ? report.submittedAt.toLocaleDateString("en-US", {
                                month: "short", day: "numeric",
                              })
                            : "Draft"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {report.status === "submitted" ? (
                        <>
                          <LinkButton href={`/report/${report.weekId}/view`} variant="ghost" size="xs">View</LinkButton>
                          <LinkButton href={`/report/${report.weekId}`} variant="ghost" size="xs"
                            className="text-muted-foreground">Edit</LinkButton>
                        </>
                      ) : (
                        <LinkButton href={`/report/${report.weekId}`} variant="ghost" size="xs">
                          Continue <ChevronRight className="h-3 w-3" />
                        </LinkButton>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Team activity */}
          {teamPastWeeks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground/60" />
                  <CardTitle>Team Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {teamPastWeekGroups.slice(0, 2).map((group) => (
                  <div key={group.monthLabel}>
                    <p className="text-[0.65rem] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-1.5">
                      {group.monthLabel}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.slice(0, 4).map(({ weekId, count }) => (
                        <LinkButton
                          key={weekId}
                          href={`/team/${weekId}`}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between group font-normal"
                        >
                          <span className="text-[0.8rem]">{weekId}</span>
                          <span className="text-[0.7rem] text-muted-foreground/60">
                            {count} {count === 1 ? "report" : "reports"}
                          </span>
                        </LinkButton>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
