// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import CoachTabs from "../CoachTabs";

function Editor() {
  return <input aria-label="Unsaved edit" />;
}

function renderTabs() {
  return render(
    <CoachTabs
      tabs={[
        { id: "chat", label: "Chat", content: <Editor />, keepMounted: false },
        { id: "plan", label: "Plan", content: <input aria-label="Plan edit" />, keepMounted: true },
      ]}
    />,
  );
}

const tab = (name: RegExp) => screen.getByRole("tab", { name });

describe("CoachTabs", () => {
  it("shows the first tab by default and lists every tab", () => {
    renderTabs();
    expect(tab(/chat/i)).toHaveAttribute("aria-selected", "true");
    expect(tab(/plan/i)).toHaveAttribute("aria-selected", "false");
    expect(screen.getByLabelText("Unsaved edit")).toBeInTheDocument();
  });

  it("keeps a keepMounted panel's unsaved text when the user switches away and back", () => {
    renderTabs();
    fireEvent.click(tab(/plan/i));
    fireEvent.change(screen.getByLabelText("Plan edit"), { target: { value: "half-written goal" } });

    fireEvent.click(tab(/chat/i));
    fireEvent.click(tab(/plan/i));

    expect((screen.getByLabelText("Plan edit") as HTMLInputElement).value).toBe("half-written goal");
  });

  it("does not keep a panel mounted unless asked: the chat unmounts so it cannot mark messages read unseen", () => {
    renderTabs();
    fireEvent.click(tab(/plan/i));
    expect(screen.queryByLabelText("Unsaved edit")).not.toBeInTheDocument();
  });

  it("honours defaultTab", () => {
    render(
      <CoachTabs
        defaultTab="plan"
        tabs={[
          { id: "chat", label: "Chat", content: <p>chat panel</p> },
          { id: "plan", label: "Plan", content: <p>plan panel</p> },
        ]}
      />,
    );
    expect(screen.getByText("plan panel")).toBeVisible();
  });
});
