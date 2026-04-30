import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { isValidWeekId } from "@/lib/week/iso-week";
import { readFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { LinkButton } from "@/components/ui/link-button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { params: Promise<{ userId: string; weekId: string }> };

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

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{weekId}</h1>
          <p className="text-sm text-muted-foreground">{user.name} · {user.email}</p>
        </div>
        <LinkButton href="/admin" variant="ghost" size="sm">← Admin</LinkButton>
      </div>

      <div className="rounded-lg border bg-white p-6 prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
