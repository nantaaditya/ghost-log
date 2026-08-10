"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { CommentWithAuthor } from "@/lib/announcement-comment/repository";

type Props = {
  announcementId: string;
  currentUserId: string;
  isAdmin: boolean;
};

function formatTimestamp(date: Date | string) {
  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnnouncementComments({ announcementId, currentUserId, isAdmin }: Props) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadComments() {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/announcements/${announcementId}/comments`);
      const json = await res.json();
      if (json.success) setComments(json.data);
    } catch {
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  }

  useEffect(() => {
    // Inlined rather than calling loadComments() directly: react-hooks/set-state-in-effect
    // flags a named function call in the effect body if that function sets state, even
    // though the actual setState happens asynchronously after the fetch resolves.
    fetch(`/api/announcements/${announcementId}/comments`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setComments(json.data);
      })
      .catch(() => toast.error("Failed to load comments"))
      .finally(() => setLoadingComments(false));
  }, [announcementId]);

  async function submit() {
    const body = draft.trim();
    if (!body) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/announcements/${announcementId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to post comment");
      setComments((prev) => [...prev, json.data]);
      setDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/announcements/${announcementId}/comments/${commentId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to delete comment");
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete comment");
    } finally {
      setDeletingId(null);
    }
  }

  function handleOpen() {
    setOpen(true);
    loadComments();
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-xs font-medium text-primary hover:underline transition-opacity"
      >
        {loadingComments ? "💬 …" : `💬 ${comments.length} comment${comments.length !== 1 ? "s" : ""}`}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Spinner className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-start justify-between gap-2 border-b pb-2 last:border-0 ${
                      deletingId === c.id ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium text-sm">{c.authorName}</span>
                        <span className="text-xs text-muted-foreground">{formatTimestamp(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">{c.body}</p>
                    </div>
                    {(c.userId === currentUserId || isAdmin) && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="text-xs text-destructive shrink-0 disabled:opacity-50"
                        aria-label="Delete comment"
                      >
                        {deletingId === c.id ? <Spinner className="h-3 w-3" /> : "✕"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <Textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a comment…"
                className="text-sm"
              />
              <Button size="sm" disabled={!draft.trim()} loading={submitting} onClick={submit}>
                Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
