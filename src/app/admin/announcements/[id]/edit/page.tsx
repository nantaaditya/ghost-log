import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { findById } from "@/lib/announcement/repository";
import AnnouncementEditorPage from "@/components/announcement/AnnouncementEditorPage";

type Props = { params: Promise<{ id: string }> };

export default async function EditAnnouncementPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    redirect("/");
  }

  const { id } = await params;
  const announcement = await findById(id);
  if (!announcement) notFound();

  return <AnnouncementEditorPage mode="edit" announcement={announcement} />;
}
