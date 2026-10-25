// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from "sonner";
import GoalEditor from "../GoalEditor";
import type { GoalDto } from "@/lib/kpi/goal-dto";

const USER = "11111111-1111-4111-8111-111111111111";
const GOAL_ID = "44444444-4444-4444-8444-444444444444";

const goal: GoalDto = {
  id: GOAL_ID,
  type: "hard",
  skillKey: "clearing-settlement",
  title: "Own reconciliation",
  measure: "Match rate from 97% to 99.5% by Q3",
  milestones: [{ quarter: "Q1", description: "Map the flow" }],
  developmentAction: "Pair with the settlement owner",
  evidenceSource: "Q22",
  status: "draft",
};

const fetchMock = vi.fn();
let responder: (url: string, init: RequestInit) => Response | Promise<Response>;

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const requests = () => fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), init: init as RequestInit }));
const bodyOf = (init: RequestInit) => JSON.parse(String(init.body));

function renderEditor(initialGoals: GoalDto[] = [goal]) {
  return render(<GoalEditor userId={USER} cycleYear={2027} initialGoals={initialGoals} />);
}
const card = (index = 1) => screen.getByRole("group", { name: `Goal ${index}` });
const field = (label: string, index = 1) => within(card(index)).getByLabelText(label) as HTMLInputElement;
const button = (name: RegExp, index = 1) => within(card(index)).getByRole("button", { name });

async function click(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  responder = (_url, init) => ok({ success: true, data: { ...goal, ...bodyOf(init) } });
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => responder(url, init));
  vi.stubGlobal("fetch", fetchMock);
});

describe("GoalEditor: showing goals", () => {
  it("shows each goal's fields, with the manager-only evidence note", () => {
    renderEditor();
    expect(field("Title").value).toBe("Own reconciliation");
    expect(field("Measure").value).toBe("Match rate from 97% to 99.5% by Q3");
    expect(field("Development action").value).toBe("Pair with the settlement owner");
    expect(field("Evidence").value).toBe("Q22");
  });

  it("labels each goal as a private draft or shared with the member", () => {
    renderEditor([goal, { ...goal, id: "g2", status: "shared" }]);
    expect(within(card(1)).getByText(/draft/i)).toBeInTheDocument();
    expect(within(card(2)).getByText(/shared with/i)).toBeInTheDocument();
  });

  it("says there are no goals yet and offers to add one", () => {
    renderEditor([]);
    expect(screen.getByText(/no goals yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add goal/i })).toBeInTheDocument();
  });
});

describe("GoalEditor: editing", () => {
  it("cannot save until something changes", () => {
    renderEditor();
    expect(button(/^save/i)).toBeDisabled();
    fireEvent.change(field("Title"), { target: { value: "New title" } });
    expect(button(/^save/i)).toBeEnabled();
  });

  it("saves an edit with a PATCH to that goal", async () => {
    renderEditor();
    fireEvent.change(field("Title"), { target: { value: "Own settlement reconciliation" } });
    await click(button(/^save/i));

    const [request] = requests();
    expect(request.url).toBe(`/api/admin/kpi/goals/${GOAL_ID}`);
    expect(request.init.method).toBe("PATCH");
    expect(bodyOf(request.init)).toMatchObject({ title: "Own settlement reconciliation" });
    expect(toast.success).toHaveBeenCalled();
    expect(button(/^save/i)).toBeDisabled();
  });

  it("does not send an invalid goal, and says what is wrong", async () => {
    renderEditor();
    fireEvent.change(field("Title"), { target: { value: "   " } });
    await click(button(/^save/i));

    expect(requests()).toHaveLength(0);
    expect(within(card()).getByRole("alert")).toHaveTextContent(/title is required/i);
  });

  it("keeps the edit and shows the server's reason when saving fails", async () => {
    responder = () => ok({ success: false, error: "Goal not found" }, 404);
    renderEditor();
    fireEvent.change(field("Title"), { target: { value: "Changed" } });
    await click(button(/^save/i));

    expect(toast.error).toHaveBeenCalledWith("Goal not found");
    expect(field("Title").value).toBe("Changed");
    expect(button(/^save/i)).toBeEnabled();
  });

  it("locks the fields while a save is in flight, so nothing typed meanwhile is silently discarded", async () => {
    let release: (response: Response) => void = () => undefined;
    responder = () => new Promise<Response>((resolve) => (release = resolve));
    renderEditor();
    fireEvent.change(field("Title"), { target: { value: "Saving this" } });
    await click(button(/^save/i));

    expect(field("Title")).toBeDisabled();
    expect(field("Measure")).toBeDisabled();

    await act(async () => {
      release(ok({ success: true, data: { ...goal, title: "Saving this" } }));
    });
    expect(field("Title")).toBeEnabled();
    expect(field("Title").value).toBe("Saving this");
  });

  it("reminds the manager that saving a shared goal updates what the member sees", () => {
    renderEditor([{ ...goal, status: "shared" }]);
    expect(within(card()).getByText(/as soon as you save/i)).toBeInTheDocument();
  });

  it("does not show that reminder on a private draft", () => {
    renderEditor();
    expect(within(card()).queryByText(/as soon as you save/i)).not.toBeInTheDocument();
  });

  it("adds and removes milestones, up to four", async () => {
    renderEditor([{ ...goal, milestones: [] }]);
    for (let i = 0; i < 4; i++) await click(button(/add milestone/i));
    expect(within(card()).getAllByLabelText(/milestone \d description/i)).toHaveLength(4);
    expect(within(card()).queryByRole("button", { name: /add milestone/i })).not.toBeInTheDocument();

    await click(within(card()).getByRole("button", { name: /remove milestone 1/i }));
    expect(within(card()).getAllByLabelText(/milestone \d description/i)).toHaveLength(3);
  });
});

describe("GoalEditor: sharing", () => {
  it("shares a draft with the member and then offers to take it back", async () => {
    renderEditor();
    await click(button(/share with member/i));

    const [request] = requests();
    expect(request.init.method).toBe("PATCH");
    expect(bodyOf(request.init)).toEqual({ status: "shared" });
    expect(within(card()).getByText(/shared with/i)).toBeInTheDocument();
    expect(button(/unshare/i)).toBeInTheDocument();
  });

  it("can take a shared goal back to a private draft", async () => {
    renderEditor([{ ...goal, status: "shared" }]);
    await click(button(/unshare/i));
    expect(bodyOf(requests()[0].init)).toEqual({ status: "draft" });
    expect(within(card()).getByText(/draft/i)).toBeInTheDocument();
  });

  it("will not share edits that are not saved yet", () => {
    renderEditor();
    fireEvent.change(field("Title"), { target: { value: "Unsaved change" } });
    expect(button(/share with member/i)).toBeDisabled();
  });
});

describe("GoalEditor: deleting", () => {
  it("asks for confirmation before deleting", async () => {
    renderEditor();
    await click(button(/^delete/i));
    expect(requests()).toHaveLength(0);
    expect(button(/confirm delete/i)).toBeInTheDocument();
  });

  it("deletes the goal after confirmation and removes its card", async () => {
    responder = () => ok({ success: true });
    renderEditor();
    await click(button(/^delete/i));
    await click(button(/confirm delete/i));

    const [request] = requests();
    expect(request.url).toBe(`/api/admin/kpi/goals/${GOAL_ID}`);
    expect(request.init.method).toBe("DELETE");
    expect(screen.queryByRole("group", { name: "Goal 1" })).not.toBeInTheDocument();
  });
});

describe("GoalEditor: adding a goal", () => {
  const picker = () => screen.getByLabelText(/start from/i) as HTMLSelectElement;

  it("starts a new goal from a framework skill, prefilled and not yet saved", async () => {
    renderEditor([]);
    fireEvent.change(picker(), { target: { value: "collaboration-communication" } });
    await click(screen.getByRole("button", { name: /add goal/i }));

    expect(field("Title").value).toMatch(/collaboration/i);
    expect(field("Measure").value).toMatch(/\d/);
    expect(within(card()).getByText(/not saved yet/i)).toBeInTheDocument();
    expect(button(/share with member/i)).toBeDisabled();
  });

  it("starts a blank technical goal", async () => {
    renderEditor([]);
    fireEvent.change(picker(), { target: { value: "blank:hard" } });
    await click(screen.getByRole("button", { name: /add goal/i }));
    expect(field("Title").value).toBe("");
    expect(within(card()).getByText(/technical/i)).toBeInTheDocument();
  });

  it("creates the goal with a POST for this member and year, then edits it with PATCH", async () => {
    let created = false;
    responder = (_url, init) => {
      if (init.method === "POST") {
        created = true;
        return ok({ success: true, data: { ...goal, id: GOAL_ID, ...bodyOf(init) } }, 201);
      }
      return ok({ success: true, data: { ...goal, ...bodyOf(init) } });
    };
    renderEditor([]);
    fireEvent.change(picker(), { target: { value: "collaboration-communication" } });
    await click(screen.getByRole("button", { name: /add goal/i }));
    await click(button(/^save/i));

    const post = requests()[0];
    expect(created).toBe(true);
    expect(post.url).toBe("/api/admin/kpi/goals");
    expect(bodyOf(post.init)).toMatchObject({
      userId: USER,
      cycleYear: 2027,
      type: "soft",
      skillKey: "collaboration-communication",
    });
    expect(within(card()).queryByText(/not saved yet/i)).not.toBeInTheDocument();

    fireEvent.change(field("Title"), { target: { value: "Edited after create" } });
    await click(button(/^save/i));
    expect(requests()[1].url).toBe(`/api/admin/kpi/goals/${GOAL_ID}`);
    expect(requests()[1].init.method).toBe("PATCH");
  });

  it("will not create a technical goal until its development action is filled in", async () => {
    renderEditor([]);
    fireEvent.change(picker(), { target: { value: "authorization-flow" } });
    await click(screen.getByRole("button", { name: /add goal/i }));
    await click(button(/^save/i));

    expect(requests()).toHaveLength(0);
    expect(within(card()).getByRole("alert")).toHaveTextContent(/development action is required/i);
  });
});
