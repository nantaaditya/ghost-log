// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { toast } from "sonner";
import ChatThread from "../ChatThread";
import type { ChatMessage } from "@/lib/coach/thread-state";

const MEMBER = "11111111-1111-4111-8111-111111111111";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const POLL_MS = 8000;

function message(id: string, senderId: string, createdAt: string, readAt: string | null = null, body = `body ${id}`): ChatMessage {
  return { id, senderId, senderName: senderId === MEMBER ? "Member" : "Manager", body, createdAt, readAt };
}

const fetchMock = vi.fn();
let pollData: ChatMessage[] = [];
let readStatus = 200;
let postResponse: () => Response | Promise<Response>;

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

function callsTo(predicate: (url: string, init?: RequestInit) => boolean) {
  return fetchMock.mock.calls.filter(([url, init]) => predicate(String(url), init as RequestInit | undefined));
}
const posts = () => callsTo((url, init) => url.startsWith("/api/coach/messages") && init?.method === "POST");
const polls = () => callsTo((url, init) => url.startsWith("/api/coach/messages") && init?.method !== "POST");
const reads = () => callsTo((url) => url.startsWith("/api/coach/read"));

function renderThread(overrides: Partial<React.ComponentProps<typeof ChatThread>> = {}) {
  return render(
    <ChatThread
      memberId={MEMBER}
      viewerId={MEMBER}
      initialMessages={[]}
      counterpartLabel="your manager"
      pollMs={POLL_MS}
      {...overrides}
    />,
  );
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  pollData = [];
  readStatus = 200;
  postResponse = () => ok({ success: true, data: message("new", MEMBER, "2026-10-25T10:30:00.000Z", null, "sent") });
  setVisibility("visible");
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (String(url).startsWith("/api/coach/read")) return ok({ success: readStatus === 200 }, readStatus);
    if (init?.method === "POST") return postResponse();
    return ok({ success: true, data: pollData });
  });
  vi.stubGlobal("fetch", fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ChatThread: display", () => {
  it("shows the conversation oldest first, with who said what", () => {
    renderThread({
      initialMessages: [
        message("a", ADMIN, "2026-10-25T10:00:00.000Z", "2026-10-25T10:01:00.000Z", "How are you?"),
        message("b", MEMBER, "2026-10-25T10:02:00.000Z", null, "Doing fine"),
      ],
    });
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("How are you?");
    expect(items[0]).toHaveTextContent("Manager");
    expect(items[1]).toHaveTextContent("Doing fine");
  });

  it("marks the viewer's own messages so they can be styled apart", () => {
    renderThread({ initialMessages: [message("a", ADMIN, "2026-10-25T10:00:00.000Z"), message("b", MEMBER, "2026-10-25T10:02:00.000Z")] });
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("data-own", "false");
    expect(items[1]).toHaveAttribute("data-own", "true");
  });

  it("invites the first message when the thread is empty", () => {
    renderThread();
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
  });

  it("renders message text as text, never as HTML", () => {
    renderThread({ initialMessages: [message("a", ADMIN, "2026-10-25T10:00:00.000Z", null, '<img src=x onerror="alert(1)">')] });
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText('<img src=x onerror="alert(1)">')).toBeInTheDocument();
  });

  it("announces new messages politely to screen readers", () => {
    renderThread();
    expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
  });
});

describe("ChatThread: sending", () => {
  const box = () => screen.getByLabelText(/message/i) as HTMLTextAreaElement;
  const send = () => screen.getByRole("button", { name: /send/i });

  it("cannot send an empty or whitespace-only message", () => {
    renderThread();
    expect(send()).toBeDisabled();
    fireEvent.change(box(), { target: { value: "   " } });
    expect(send()).toBeDisabled();
    fireEvent.change(box(), { target: { value: "Hi" } });
    expect(send()).toBeEnabled();
  });

  it("posts the text for a member without naming a thread, then shows it and clears the box", async () => {
    renderThread();
    fireEvent.change(box(), { target: { value: "  Hello there  " } });
    await act(async () => {
      fireEvent.click(send());
    });

    expect(posts()).toHaveLength(1);
    const body = JSON.parse(String((posts()[0][1] as RequestInit).body));
    expect(body).toEqual({ body: "Hello there" });
    expect(screen.getByText("sent")).toBeInTheDocument();
    expect(box().value).toBe("");
  });

  it("names the member's thread when an admin writes", async () => {
    renderThread({ viewerId: ADMIN, counterpartLabel: "Member" });
    fireEvent.change(box(), { target: { value: "Checking in" } });
    await act(async () => {
      fireEvent.click(send());
    });
    const body = JSON.parse(String((posts()[0][1] as RequestInit).body));
    expect(body).toEqual({ body: "Checking in", memberId: MEMBER });
  });

  it("keeps the draft and says so when sending fails", async () => {
    postResponse = () => ok({ success: false, error: "Too many messages. Please wait a moment." }, 429);
    renderThread();
    fireEvent.change(box(), { target: { value: "Important" } });
    await act(async () => {
      fireEvent.click(send());
    });
    expect(box().value).toBe("Important");
    expect(toast.error).toHaveBeenCalledWith("Too many messages. Please wait a moment.");
  });

  it("survives a network failure without losing the draft", async () => {
    postResponse = () => Promise.reject(new Error("offline"));
    renderThread();
    fireEvent.change(box(), { target: { value: "Still here" } });
    await act(async () => {
      fireEvent.click(send());
    });
    expect(box().value).toBe("Still here");
    expect(toast.error).toHaveBeenCalled();
  });

  it("does not send twice while the first request is in flight", async () => {
    let release: (response: Response) => void = () => undefined;
    postResponse = () => new Promise<Response>((resolve) => (release = resolve));
    renderThread();
    fireEvent.change(box(), { target: { value: "Once" } });
    await act(async () => {
      fireEvent.click(send());
      fireEvent.click(send());
    });
    expect(posts()).toHaveLength(1);
    await act(async () => {
      release(ok({ success: true, data: message("n1", MEMBER, "2026-10-25T10:30:00.000Z", null, "Once") }));
    });
  });

  it("sends on Enter but keeps Shift+Enter for a new line", async () => {
    renderThread();
    fireEvent.change(box(), { target: { value: "Line one" } });
    fireEvent.keyDown(box(), { key: "Enter", shiftKey: true });
    expect(posts()).toHaveLength(0);
    await act(async () => {
      fireEvent.keyDown(box(), { key: "Enter" });
    });
    expect(posts()).toHaveLength(1);
  });

  it("does not send while an input method is composing text", () => {
    renderThread();
    fireEvent.change(box(), { target: { value: "にほん" } });
    fireEvent.keyDown(box(), { key: "Enter", isComposing: true });
    expect(posts()).toHaveLength(0);
  });

  it("limits the box to the maximum message length", () => {
    renderThread();
    expect(box()).toHaveAttribute("maxlength", "2000");
  });
});

describe("ChatThread: polling", () => {
  it("asks for messages after the newest one it has, every interval", async () => {
    renderThread({ initialMessages: [message("a", ADMIN, "2026-10-25T10:00:00.000Z")] });
    expect(polls()).toHaveLength(0);

    await advance(POLL_MS);

    expect(polls()).toHaveLength(1);
    const url = new URL(String(polls()[0][0]), "http://localhost");
    expect(url.searchParams.get("after")).toBe("2026-10-25T10:00:00.000Z");
    expect(url.searchParams.get("memberId")).toBeNull();
  });

  it("names the thread when polling as an admin", async () => {
    renderThread({ viewerId: ADMIN, counterpartLabel: "Member" });
    await advance(POLL_MS);
    const url = new URL(String(polls()[0][0]), "http://localhost");
    expect(url.searchParams.get("memberId")).toBe(MEMBER);
  });

  it("adds new messages and ignores repeats from the look-back window", async () => {
    const first = message("a", ADMIN, "2026-10-25T10:00:00.000Z", null, "first");
    renderThread({ initialMessages: [first] });
    pollData = [first, message("b", ADMIN, "2026-10-25T10:05:00.000Z", null, "second")];

    await advance(POLL_MS);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("first")).toHaveLength(1);
    expect(screen.getByText("second")).toBeInTheDocument();
  });

  it("does not poll while the tab is hidden, and catches up when it becomes visible", async () => {
    renderThread();
    setVisibility("hidden");
    await advance(POLL_MS * 3);
    expect(polls()).toHaveLength(0);

    setVisibility("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(polls()).toHaveLength(1);
  });

  it("stops polling after it is removed", async () => {
    const { unmount } = renderThread();
    unmount();
    await advance(POLL_MS * 3);
    expect(polls()).toHaveLength(0);
  });

  it("keeps going after a failed poll", async () => {
    renderThread();
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await advance(POLL_MS);
    await advance(POLL_MS);
    expect(polls().length).toBeGreaterThanOrEqual(2);
  });
});

describe("ChatThread: scrolling", () => {
  function logWithGeometry() {
    const log = screen.getByRole("log");
    Object.defineProperty(log, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(log, "clientHeight", { value: 400, configurable: true });
    return log;
  }
  const first = message("a", ADMIN, "2026-10-25T10:00:00.000Z");

  it("leaves a reader who scrolled up where they are when a message arrives", async () => {
    renderThread({ initialMessages: [first] });
    const log = logWithGeometry();
    log.scrollTop = 100;
    fireEvent.scroll(log);

    pollData = [message("b", ADMIN, "2026-10-25T10:05:00.000Z")];
    await advance(POLL_MS);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(log.scrollTop).toBe(100);
  });

  it("follows new messages when the reader is already at the bottom", async () => {
    renderThread({ initialMessages: [first] });
    const log = logWithGeometry();
    log.scrollTop = 580;
    fireEvent.scroll(log);

    pollData = [message("b", ADMIN, "2026-10-25T10:05:00.000Z")];
    await advance(POLL_MS);

    expect(log.scrollTop).toBe(1000);
  });

  it("does not touch the scroll position when a poll brings nothing new", async () => {
    renderThread({ initialMessages: [first] });
    const log = logWithGeometry();
    log.scrollTop = 580;
    fireEvent.scroll(log);

    pollData = [first];
    await advance(POLL_MS);
    await advance(POLL_MS);

    expect(log.scrollTop).toBe(580);
  });

  it("brings the viewer to the bottom after they send a message, wherever they had scrolled", async () => {
    renderThread({ initialMessages: [first] });
    const log = logWithGeometry();
    log.scrollTop = 100;
    fireEvent.scroll(log);

    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "My reply" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send/i }));
    });

    expect(log.scrollTop).toBe(1000);
  });
});

describe("ChatThread: read receipts", () => {
  it("tells the server up to which message the viewer has seen, once", async () => {
    renderThread({
      initialMessages: [
        message("a", ADMIN, "2026-10-25T10:00:00.000Z"),
        message("b", ADMIN, "2026-10-25T10:05:00.000Z"),
        message("mine", MEMBER, "2026-10-25T10:06:00.000Z"),
      ],
    });
    await advance(0);

    expect(reads()).toHaveLength(1);
    const body = JSON.parse(String((reads()[0][1] as RequestInit).body));
    expect(body).toEqual({ upTo: "2026-10-25T10:05:00.000Z" });

    await advance(POLL_MS * 2);
    expect(reads()).toHaveLength(1);
  });

  it("names the thread when an admin marks it read", async () => {
    renderThread({
      viewerId: ADMIN,
      counterpartLabel: "Member",
      initialMessages: [message("a", MEMBER, "2026-10-25T10:00:00.000Z")],
    });
    await advance(0);
    const body = JSON.parse(String((reads()[0][1] as RequestInit).body));
    expect(body).toEqual({ memberId: MEMBER, upTo: "2026-10-25T10:00:00.000Z" });
  });

  it("does not ask when there is nothing unread from the other side", async () => {
    renderThread({
      initialMessages: [
        message("a", ADMIN, "2026-10-25T10:00:00.000Z", "2026-10-25T10:01:00.000Z"),
        message("mine", MEMBER, "2026-10-25T10:06:00.000Z"),
      ],
    });
    await advance(0);
    expect(reads()).toHaveLength(0);
  });

  it("waits until the browser tab is visible before telling the server a message was read", async () => {
    setVisibility("hidden");
    renderThread({ initialMessages: [message("a", ADMIN, "2026-10-25T10:00:00.000Z")] });
    await advance(0);
    expect(reads()).toHaveLength(0);

    setVisibility("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(reads()).toHaveLength(1);
  });

  it("tries again when the server refuses the read receipt", async () => {
    readStatus = 500;
    renderThread({ initialMessages: [message("a", ADMIN, "2026-10-25T10:00:00.000Z")] });
    await advance(0);
    expect(reads()).toHaveLength(1);

    readStatus = 200;
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(reads()).toHaveLength(2);
  });

  it("marks a newly polled message as read too", async () => {
    renderThread();
    pollData = [message("n", ADMIN, "2026-10-25T10:20:00.000Z")];
    await advance(POLL_MS);
    expect(reads()).toHaveLength(1);
    expect(JSON.parse(String((reads()[0][1] as RequestInit).body)).upTo).toBe("2026-10-25T10:20:00.000Z");
  });
});
