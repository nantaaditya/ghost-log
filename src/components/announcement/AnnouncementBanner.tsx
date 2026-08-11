"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Announcement } from "@/lib/db/schema";
import AnnouncementComments from "./AnnouncementComments";

type Props = {
  announcements: Announcement[];
  currentUserId: string;
  isAdmin: boolean;
};

export default function AnnouncementBanner({ announcements, currentUserId, isAdmin }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (announcements.length === 0) return null;

  const active = announcements[activeIndex];
  const hasMultiple = announcements.length > 1;

  function prev() {
    setActiveIndex((i) => Math.max(0, i - 1));
  }

  function next() {
    setActiveIndex((i) => Math.min(announcements.length - 1, i + 1));
  }

  return (
    <div
      key={active.id}
      className="relative rounded-2xl overflow-hidden ring-1 ring-primary/15 bg-primary/[0.03] backdrop-blur-xl"
    >
      <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />

      {active.imageData && (
        <div className="overflow-hidden">
          <img
            src={active.imageData}
            alt={active.imageAlt ?? active.title}
            className="w-full max-h-48 object-cover"
          />
        </div>
      )}

      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-primary">
              <span className="size-1.5 rounded-full bg-accent" />
              Announcement
            </span>
            {hasMultiple && (
              <span className="text-[0.7rem] text-muted-foreground/50 tabular-nums">
                {activeIndex + 1} of {announcements.length}
              </span>
            )}
          </div>
          {active.publishedAt && (
            <time
              dateTime={new Date(active.publishedAt).toISOString()}
              className="text-[0.7rem] text-muted-foreground/50 shrink-0"
            >
              {new Date(active.publishedAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </time>
          )}
        </div>

        <h2 className="text-lg font-semibold tracking-tight leading-snug">
          {active.title}
        </h2>

        <div className="prose prose-sm max-w-none prose-invert text-foreground/70 text-[0.85rem] leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.body}</ReactMarkdown>
        </div>

        <div className="pt-1 border-t border-border/20">
          <AnnouncementComments
            announcementId={active.id}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        </div>

        {hasMultiple && (
          <div className="flex items-center gap-4 pt-1 border-t border-border/20">
            <button
              onClick={prev}
              disabled={activeIndex === 0}
              className="text-[0.75rem] font-medium text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors"
              aria-label="Previous announcement"
            >
              ← Prev
            </button>

            <div className="flex gap-1.5 flex-1 justify-center">
              {announcements.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Announcement ${i + 1}`}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-5 bg-accent/70"
                      : "w-1 bg-foreground/10 hover:bg-foreground/20"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              disabled={activeIndex === announcements.length - 1}
              className="text-[0.75rem] font-medium text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors"
              aria-label="Next announcement"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
