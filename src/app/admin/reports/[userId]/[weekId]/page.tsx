import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { isValidWeekId } from "@/lib/week/iso-week";
import { readFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { parseReport } from "@/lib/markdown/parse";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { HEALTH_LABELS } from "@/types/report";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { params: Promise<{ userId: string; weekId: string }> };

const HEALTH_BADGE: Record<string, "default" | "accent" | "destructive"> = {
  "on-track": "default", "at-risk": "accent", "off-track": "destructive",
};

export default async function AdminViewReportPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    redirect("/");
  }

  const { userId, weekId } = await params;
  if (!isValidWeekId(weekId)) notFound();

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) notFound();

  let markdown = "";
  try {
    markdown = await readFile(buildReportPath(user.name, weekId));
  } catch {
    notFound();
  }

  const report = parseReport(markdown);

  return (
    <PageShell maxWidth="3xl">
      <PageHeader
        title={user.name}
        subtitle={`${weekId} · ${user.email}`}
        actions={
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LinkButton href={`/admin/recap?week=${weekId}`} variant="ghost" size="sm">← Recap</LinkButton>
          </div>
        }
      />

      {report && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={HEALTH_BADGE[report.healthIndicator]}>{HEALTH_LABELS[report.healthIndicator]}</Badge>
          {report.escalations.length > 0 && (
            <Badge variant="destructive" className="text-[0.65rem]">{report.escalations.length} escalation{report.escalations.length > 1 ? "s" : ""}</Badge>
          )}
          {report.productionHealth.length > 0 && (
            <Badge variant="accent" className="text-[0.65rem]">{report.productionHealth.length} incident{report.productionHealth.length > 1 ? "s" : ""}</Badge>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border/40 bg-card p-6 sm:p-8 prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </PageShell>
  );
}
