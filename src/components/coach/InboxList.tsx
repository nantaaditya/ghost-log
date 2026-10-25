import Link from "next/link";
import { cn } from "@/lib/utils";
import type { InboxRow } from "@/lib/coach/inbox";

interface InboxListProps {
  rows: readonly InboxRow[];
  selectedId: string | null;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function InboxList({ rows, selectedId }: InboxListProps) {
  if (rows.length === 0) {
    return <p className="p-4 text-[0.8rem] text-muted-foreground">No active members yet.</p>;
  }

  return (
    <nav aria-label="Team conversations">
      <ul className="space-y-1">
        {rows.map((row) => {
          const isSelected = row.memberId === selectedId;
          return (
            <li key={row.memberId}>
              <Link
                href={`/coach?member=${row.memberId}`}
                aria-current={isSelected ? "page" : undefined}
                aria-label={row.unreadCount > 0 ? `${row.name}, ${row.unreadCount} unread` : row.name}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60",
                  isSelected && "bg-muted",
                )}
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/70 text-[0.7rem] font-semibold text-foreground/60 ring-1 ring-border/40"
                >
                  {initials(row.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.85rem] font-medium">{row.name}</span>
                  <span className="block truncate text-[0.7rem] text-muted-foreground">
                    {row.lastMessageAt ? (
                      <time dateTime={row.lastMessageAt} suppressHydrationWarning>
                        {new Date(row.lastMessageAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    ) : (
                      "No messages yet"
                    )}
                  </span>
                </span>
                {row.unreadCount > 0 && (
                  <span
                    aria-hidden
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[0.7rem] font-semibold text-primary-foreground"
                  >
                    {row.unreadCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
