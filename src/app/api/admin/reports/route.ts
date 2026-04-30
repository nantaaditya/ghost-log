import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const allReports = await db
    .select({
      id: reports.id,
      weekId: reports.weekId,
      status: reports.status,
      submittedAt: reports.submittedAt,
      updatedAt: reports.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(reports)
    .innerJoin(users, eq(reports.userId, users.id))
    .orderBy(desc(reports.updatedAt));

  return Response.json({ success: true, data: allReports });
}
