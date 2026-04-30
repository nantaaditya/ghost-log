import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    redirect("/");
  }

  const adminId = (session.user as { id: string }).id;

  const [admin] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  if (!admin) redirect("/");

  return <SettingsClient name={admin.name} email={admin.email} />;
}
