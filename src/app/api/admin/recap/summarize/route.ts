import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isValidWeekId } from "@/lib/week/iso-week";
import { readFile, writeFile } from "@/lib/graph/files";
import { buildReportPath, buildSummaryPath } from "@/lib/graph/paths";
import { parseReport } from "@/lib/markdown/parse";
import { env } from "@/lib/env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const bodySchema = z.object({ weekId: z.string() });

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !isValidWeekId(parsed.data.weekId)) {
    return Response.json({ success: false, error: "Invalid weekId" }, { status: 400 });
  }

  const { weekId } = parsed.data;

  const submitted = await db
    .select({ userId: reports.userId, userName: users.name })
    .from(reports)
    .innerJoin(users, eq(reports.userId, users.id))
    .where(and(eq(reports.weekId, weekId), eq(reports.status, "submitted")));

  if (submitted.length === 0) {
    return Response.json({ success: false, error: "No submitted reports for this week" }, { status: 404 });
  }

  const settled = await Promise.allSettled(
    submitted.map(async ({ userName }) => {
      const markdown = await readFile(buildReportPath(userName, weekId));
      const report = parseReport(markdown);
      return { userName, markdown, report };
    })
  );

  const members = settled
    .filter((r): r is PromiseFulfilledResult<{ userName: string; markdown: string; report: ReturnType<typeof parseReport> }> =>
      r.status === "fulfilled" && r.value.report !== null
    )
    .map((r) => r.value);

  if (members.length === 0) {
    return Response.json({ success: false, error: "Could not read any reports from OneDrive" }, { status: 502 });
  }

  // Compute metrics
  const healthCounts = { "on-track": 0, "at-risk": 0, "off-track": 0 };
  let escalationCount = 0;
  let incidentCount = 0;
  const sprintCounts = { Achieved: 0, Ongoing: 0, Missed: 0 };

  for (const { report } of members) {
    if (!report) continue;
    healthCounts[report.healthIndicator]++;
    escalationCount += report.escalations.length;
    incidentCount += report.productionHealth.length;
    for (const d of report.delivery) {
      sprintCounts[d.sprintGoalStatus] = (sprintCounts[d.sprintGoalStatus] ?? 0) + 1;
    }
  }

  const submissionRate = `${submitted.length} / ${submitted.length} submitted`;
  const metricsBlock = `## Team Metrics — ${weekId}

| Metric | Value |
|---|---|
| Submitted | ${submissionRate} |
| On Track | ${healthCounts["on-track"]} |
| At Risk | ${healthCounts["at-risk"]} |
| Off Track | ${healthCounts["off-track"]} |
| Escalations | ${escalationCount} |
| Production Incidents | ${incidentCount} |
| Sprint Goals Achieved | ${sprintCounts.Achieved} |
| Sprint Goals Ongoing | ${sprintCounts.Ongoing} |
| Sprint Goals Missed | ${sprintCounts.Missed} |`;

  const combinedReports = members
    .map(({ userName, markdown }) => `=== Report: ${userName} ===\n${markdown}`)
    .join("\n\n");

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent(`You are summarizing weekly engineering reports for a tech lead / engineering manager.

Given the following metrics and individual reports for week ${weekId}, write a concise executive summary (2–3 paragraphs) in English covering:
1. Key escalations and blockers requiring management attention
2. Production incidents and their resolution status
3. Sprint goal outcomes across teams (achieved / ongoing / missed)
4. Top priorities for next week

Be direct and factual. Reference member names where relevant. Skip sections with no notable content.

${metricsBlock}

## Individual Reports
${combinedReports}`);

  const summaryText = result.response.text();

  // Build the markdown file to save
  const now = new Date().toISOString();
  const savedMarkdown = `---
week: ${weekId}
generatedAt: ${now}
submittedCount: ${submitted.length}
---

${metricsBlock}

## Executive Summary

${summaryText}
`;

  // Save to OneDrive — non-blocking failure (don't fail the response if save fails)
  const summaryPath = buildSummaryPath(weekId);
  let savedToOneDrive = false;
  try {
    await writeFile(summaryPath, savedMarkdown);
    savedToOneDrive = true;
  } catch (err) {
    console.error("[summarize] Failed to save summary to OneDrive:", err);
  }

  return Response.json({
    success: true,
    data: { summary: summaryText, savedToOneDrive, savedPath: savedToOneDrive ? summaryPath : null },
  });
}
