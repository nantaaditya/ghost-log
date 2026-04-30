"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReportForm from "@/components/report/ReportForm";
import type { ReportData } from "@/types/report";

type Props = {
  reporterName: string;
  weekId: string;
  initial?: Partial<ReportData>;
};

export default function EditReportClient({ reporterName, weekId, initial }: Props) {
  const router = useRouter();

  async function handleSubmit(data: ReportData) {
    const res = await fetch(`/api/reports/${weekId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Failed to submit");
    toast.success("Report updated!");
    router.push("/");
  }

  return (
    <ReportForm
      reporterName={reporterName}
      weekId={weekId}
      initial={initial}
      backHref="/"
      onSubmit={handleSubmit}
    />
  );
}
