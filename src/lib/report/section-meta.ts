export const SECTION_META = {
  escalations: {
    emoji: "🚨",
    number: 1,
    title: "Escalations & Blockers",
    helper: "Things you can't unblock alone. Lead with the ask — what do you need from leadership?",
  },
  productionHealth: {
    emoji: "📉",
    number: 2,
    title: "Production Health & Incidents",
    helper: "User-impacting issues from the last week. Problem first, root cause, next move.",
  },
  techDebt: {
    emoji: "🛠",
    number: 3,
    title: "Technical Debt & Architecture",
    helper: "Debt taken on, paid down, or proposed. Surface trade-offs leadership should know.",
  },
  delivery: {
    emoji: "🚀",
    number: 4,
    title: "Delivery & Execution",
    helper: "Sprint goal status per project. Be honest about Missed — patterns matter more than one week.",
  },
  lookAhead: {
    emoji: "🔮",
    number: 5,
    title: "Look Ahead",
    helper: "Top two priorities next week. If you can't pick two, you don't have priorities.",
  },
  ghibah: {
    emoji: "💬",
    number: 6,
    title: "Ghibah Online",
    helper: "Casual notes — team mood, off-topic wins, anything that doesn't fit elsewhere. Optional.",
  },
} as const;

export const GUIDE_PRINCIPLES = {
  purpose: "Help your manager act in 30 seconds: scan headers, drill into what matters, escalate what you flag.",
  bluf: "BLUF — Bottom Line Up Front. State the conclusion first. Don't bury the ask in paragraph three.",
  empty: "Skip sections that don't apply. A short honest report beats a padded one.",
} as const;
