"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Announcement } from "@/lib/db/schema";

type Props = {
  announcements: Announcement[];
};

export default function AnnouncementBanner({ announcements }: Props) {
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
      className="relative rounded-xl overflow-hidden border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-3 motion-safe:duration-500"
    >
      {/* Accent stripe */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

      {/* Hero image */}
      {active.imageData && (
        <div className="overflow-hidden">
          <img
            src={active.imageData}
            alt={active.imageAlt ?? active.title}
            className="w-full max-h-56 object-cover"
          />
        </div>
      )}

      <div className="p-4 sm:p-5 space-y-3">
        {/* Header row: badge + counter + date */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3 w-3 shrink-0"
                aria-hidden="true"
              >
                <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v.75a.75.75 0 0 0 1.5 0V3.5h.75a.75.75 0 0 0 0-1.5H3.5ZM3.5 16.5h.75a.75.75 0 0 1 0 1.5H3.5A1.5 1.5 0 0 1 2 16.5v-.75a.75.75 0 0 1 1.5 0v.75ZM16.5 2A1.5 1.5 0 0 1 18 3.5v.75a.75.75 0 0 1-1.5 0V3.5h-.75a.75.75 0 0 1 0-1.5h.75ZM15 18h.75a.75.75 0 0 0 0-1.5H15v-.75a.75.75 0 0 0-1.5 0v.75A1.5 1.5 0 0 0 15 18ZM10 5a5 5 0 1 0 0 10A5 5 0 0 0 10 5Z" />
              </svg>
              Pengumuman
            </span>
            {hasMultiple && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {activeIndex + 1} / {announcements.length}
              </span>
            )}
          </div>
          {active.publishedAt && (
            <time
              dateTime={new Date(active.publishedAt).toISOString()}
              className="text-xs text-muted-foreground shrink-0"
            >
              {new Date(active.publishedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold leading-snug sm:text-2xl tracking-tight">
          {active.title}
        </h2>

        {/* Body */}
        <div className="prose prose-sm max-w-none dark:prose-invert text-foreground/80">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.body}</ReactMarkdown>
        </div>

        {/* Carousel navigation */}
        {hasMultiple && (
          <div className="flex items-center gap-3 pt-1 border-t border-primary/10">
            <button
              onClick={prev}
              disabled={activeIndex === 0}
              className="text-xs font-medium text-primary disabled:opacity-30 hover:underline transition-opacity"
              aria-label="Previous announcement"
            >
              ← Sebelumnya
            </button>

            <div className="flex gap-1.5 flex-1 justify-center" aria-label="Announcement dots">
              {announcements.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Announcement ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === activeIndex
                      ? "w-5 bg-primary"
                      : "w-1.5 bg-primary/30 hover:bg-primary/60"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              disabled={activeIndex === announcements.length - 1}
              className="text-xs font-medium text-primary disabled:opacity-30 hover:underline transition-opacity"
              aria-label="Next announcement"
            >
              Selanjutnya →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
