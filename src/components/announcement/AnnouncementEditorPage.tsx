"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LinkButton } from "@/components/ui/link-button";
import AnnouncementForm, { type AnnouncementFormValues } from "./AnnouncementForm";
import AnnouncementCard from "./AnnouncementCard";
import type { Announcement } from "@/lib/db/schema";

type Props = { mode: "create" } | { mode: "edit"; announcement: Announcement };

const EMPTY_VALUES: AnnouncementFormValues = {
  title: "",
  body: "",
  imageData: "",
  imageAlt: "",
  imageDisplayMode: "contain",
  expiresAt: "",
  status: "draft",
};

function toFormValues(a: Announcement): AnnouncementFormValues {
  return {
    title: a.title,
    body: a.body,
    imageData: a.imageData ?? "",
    imageAlt: a.imageAlt ?? "",
    imageDisplayMode: a.imageDisplayMode ?? "contain",
    expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : "",
    status: a.status,
  };
}

export default function AnnouncementEditorPage(props: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<AnnouncementFormValues>(
    props.mode === "edit" ? toFormValues(props.announcement) : EMPTY_VALUES
  );

  async function handleSubmit(values: AnnouncementFormValues) {
    setSubmitting(true);
    try {
      if (props.mode === "create") {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title,
            body: values.body,
            imageData: values.imageData || undefined,
            imageAlt: values.imageAlt || undefined,
            imageDisplayMode: values.imageDisplayMode,
            expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed");

        if (values.status === "published") {
          const patchRes = await fetch(`/api/admin/announcements/${json.data.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "published" }),
          });
          const patchJson = await patchRes.json();
          if (!patchJson.success) throw new Error(patchJson.error ?? "Failed to publish");
        }
        toast.success("Announcement created");
      } else {
        const res = await fetch(`/api/admin/announcements/${props.announcement.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title,
            body: values.body,
            imageData: values.imageData || null,
            imageAlt: values.imageAlt || null,
            imageDisplayMode: values.imageDisplayMode,
            expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
            status: values.status,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed");
        toast.success("Announcement updated");
      }

      router.push("/admin/announcements");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell className="max-w-6xl">
      <PageHeader
        title={props.mode === "create" ? "New Announcement" : "Edit Announcement"}
        subtitle={props.mode === "create" ? "Write and publish an update for the team" : props.announcement.title}
        actions={
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LinkButton href="/admin/announcements" variant="ghost" size="sm">← Announcements</LinkButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <AnnouncementForm
          initialValues={props.mode === "edit" ? toFormValues(props.announcement) : undefined}
          onChange={setPreview}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={props.mode === "create" ? "Create" : "Save changes"}
        />

        <div className="lg:sticky lg:top-6 space-y-2">
          <p className="text-[0.75rem] font-medium text-muted-foreground/60 uppercase tracking-wide">Live Preview</p>
          <AnnouncementCard
            announcement={{
              ...preview,
              publishedAt: props.mode === "edit" ? props.announcement.publishedAt : new Date(),
            }}
          />
          <p className="text-[0.7rem] text-muted-foreground/50">This is how it will appear on the team home page.</p>
        </div>
      </div>
    </PageShell>
  );
}
