import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import NewReportClient from "./NewReportClient";

export default async function NewReportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  return <NewReportClient reporterName={session.user.name ?? ""} />;
}
