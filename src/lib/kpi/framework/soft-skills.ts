import type { SoftSkill } from "./types";

// DRAFT for the manager to review. One track per survey dimension, written as observable working
// practices. The survey is a self-reflection aid, not a validated assessment: these tracks are
// development support and must not be used as a rating, ranking or promotion criterion.

export const SOFT_SKILLS: readonly SoftSkill[] = [
  {
    key: "delivery-ambition",
    dimension: "Ambition",
    title: "Setting and reaching stretch goals",
    summary: "Choosing goals that stretch, tracking them visibly and finishing what was committed.",
    developmentActions: [
      "Pick one stretch goal per quarter and write its success measure down with your manager.",
      "Review progress against it every 2 weeks in the 1:1.",
      "Hold a short retrospective on each finished goal: what made it hard and what you would repeat.",
    ],
    exampleKpis: [
      "Complete 3 of 4 quarterly stretch goals agreed with the manager, each with a written success measure.",
      "Present 1 delivered improvement to the wider team per half year.",
    ],
    watchFor:
      "Ambition without a sustainable pace burns people out; pair every stretch goal with explicit scope and support.",
  },
  {
    key: "ownership-decisions",
    dimension: "Ownership",
    title: "Ownership and decision-making",
    summary: "Taking responsibility for outcomes end to end and making timely, explained decisions.",
    developmentActions: [
      "Own one service area or flow end to end, including its alerts and runbook.",
      "Write short decision records (context, options, choice) for 3 significant decisions.",
      "Raise risks early: flag them in the weekly report together with a proposed mitigation.",
    ],
    exampleKpis: [
      "Author 4 decision records per half year, each reviewed by a peer.",
      "Raise at-risk items in the weekly report at least 1 week before a date is missed, in 90% of cases.",
    ],
    watchFor:
      "Ownership can slide into doing everything alone; make sure context is shared and work is delegated or documented.",
  },
  {
    key: "resilience-pace",
    dimension: "Resilience",
    title: "Working well under pressure and change",
    summary: "Staying effective under pressure and recovering well from incidents, setbacks and change.",
    developmentActions: [
      "Agree with your manager on an early-warning sign and a response, such as asking for help when blocked for 1 day.",
      "After an incident or setback, write a blameless note on what you learned.",
      "Plan recovery time after high-pressure periods with your manager.",
    ],
    exampleKpis: [
      "Write a blameless learning note for each incident or major setback you took part in (target: 100%).",
      "Ask for help within 1 working day when blocked, in at least 90% of the blockers noted in weekly reports.",
    ],
    watchFor:
      "Never turn wellbeing into a performance metric. Treat this track as agreed ways of working and support, not as a rating of the person.",
  },
  {
    key: "learning-agility",
    dimension: "Learning",
    title: "Learning agility",
    summary: "Acquiring new knowledge quickly and turning it into shared capability.",
    developmentActions: [
      "Pick one domain topic per quarter (for example ISO 8583, tokenization or settlement) and produce a small practical output.",
      "Give one internal talk or write-up per half year.",
      "Pair with a specialist on a real task for 2 sprints.",
    ],
    exampleKpis: [
      "Complete 2 domain learning goals per half year, each with a demo or write-up shared with the team.",
      "Deliver 1 internal talk per half year with an average feedback score of at least 4 out of 5.",
    ],
    watchFor: "Learning needs protected time. Agree the capacity up front or the goal silently drops.",
  },
  {
    key: "collaboration-communication",
    dimension: "People",
    title: "Collaboration and communication",
    summary: "Working well with others, communicating clearly and helping the team improve.",
    developmentActions: [
      "Give one piece of specific, kind feedback to a peer every 2 weeks.",
      "Write weekly reports that state outcomes, risks and asks clearly, using the writing guide.",
      "Mentor or pair with a newer teammate for one sprint.",
    ],
    exampleKpis: [
      "Submit 90% of weekly reports on time, each with an explicit risk or ask when one applies.",
      "Run 3 pairing or mentoring sessions per quarter and note what the other person learned.",
    ],
    watchFor:
      "A strong people focus can mean avoiding conflict; practise raising disagreement early and respectfully.",
  },
  {
    key: "product-vision-context",
    dimension: "Vision",
    title: "Product and business context",
    summary: "Connecting day-to-day work to customer and business outcomes.",
    developmentActions: [
      "Shadow a customer-support or operations session once a quarter to see real card issues.",
      "Explain in two sentences the business reason behind each task you pick up.",
      "Read the quarter's business goals and map your work to them with your manager.",
    ],
    exampleKpis: [
      "Complete 2 operations or support shadowing sessions per half year and file 1 improvement idea from each.",
      "Link 100% of quarterly goals to a stated business outcome in the plan.",
    ],
    watchFor:
      "Vision work needs access to context. The manager has to provide it, not just ask for the result.",
  },
];
