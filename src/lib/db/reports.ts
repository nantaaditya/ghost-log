import { db } from "@/lib/db/client";
import { reports } from "@/lib/db/schema";

type UpsertSubmittedReportInput = {
  userId: string;
  weekId: string;
  onedrivePath: string;
};

export async function upsertSubmittedReport({
  userId,
  weekId,
  onedrivePath,
}: UpsertSubmittedReportInput): Promise<void> {
  const now = new Date();
  await db
    .insert(reports)
    .values({
      userId,
      weekId,
      onedrivePath,
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [reports.userId, reports.weekId],
      set: { status: "submitted", submittedAt: now, updatedAt: now },
    });
}
