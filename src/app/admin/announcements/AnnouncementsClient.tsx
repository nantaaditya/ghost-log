"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Megaphone, Plus, Pencil, Eye, EyeOff, Trash2 } from "lucide-react";
import type { Announcement } from "@/lib/db/schema";

type Props = { initialAnnouncements: Announcement[] };

function formatDate(d: Date | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AnnouncementsClient({ initialAnnouncements }: Props) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleTogglePublish(a: Announcement) {
    const newStatus = a.status === "published" ? "draft" : "published"; setTogglingId(a.id);
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed");
      setAnnouncements((prev) => prev.map((item) => (item.id === a.id ? (json.data as Announcement) : item)));
      toast.success(newStatus === "published" ? "Published" : "Moved to draft");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setTogglingId(null); }
  }

  async function handleDelete() {
    if (!deleteTarget) return; setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/announcements/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed");
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null); toast.success("Announcement deleted");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setDeletingId(null); }
  }

  return (
    <PageShell maxWidth="4xl">
      <PageHeader title="Announcements" subtitle={`${announcements.length} total`}
        actions={<div className="flex items-center gap-1"><ThemeToggle /><LinkButton href="/admin" variant="ghost" size="sm">← Admin</LinkButton><LinkButton href="/admin/announcements/new" size="sm"><Plus className="h-3.5 w-3.5" />New</LinkButton></div>} />

      {announcements.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><Megaphone className="h-8 w-8 mx-auto text-muted-foreground/20 mb-3" /><p className="text-[0.85rem] text-muted-foreground/50">No announcements yet</p><LinkButton href="/admin/announcements/new" variant="ghost" size="sm" className="mt-3"><Plus className="h-3.5 w-3.5" />Create your first</LinkButton></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <CardTitle className="text-[0.9rem] leading-snug">{a.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground/60">
                      <Badge variant={a.status === "published" ? "default" : "secondary"} className="text-[0.6rem]">{a.status}</Badge>
                      {a.publishedAt && <span>Published {formatDate(a.publishedAt)}</span>}
                      {a.expiresAt && <span className="text-amber-400/70">Expires {formatDate(a.expiresAt)}</span>}
                    </div>
                  </div>
                  {a.imageData && (
                    <div className={`w-14 h-14 rounded-xl shrink-0 ring-1 ring-border/30 overflow-hidden ${a.imageDisplayMode === "cover" ? "" : "bg-muted/40"}`}>
                      <img src={a.imageData} alt={a.imageAlt ?? a.title} className={`w-full h-full ${a.imageDisplayMode === "cover" ? "object-cover" : "object-contain"}`} />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[0.8rem] text-muted-foreground/70 line-clamp-2 leading-relaxed">{a.body}</p>
                <div className="flex flex-wrap gap-1.5">
                  <LinkButton href={`/admin/announcements/${a.id}/edit`} size="xs" variant="ghost"><Pencil className="h-3 w-3" />Edit</LinkButton>
                  <Button size="xs" variant="ghost" loading={togglingId === a.id} onClick={() => handleTogglePublish(a)}>
                    {a.status === "published" ? <><EyeOff className="h-3 w-3" />Unpublish</> : <><Eye className="h-3 w-3" />Publish</>}
                  </Button>
                  <Button size="xs" variant="ghost" className="text-destructive/60 hover:text-destructive" onClick={() => setDeleteTarget(a)}><Trash2 className="h-3 w-3" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Delete Announcement</DialogTitle></DialogHeader><p className="text-[0.85rem] text-muted-foreground/70">Delete &ldquo;{deleteTarget?.title}&rdquo;? This cannot be undone.</p><DialogFooter showCloseButton><Button variant="destructive" loading={deletingId === deleteTarget?.id} onClick={handleDelete}>{deletingId ? "Deleting…" : "Delete"}</Button></DialogFooter></DialogContent></Dialog>
    </PageShell>
  );
}
