import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { listAll } from "@/lib/announcement/repository";
import AnnouncementsClient from "./AnnouncementsClient";

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    redirect("/");
  }

  const announcements = await listAll();

  return <AnnouncementsClient initialAnnouncements={announcements} />;
}
