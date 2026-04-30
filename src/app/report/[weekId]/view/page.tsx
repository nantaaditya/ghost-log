import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users, reports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { isValidWeekId } from "@/lib/week/iso-week";
import { readFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { LinkButton } from "@/components/ui/link-button";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { params: Promise<{ weekId: string }> };

export default async function ViewReportPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const { weekId } = await params;
  if (!isValidWeekId(weekId)) notFound();

  const isAdmin = (session.user as { role: string }).role === "admin";

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user) redirect("/signin");

  const [report] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.userId, user.id), eq(reports.weekId, weekId)))
    .limit(1);

  if (!report) notFound();

  let markdown = "";
  try {
    markdown = await readFile(buildReportPath(user.name, weekId));
  } catch {
    notFound();
  }

  return (
    <PageShell>
      <PageHeader
        title={weekId}
        subtitle={user.name}
        actions={
          <>
            <LinkButton href={`/report/${weekId}`} variant="outline" size="sm"
              className="min-h-11 sm:min-h-0">Edit</LinkButton>
            <LinkButton href="/" variant="ghost" size="sm"
              className="min-h-11 sm:min-h-0">← Dashboard</LinkButton>
          </>
        }
      />

      {markdown.trim() ? (
        <div className="rounded-lg border bg-card p-4 sm:p-6 prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="Report is empty"
            description="This report was submitted but contains no content."
          />
        </div>
      )}
    </PageShell>
  );
}
