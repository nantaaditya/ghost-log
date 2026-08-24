"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

// rehype-sanitize's default (GitHub-style) schema deliberately excludes <u> — GitHub avoids it
// because underlined text is easily mistaken for a link. MDXEditor's underline toggle emits <u>
// with no markdown equivalent, so without this it would be silently stripped, not just escaped.
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u", "mark"],
};

export type AnnouncementCardData = {
  title: string;
  body: string;
  imageData?: string | null;
  imageAlt?: string | null;
  imageDisplayMode?: "cover" | "contain" | null;
  publishedAt?: Date | string | null;
};

type Props = {
  announcement: AnnouncementCardData;
  counter?: React.ReactNode;
  footer?: React.ReactNode;
};

/** The single-announcement card markup, shared by the home page banner and the editor's
 * live preview so they can never visually drift apart. */
export default function AnnouncementCard({ announcement, counter, footer }: Props) {
  const { title, body, imageData, imageAlt, imageDisplayMode, publishedAt } = announcement;

  return (
    <div className="relative rounded-2xl overflow-hidden ring-1 ring-primary/15 bg-primary/[0.03] backdrop-blur-xl">
      <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />

      {imageData && (
        <div className={`overflow-hidden ${imageDisplayMode === "cover" ? "max-h-48" : "max-h-96 bg-muted/40"}`}>
          <img
            src={imageData}
            alt={imageAlt ?? title}
            className={`w-full h-full ${imageDisplayMode === "cover" ? "max-h-48 object-cover" : "max-h-96 object-contain"}`}
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
            {counter}
          </div>
          {publishedAt && (
            <time
              dateTime={new Date(publishedAt).toISOString()}
              className="text-[0.7rem] text-muted-foreground/50 shrink-0"
            >
              {new Date(publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </time>
          )}
        </div>

        <h2 className="text-lg font-semibold tracking-tight leading-snug">
          {title || <span className="text-muted-foreground/40">Untitled announcement</span>}
        </h2>

        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/70 text-[0.85rem] leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}>
            {body || "*Nothing written yet.*"}
          </ReactMarkdown>
        </div>

        {footer}
      </div>
    </div>
  );
}
