"use client";

import { useState } from "react";
import type { Announcement } from "@/lib/db/schema";
import AnnouncementCard from "./AnnouncementCard";
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
    <AnnouncementCard
      key={active.id}
      announcement={active}
      counter={
        hasMultiple ? (
          <span className="text-[0.7rem] text-muted-foreground/50 tabular-nums">
            {activeIndex + 1} of {announcements.length}
          </span>
        ) : undefined
      }
      footer={
        <>
          <div className="pt-1 border-t border-border/20">
            <AnnouncementComments announcementId={active.id} currentUserId={currentUserId} isAdmin={isAdmin} />
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
                      i === activeIndex ? "w-5 bg-accent/70" : "w-1 bg-foreground/10 hover:bg-foreground/20"
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
        </>
      }
    />
  );
}
