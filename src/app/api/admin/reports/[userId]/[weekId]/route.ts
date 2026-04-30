import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isValidWeekId } from "@/lib/week/iso-week";
import { readFile } from "@/lib/graph/files";
import { buildReportPath } from "@/lib/graph/paths";

type Params = { params: Promise<{ userId: string; weekId: string }> };

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { userId, weekId } = await params;
  if (!isValidWeekId(weekId)) {
    return Response.json({ success: false, error: "Invalid weekId" }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    return Response.json({ success: false, error: "User not found" }, { status: 404 });
  }

  try {
    const markdown = await readFile(buildReportPath(user.name, weekId));
    return Response.json({ success: true, data: { markdown, userName: user.name } });
  } catch {
    return Response.json({ success: false, error: "Report not found" }, { status: 404 });
  }
}
