"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import AnnouncementForm, { type AnnouncementFormValues } from "@/components/announcement/AnnouncementForm";
import { toast } from "sonner";
import type { Announcement } from "@/lib/db/schema";

type Props = {
  initialAnnouncements: Announcement[];
};

function statusBadge(status: string) {
  return status === "published" ? (
    <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800">
      Published
    </Badge>
  ) : (
    <Badge variant="secondary">Draft</Badge>
  );
}

function formatDate(d: Date | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toFormValues(a: Announcement): AnnouncementFormValues {
  return {
    title: a.title,
    body: a.body,
    imageData: a.imageData ?? "",
    imageAlt: a.imageAlt ?? "",
    expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : "",
    status: a.status,
  };
}

export default function AnnouncementsClient({ initialAnnouncements }: Props) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleCreate(values: AnnouncementFormValues) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          body: values.body,
          imageData: values.imageData || undefined,
          imageAlt: values.imageAlt || undefined,
          expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed");

      let created = json.data as Announcement;

      if (values.status === "published") {
        const patchRes = await fetch(`/api/admin/announcements/${created.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        });
        const patchJson = await patchRes.json();
        if (patchJson.success) created = patchJson.data as Announcement;
      }

      setAnnouncements((prev) => [created, ...prev]);
      setCreateOpen(false);
      toast.success("Announcement created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create announcement");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(values: AnnouncementFormValues) {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/announcements/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          body: values.body,
          imageData: values.imageData || null,
          imageAlt: values.imageAlt || null,
          expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
          status: values.status,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed");

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === editTarget.id ? (json.data as Announcement) : a))
      );
      setEditTarget(null);
      toast.success("Announcement updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update announcement");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePublish(a: Announcement) {
    const newStatus = a.status === "published" ? "draft" : "published";
    setTogglingId(a.id);
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed");

      setAnnouncements((prev) =>
        prev.map((item) => (item.id === a.id ? (json.data as Announcement) : item))
      );
      toast.success(newStatus === "published" ? "Announcement published" : "Moved to draft");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/announcements/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed");

      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Announcement deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        title="Announcements"
        subtitle="Post announcements visible to all members"
        actions={
          <>
            <LinkButton href="/admin" variant="ghost" size="sm">← Admin Panel</LinkButton>
            <Button size="sm" onClick={() => setCreateOpen(true)}>+ New Announcement</Button>
          </>
        }
      />

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No announcements yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base leading-snug">{a.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {statusBadge(a.status)}
                      {a.publishedAt && (
                        <span>Published {formatDate(a.publishedAt)}</span>
                      )}
                      {a.expiresAt && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Expires {formatDate(a.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  {a.imageData && (
                    <img
                      src={a.imageData}
                      alt={a.imageAlt ?? a.title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{a.body}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditTarget(a)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={a.status === "published" ? "outline" : "default"}
                    disabled={togglingId === a.id}
                    onClick={() => handleTogglePublish(a)}
                  >
                    {togglingId === a.id
                      ? "Updating…"
                      : a.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(a)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <AnnouncementForm
            onSubmit={handleCreate}
            submitting={submitting}
            submitLabel="Create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <AnnouncementForm
              key={editTarget.id}
              initialValues={toFormValues(editTarget)}
              onSubmit={handleEdit}
              submitting={submitting}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This cannot be undone.
          </p>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              disabled={deletingId === deleteTarget?.id}
              onClick={handleDelete}
            >
              {deletingId ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
