import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import { upsertSubmittedReport } from "@/lib/db/reports";
import { writeFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { serializeReport } from "@/lib/markdown/serialize";
import { getCurrentWeekId, isValidWeekId } from "@/lib/week/iso-week";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { ReportData } from "@/types/report";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const userReports = await db
    .select()
    .from(reports)
    .where(eq(reports.userId, session.user.id))
    .orderBy(desc(reports.updatedAt));

  return Response.json({ success: true, data: userReports });
}

const reportSchema = z.object({
  weekId: z.string().optional(),
  reportData: z.custom<ReportData>(),
});

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const weekId = parsed.data.weekId ?? getCurrentWeekId();
  if (!isValidWeekId(weekId)) {
    return Response.json({ success: false, error: "Invalid weekId" }, { status: 400 });
  }
  const reportData: ReportData = { ...parsed.data.reportData, weekId };

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return Response.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const onedrivePath = buildReportPath(user.name, weekId);
  const markdown = serializeReport({ ...reportData, reporterName: user.name });

  await writeFile(onedrivePath, markdown);
  await upsertSubmittedReport({
    userId: user.id,
    weekId,
    onedrivePath,
    healthIndicator: reportData.healthIndicator,
    escalationCount: reportData.escalations.length,
    incidentCount: reportData.productionHealth.length,
  });

  return Response.json({ success: true, data: { weekId, onedrivePath } });
}
