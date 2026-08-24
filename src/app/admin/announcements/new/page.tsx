import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import AnnouncementEditorPage from "@/components/announcement/AnnouncementEditorPage";

export default async function NewAnnouncementPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    redirect("/");
  }

  return <AnnouncementEditorPage mode="create" />;
}
