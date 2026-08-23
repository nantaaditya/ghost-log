import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { upsertSubmittedReport } from "@/lib/db/reports";
import { readFile, writeFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { parseReport } from "@/lib/markdown/parse";
import { serializeReport } from "@/lib/markdown/serialize";
import { isValidWeekId } from "@/lib/week/iso-week";
import { eq } from "drizzle-orm";
import type { ReportData } from "@/types/report";

type Params = { params: Promise<{ weekId: string }> };

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { weekId } = await params;
  if (!isValidWeekId(weekId)) {
    return Response.json({ success: false, error: "Invalid weekId" }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return Response.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const onedrivePath = buildReportPath(user.name, weekId);
  try {
    const markdown = await readFile(onedrivePath);
    const reportData = parseReport(markdown);
    return Response.json({ success: true, data: reportData });
  } catch {
    return Response.json({ success: false, error: "Report not found" }, { status: 404 });
  }
}

export async function PUT(req: Request, { params }: Params): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { weekId } = await params;
  if (!isValidWeekId(weekId)) {
    return Response.json({ success: false, error: "Invalid weekId" }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return Response.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const reportData: ReportData = { ...body, weekId, reporterName: user.name };

  const onedrivePath = buildReportPath(user.name, weekId);
  const markdown = serializeReport(reportData);
  await writeFile(onedrivePath, markdown);
  await upsertSubmittedReport({
    userId: user.id,
    weekId,
    onedrivePath,
    healthIndicator: reportData.healthIndicator,
    escalationCount: reportData.escalations.length,
    incidentCount: reportData.productionHealth.length,
  });

  return Response.json({ success: true, data: { weekId } });
}
