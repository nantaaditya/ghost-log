import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { isValidWeekId } from "@/lib/week/iso-week";
import { readFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { parseReport } from "@/lib/markdown/parse";
import EditReportClient from "./EditReportClient";

type Props = { params: Promise<{ weekId: string }> };

export default async function EditReportPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const { weekId } = await params;
  if (!isValidWeekId(weekId)) redirect("/");

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) redirect("/signin");

  let initial = undefined;
  try {
    const path = buildReportPath(user.name, weekId);
    const markdown = await readFile(path);
    initial = parseReport(markdown) ?? undefined;
  } catch {
    // File doesn't exist yet — new report for this week
  }

  return (
    <EditReportClient reporterName={user.name} weekId={weekId} initial={initial} />
  );
}
