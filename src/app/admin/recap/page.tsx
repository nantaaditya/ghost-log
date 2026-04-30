import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { isValidWeekId, getCurrentWeekId } from "@/lib/week/iso-week";
import { readFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { parseReport } from "@/lib/markdown/parse";
import { LinkButton } from "@/components/ui/link-button";
import RecapClient from "./RecapClient";
import type { ReportData } from "@/types/report";

type Props = { searchParams: Promise<{ week?: string }> };

export type MemberRecap = {
  userId: string;
  userName: string;
  report: ReportData | null;
};

export default async function RecapPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    redirect("/");
  }

  const { week } = await searchParams;
  const weekId = week && isValidWeekId(week) ? week : getCurrentWeekId();

  // Distinct weeks that have at least one submitted report (for the selector)
  const availableWeeks = await db
    .selectDistinct({ weekId: reports.weekId })
    .from(reports)
    .where(eq(reports.status, "submitted"))
    .orderBy(desc(reports.weekId))
    .limit(20);

  const submitted = await db
    .select({ userId: reports.userId, userName: users.name })
    .from(reports)
    .innerJoin(users, eq(reports.userId, users.id))
    .where(and(eq(reports.weekId, weekId), eq(reports.status, "submitted")));

  const memberRecaps: MemberRecap[] = await Promise.all(
    submitted.map(async ({ userId, userName }) => {
      try {
        const markdown = await readFile(buildReportPath(userName, weekId));
        return { userId, userName, report: parseReport(markdown) };
      } catch {
        return { userId, userName, report: null };
      }
    })
  );

  const weeks = availableWeeks.map((r) => r.weekId);
  if (!weeks.includes(weekId)) weeks.unshift(weekId);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Weekly Recap</h1>
          <p className="text-sm text-muted-foreground">{weekId}</p>
        </div>
        <LinkButton href="/admin" variant="ghost" size="sm">← Admin</LinkButton>
      </div>

      <RecapClient
        weekId={weekId}
        weeks={weeks}
        memberRecaps={memberRecaps}
      />
    </div>
  );
}
