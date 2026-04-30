import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users, reports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { isValidWeekId } from "@/lib/week/iso-week";
import { readFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { LinkButton } from "@/components/ui/link-button";
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
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{weekId}</h1>
          <p className="text-sm text-muted-foreground">{user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <LinkButton href={`/report/${weekId}`} variant="outline" size="sm">
            Edit
          </LinkButton>
          <LinkButton href="/" variant="ghost" size="sm">
            ← Dashboard
          </LinkButton>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
