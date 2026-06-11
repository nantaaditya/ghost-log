import { Suspense } from "react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users, onedriveCredentials, reports } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { eq, desc, gte } from "drizzle-orm";
import AdminClient from "./AdminClient";
import TeamDashboard from "@/components/admin/TeamDashboard";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ onedrive?: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    redirect("/");
  }

  const { onedrive } = await searchParams;

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const [allUsers, recentReports, creds] = await Promise.all([
    db.select().from(users).orderBy(users.createdAt),
    db
      .select({
        id: reports.id,
        weekId: reports.weekId,
        status: reports.status,
        submittedAt: reports.submittedAt,
        updatedAt: reports.updatedAt,
        userId: reports.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(reports)
      .innerJoin(users, eq(reports.userId, users.id))
      .where(gte(reports.updatedAt, oneMonthAgo))
      .orderBy(desc(reports.updatedAt)),
    db
      .select({ id: onedriveCredentials.id, expiresAt: onedriveCredentials.expiresAt })
      .from(onedriveCredentials)
      .where(eq(onedriveCredentials.id, "singleton"))
      .limit(1),
  ]);

  const onedriveConnected = !!creds[0] && creds[0].expiresAt > new Date();

  return (
    <>
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto px-6 pt-6 space-y-4">
            <div className="h-44 rounded-xl bg-muted animate-pulse" />
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
          </div>
        }
      >
        <TeamDashboard />
      </Suspense>
      <AdminClient
        users={allUsers}
        recentReports={recentReports}
        onedriveConnected={onedriveConnected}
        onedriveStatus={onedrive}
      />
    </>
  );
}
