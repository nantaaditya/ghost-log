import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isValidWeekId } from "@/lib/week/iso-week";
import { readFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";
import { env } from "@/lib/env";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

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

  const markdowns = await Promise.allSettled(
    submitted.map(async ({ userName }) => {
      const markdown = await readFile(buildReportPath(userName, weekId));
      return `=== Report: ${userName} ===\n${markdown}`;
    })
  );

  const combinedReports = markdowns
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value)
    .join("\n\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are summarizing weekly engineering reports for a tech lead / engineering manager.

Given the following reports from multiple teams for week ${weekId}, write a concise executive summary (2–3 paragraphs) in English covering:
1. Key escalations and blockers requiring management attention
2. Production incidents and their resolution status
3. Sprint goal outcomes across teams (achieved / ongoing / missed)
4. Top priorities for next week

Be direct and factual. Reference team names where relevant. Skip sections that have no notable content.

---
${combinedReports}`,
      },
    ],
  });

  const summary =
    message.content[0].type === "text" ? message.content[0].text : "";

  return Response.json({ success: true, data: { summary } });
}
