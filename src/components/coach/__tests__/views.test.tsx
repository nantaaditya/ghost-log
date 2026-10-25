// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import InboxList from "../InboxList";
import ManagerNotes from "../ManagerNotes";
import PlanView from "../PlanView";
import ResultsView from "../ResultsView";
import type { MemberProfile } from "@/lib/kpi/profile-repository";
import type { GoalDto } from "@/lib/kpi/goal-dto";
import type { InboxRow } from "@/lib/coach/inbox";

const profile: MemberProfile = {
  id: "p1",
  userId: "u1",
  cycleYear: 2026,
  scores: [
    { kode: "A", dimensi: "Ambition", jumlah: 0, total: 12 },
    { kode: "O", dimensi: "Ownership", jumlah: 1, total: 12 },
    { kode: "R", dimensi: "Resilience", jumlah: 5, total: 12 },
    { kode: "L", dimensi: "Learning", jumlah: 1, total: 12 },
    { kode: "P", dimensi: "People", jumlah: 3, total: 12 },
    { kode: "V", dimensi: "Vision", jumlah: 2, total: 12 },
  ],
  profile: {
    gaya_sosial: "Introvert",
    pemulihan: "Menyendiri",
    peran_tim: "Pendukung",
    motivator: "Makna",
    gaya_konflik: "Menghindar",
    kekuatan: "Teliti",
    growth: "Perfeksionis",
    energi: "Pagi",
  },
  answers: [
    { q: "Q1", bagian: "Career Growth", pertanyaan: "Mana yang paling dekat?", jawaban: "Saya mencari ritme kembali", kategori: "Resilience" },
    { q: "Q21", bagian: "Terbuka", pertanyaan: "Ceritakan satu kebanggaan", jawaban: "Memperbaiki proses rekonsiliasi", kategori: "Jawaban terbuka" },
  ],
  memberSummary: "Kamu paling sering memilih Resilience.",
  importedAt: new Date("2026-10-25T00:00:00Z"),
};

describe("ResultsView", () => {
  it("opens with a notice that this is a self-reflection, not a rating", () => {
    render(<ResultsView profile={profile} />);
    expect(screen.getByRole("note")).toHaveTextContent(/not a rating/i);
  });

  it("lists all six dimensions as counts, most chosen first, ties in survey order", () => {
    render(<ResultsView profile={profile} />);
    const rows = screen.getAllByTestId("dimension-row");
    expect(rows.map((row) => row.getAttribute("data-dimension"))).toEqual([
      "Resilience",
      "People",
      "Vision",
      "Ownership",
      "Learning",
      "Ambition",
    ]);
    expect(within(rows[0]).getByText("5 of 12")).toBeInTheDocument();
  });

  it("never turns the counts into percentages", () => {
    const { container } = render(<ResultsView profile={profile} />);
    expect(container.textContent).not.toContain("%");
  });

  it("explains that a low count means rarely chosen, not weak", () => {
    render(<ResultsView profile={profile} />);
    expect(screen.getByText(/rarely chose.*not.*weak|not a measure of ability/i)).toBeInTheDocument();
  });

  it("shows the note written for the member, and omits that section when there is none", () => {
    const { rerender } = render(<ResultsView profile={profile} />);
    expect(screen.getByText("Kamu paling sering memilih Resilience.")).toBeInTheDocument();
    rerender(<ResultsView profile={{ ...profile, memberSummary: null }} />);
    expect(screen.queryByText("Kamu paling sering memilih Resilience.")).not.toBeInTheDocument();
    expect(screen.queryByText(/a note for you/i)).not.toBeInTheDocument();
  });

  it("shows the character profile under readable labels", () => {
    render(<ResultsView profile={profile} />);
    expect(screen.getByText("Team role")).toBeInTheDocument();
    expect(screen.getByText("Pendukung")).toBeInTheDocument();
    expect(screen.getByText("Growth area")).toBeInTheDocument();
    expect(screen.getByText("Perfeksionis")).toBeInTheDocument();
  });

  it("keeps the person's own answers available but collapsed", () => {
    const { container } = render(<ResultsView profile={profile} />);
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(within(details as HTMLElement).getByText("Saya mencari ritme kembali")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("Mana yang paling dekat?")).toBeInTheDocument();
  });

  it("renders answers as text, never as HTML", () => {
    const hostile = { ...profile, answers: [{ ...profile.answers[0], jawaban: "<img src=x onerror=alert(1)>" }] };
    const { container } = render(<ResultsView profile={hostile} />);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("ManagerNotes", () => {
  const summary = [{ judul: "Sinyal periode berat", isi: "Muncul di Q1 dan Q3." }];
  const decisions = [{ judul: "Mulai dari jawabannya", isi: "Buka dengan Q1." }];

  it("shows the hypotheses and the suggested 1:1 openings", () => {
    render(<ManagerNotes summary={summary} decisions={decisions} />);
    expect(screen.getByText("Sinyal periode berat")).toBeInTheDocument();
    expect(screen.getByText("Muncul di Q1 dan Q3.")).toBeInTheDocument();
    expect(screen.getByText("Mulai dari jawabannya")).toBeInTheDocument();
  });

  it("says these are hypotheses and are not shown to the member", () => {
    render(<ManagerNotes summary={summary} decisions={decisions} />);
    expect(screen.getByRole("note")).toHaveTextContent(/hypotheses/i);
    expect(screen.getByRole("note")).toHaveTextContent(/not shown to the member/i);
  });

  it("says so when nothing was imported", () => {
    render(<ManagerNotes summary={[]} decisions={[]} />);
    expect(screen.getByText(/no manager notes/i)).toBeInTheDocument();
  });
});

describe("PlanView", () => {
  const goals: GoalDto[] = [
    {
      id: "g1",
      type: "hard",
      skillKey: "clearing-settlement",
      title: "Own reconciliation",
      measure: "Match rate from 97% to 99.5% by Q3",
      milestones: [{ quarter: "Q1", description: "Map the flow" }],
      developmentAction: "Pair with the settlement owner",
      evidenceSource: "Q22. Manager must confirm the starting level.",
      status: "shared",
    },
    {
      id: "g2",
      type: "soft",
      skillKey: "collaboration-communication",
      title: "Clear weekly reports",
      measure: "90% of reports on time",
      milestones: [],
      developmentAction: "Use the writing guide",
      evidenceSource: "Q2",
      status: "shared",
    },
  ];

  it("says nothing has been shared yet, naming the year", () => {
    render(<PlanView goals={[]} year={2027} />);
    expect(screen.getByText(/hasn.t shared a 2027 plan yet/i)).toBeInTheDocument();
  });

  it("groups goals into technical and behavioural", () => {
    render(<PlanView goals={goals} year={2027} />);
    expect(screen.getByRole("heading", { name: /technical/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /behaviou?ral/i })).toBeInTheDocument();
  });

  it("shows each goal's measure, development action and milestones", () => {
    render(<PlanView goals={goals} year={2027} />);
    expect(screen.getByText("Own reconciliation")).toBeInTheDocument();
    expect(screen.getByText("Match rate from 97% to 99.5% by Q3")).toBeInTheDocument();
    expect(screen.getByText("Pair with the settlement owner")).toBeInTheDocument();
    expect(screen.getByText("Map the flow")).toBeInTheDocument();
    expect(screen.getByText("Q1")).toBeInTheDocument();
  });

  it("keeps the manager's evidence notes out of the member's view", () => {
    const { container } = render(<PlanView goals={goals} year={2027} />);
    expect(container.textContent).not.toContain("Manager must confirm the starting level");
  });
});

describe("InboxList", () => {
  const rows: InboxRow[] = [
    { memberId: "m-ana", name: "Ana", lastMessageAt: "2026-10-25T10:00:00.000Z", unreadCount: 2 },
    { memberId: "m-budi", name: "Budi", lastMessageAt: null, unreadCount: 0 },
  ];

  it("links each person to their conversation", () => {
    render(<InboxList rows={rows} selectedId={null} />);
    expect(screen.getByRole("link", { name: /ana/i })).toHaveAttribute("href", "/coach?member=m-ana");
    expect(screen.getByRole("link", { name: /budi/i })).toHaveAttribute("href", "/coach?member=m-budi");
  });

  it("shows how many messages are waiting", () => {
    render(<InboxList rows={rows} selectedId={null} />);
    expect(screen.getByRole("link", { name: /ana/i })).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /ana/i })).toHaveAccessibleName(/2 unread/i);
  });

  it("marks the open conversation", () => {
    render(<InboxList rows={rows} selectedId="m-budi" />);
    expect(screen.getByRole("link", { name: /budi/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /ana/i })).not.toHaveAttribute("aria-current");
  });

  it("says when someone has not written yet", () => {
    render(<InboxList rows={rows} selectedId={null} />);
    expect(screen.getByRole("link", { name: /budi/i })).toHaveTextContent(/no messages/i);
  });

  it("says when there is nobody to talk to", () => {
    render(<InboxList rows={[]} selectedId={null} />);
    expect(screen.getByText(/no active members/i)).toBeInTheDocument();
  });
});

describe("ResultsView when an admin looks at someone else's results", () => {
  it("names the member instead of saying 'you' or 'your'", () => {
    const { container } = render(<ResultsView profile={profile} subjectName="Abdul Rozak" />);
    expect(screen.getByText("What Abdul Rozak emphasised")).toBeInTheDocument();
    expect(screen.getByText("Abdul Rozak's character profile")).toBeInTheDocument();
    expect(screen.getByText("Abdul Rozak's answers (2)")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/1:1 with Abdul Rozak/);
    expect(container.textContent).not.toMatch(/\byou(r)?\b/i);
  });

  it("labels the member summary as the note the member sees", () => {
    render(<ResultsView profile={profile} subjectName="Abdul Rozak" />);
    expect(screen.getByText("Note shown to Abdul Rozak")).toBeInTheDocument();
  });

  it("keeps the second-person wording for the member's own view", () => {
    render(<ResultsView profile={profile} />);
    expect(screen.getByText("What you emphasised")).toBeInTheDocument();
    expect(screen.getByText("Your character profile")).toBeInTheDocument();
    expect(screen.getByText("Your answers (2)")).toBeInTheDocument();
  });
});
