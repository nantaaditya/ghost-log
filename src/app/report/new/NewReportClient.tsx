"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReportForm from "@/components/report/ReportForm";
import type { ReportData } from "@/types/report";

export default function NewReportClient({ reporterName }: { reporterName: string }) {
  const router = useRouter();

  async function handleSubmit(data: ReportData) {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportData: data }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Failed to submit");
    toast.success("Report submitted!");
    router.push("/");
  }

  return <ReportForm reporterName={reporterName} backHref="/" onSubmit={handleSubmit} />;
}
