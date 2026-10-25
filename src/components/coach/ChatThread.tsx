"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  mergeMessages,
  newestCreatedAt,
  unreadUpTo,
  type ChatMessage,
} from "@/lib/coach/thread-state";
import { MAX_MESSAGE_LEN } from "@/lib/coach/validation";

const DEFAULT_POLL_MS = 8000;
const COUNTER_THRESHOLD = Math.floor(MAX_MESSAGE_LEN * 0.9);
// How close to the bottom (px) still counts as "reading the latest messages".
const NEAR_BOTTOM_PX = 48;

interface ChatThreadProps {
  /** Whose thread this is. */
  memberId: string;
  /** Who is looking: the member themselves, or an admin. */
  viewerId: string;
  initialMessages: readonly ChatMessage[];
  /** Who the viewer is talking to, for the empty state and the screen-reader label. */
  counterpartLabel: string;
  pollMs?: number;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatThread({
  memberId,
  viewerId,
  initialMessages,
  counterpartLabel,
  pollMs = DEFAULT_POLL_MS,
}: ChatThreadProps) {
  // A member never names their thread; an admin always does.
  const isOwnThread = viewerId === memberId;

  const [messages, setMessages] = useState<ChatMessage[]>(() => mergeMessages([], initialMessages));
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const sendingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const lastMarkedRef = useRef<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const lastSeenIdRef = useRef<string | null>(null);

  useEffect(() => {
    cursorRef.current = newestCreatedAt(messages);

    // Scroll only when a message we have not shown before is the newest, and only the log itself
    // (never the page). A reader who scrolled up to read history is left where they are; the
    // sender always sees their own message land.
    const newest = messages[messages.length - 1];
    if (!newest || newest.id === lastSeenIdRef.current) return;
    const isFirstRender = lastSeenIdRef.current === null;
    lastSeenIdRef.current = newest.id;

    const log = logRef.current;
    if (log && (isFirstRender || newest.senderId === viewerId || stickToBottomRef.current)) {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages, viewerId]);

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const log = event.currentTarget;
    stickToBottomRef.current = log.scrollHeight - log.scrollTop - log.clientHeight < NEAR_BOTTOM_PX;
  }

  // Poll for new messages while the tab is visible. Setting state only happens inside the async
  // callback, never in the effect body.
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function poll() {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const params = new URLSearchParams();
        if (!isOwnThread) params.set("memberId", memberId);
        if (cursorRef.current) params.set("after", cursorRef.current);
        const res = await fetch(`/api/coach/messages?${params.toString()}`);
        const json = await res.json();
        if (!cancelled && json.success) setMessages((prev) => mergeMessages(prev, json.data));
      } catch {
        // Offline or a server blip: the next tick tries again.
      } finally {
        inFlight = false;
      }
    }

    const timer = setInterval(poll, pollMs);
    const onVisibilityChange = () => {
      void poll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [memberId, isOwnThread, pollMs]);

  // Tell the server how far the viewer has read, but only while the tab is actually visible: a
  // thread opened in a background tab has not been read. `upTo` keeps a message that arrived while
  // this request was in flight unread, and a refused or failed request is retried next time.
  const markRead = useCallback(() => {
    const upTo = unreadUpTo(messages, viewerId, memberId);
    if (!upTo || upTo === lastMarkedRef.current || document.visibilityState !== "visible") return;
    lastMarkedRef.current = upTo;
    fetch("/api/coach/read", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(isOwnThread ? { upTo } : { memberId, upTo }),
    })
      .then((res) => {
        if (!res.ok) lastMarkedRef.current = null;
      })
      .catch(() => {
        lastMarkedRef.current = null;
      });
  }, [messages, viewerId, memberId, isOwnThread]);

  useEffect(() => {
    markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
  }, [markRead]);

  async function send() {
    const body = draft.trim();
    if (!body || sendingRef.current) return;

    sendingRef.current = true;
    setSending(true);
    try {
      const res = await fetch("/api/coach/messages", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(isOwnThread ? { body } : { body, memberId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to send message");
      setMessages((prev) => mergeMessages(prev, [json.data]));
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void send();
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={logRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${counterpartLabel}`}
        className="min-h-64 max-h-[28rem] overflow-y-auto rounded-2xl border border-border/50 bg-muted/20 p-4"
      >
        {messages.length === 0 ? (
          <p className="py-16 text-center text-[0.8rem] text-muted-foreground">
            No messages yet. Say hello to {counterpartLabel}.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {messages.map((message) => {
              const isOwn = message.senderId === viewerId;
              return (
                <li
                  key={message.id}
                  data-own={isOwn ? "true" : "false"}
                  className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
                      isOwn ? "bg-primary text-primary-foreground" : "bg-background ring-1 ring-border/50",
                    )}
                  >
                    {message.body}
                  </div>
                  <p className="px-1 text-[0.7rem] text-muted-foreground/70">
                    <span className="font-medium">{message.senderName}</span>
                    {" · "}
                    <time dateTime={message.createdAt} suppressHydrationWarning>
                      {formatTime(message.createdAt)}
                    </time>
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            aria-label="Message"
            rows={2}
            maxLength={MAX_MESSAGE_LEN}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message… (Shift+Enter for a new line)"
            className="min-h-16 text-sm"
          />
          {draft.length >= COUNTER_THRESHOLD && (
            <p className="mt-1 text-right text-[0.7rem] text-muted-foreground">
              {draft.length}/{MAX_MESSAGE_LEN}
            </p>
          )}
        </div>
        <Button disabled={!draft.trim()} loading={sending} onClick={() => void send()}>
          <Send className="h-4 w-4" />
          Send
        </Button>
      </div>
    </div>
  );
}
