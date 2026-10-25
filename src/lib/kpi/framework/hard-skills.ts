import type { HardSkill } from "./types";

// DRAFT for the manager to review against the company's own job levels and systems.
// Example KPI numbers are illustrative starting points, not targets for any real team.
// Regulatory text changes: always check the current official source before relying on it.

const LEVEL_LABELS = ["Foundation", "Practitioner", "Advanced", "Expert"] as const;

type LevelBehaviors = readonly [
  readonly string[],
  readonly string[],
  readonly string[],
  readonly string[],
];

function levels(behaviors: LevelBehaviors): HardSkill["levels"] {
  return behaviors.map((items, index) => ({
    level: (index + 1) as 1 | 2 | 3 | 4,
    label: LEVEL_LABELS[index],
    behaviors: items,
  }));
}

export const HARD_SKILLS: readonly HardSkill[] = [
  {
    key: "card-lifecycle",
    title: "Card lifecycle management",
    summary:
      "Issuing, activating, controlling and retiring cards: the states, who may change them, and the side effects across systems.",
    levels: levels([
      [
        "Explains the card states (ordered, active, blocked, expired, closed) and who may trigger each transition.",
        "Traces a block request end to end through the code and the systems it touches.",
      ],
      [
        "Implements a state transition with guards, an audit trail and safe handling of duplicate requests.",
        "Handles limit changes, replacement and renewal without leaving the old card usable or data orphaned.",
      ],
      [
        "Designs lifecycle changes that stay consistent across card core, authorization and notification systems, including partial-failure recovery.",
        "Leads reviewed data repairs for stuck or inconsistent card states and fixes the root cause.",
      ],
      [
        "Owns the lifecycle model and its evolution for new products such as virtual cards and tokens.",
        "Anticipates scheme and regulatory changes that affect states and limits and plans them into the roadmap.",
      ],
    ]),
    evidence: [
      "Design notes or pull requests showing state-transition rules with tests.",
      "Defect or incident tickets about card states, resolved with a root cause.",
      "Review comments on lifecycle changes made by others.",
    ],
    exampleKpis: [
      "Cut card-state mismatch tickets between card core and authorization from 8 to at most 2 per quarter.",
      "Deliver the virtual-card activation flow with 100% of state transitions covered by automated tests by end of Q2.",
      "Resolve 90% of stuck-card incidents within 1 business day, each with a documented root cause.",
    ],
  },
  {
    key: "authorization-flow",
    title: "Authorization and switching",
    summary:
      "How a card transaction is routed, authorized and answered in real time: message formats, response codes, timeouts and reversals.",
    levels: levels([
      [
        "Explains authorization, clearing and settlement as separate phases.",
        "Reads an ISO 8583 message and explains its key fields and the common response codes.",
      ],
      [
        "Implements or changes an authorization rule with unit tests and simulator tests.",
        "Handles timeouts, duplicate requests and reversals correctly in a defined flow.",
      ],
      [
        "Diagnoses production declines and latency problems from logs and message traces.",
        "Designs stand-in and fallback behaviour and rolls out changes safely with feature flags or canaries.",
      ],
      [
        "Owns the authorization architecture and readiness for scheme or network certification.",
        "Sets latency and approval-rate targets and drives them across teams.",
      ],
    ]),
    evidence: [
      "Simulator test suites and message traces for the flows they changed.",
      "Analyses of decline-reason distributions with a proposed action.",
      "Certification or user-acceptance test outcomes.",
    ],
    exampleKpis: [
      "Keep authorization p99 latency under 300 ms for 3 consecutive months.",
      "Reduce technical declines (timeouts and system errors) from 0.5% to under 0.2% of attempts by Q3.",
      "Add 20 simulator regression scenarios covering reversals and timeouts by end of Q1.",
    ],
  },
  {
    key: "card-security",
    title: "Card data security and cryptography",
    summary:
      "Protecting card data, PINs and keys: PCI DSS scope, tokenization, HSM use, key handling and 3-D Secure.",
    levels: levels([
      [
        "Explains what counts as cardholder data and why it must be masked, truncated or tokenized.",
        "Keeps sensitive data out of logs, test data and tickets.",
      ],
      [
        "Applies masking and tokenization correctly in code and uses key-management and HSM interfaces as designed.",
        "Reviews changes for sensitive-data exposure in logs, errors and analytics.",
      ],
      [
        "Designs data flows that minimize PCI DSS scope and handles key rotation and token lifecycle changes safely.",
        "Prepares evidence for assessments and fixes the findings.",
      ],
      [
        "Owns the security architecture for card data and leads threat modelling for new products and channels.",
        "Advises on scheme and network security mandates.",
      ],
    ]),
    evidence: [
      "Closed PCI DSS or audit findings with the change that fixed them.",
      "Threat models for new features or channels.",
      "Code reviews that caught sensitive-data exposure.",
    ],
    exampleKpis: [
      "Close 100% of assigned PCI DSS findings before their due dates this year.",
      "Run a key-rotation drill for 2 systems with 0 customer-impacting incidents.",
      "Add automated checks that block card-number patterns in logs, with 0 occurrences found in quarterly log scans.",
    ],
  },
  {
    key: "ledger-accounting",
    title: "Ledger and accounting integrity",
    summary:
      "Representing money correctly: double-entry postings, balances and holds, money arithmetic, and the audit trail behind every number.",
    levels: levels([
      [
        "Explains debits and credits, available versus ledger balance, and authorization holds.",
        "Uses integer minor units or decimal types for money, never floating point.",
      ],
      [
        "Implements postings that always balance, with safe handling of repeated requests.",
        "Writes queries that reconcile balances to postings.",
      ],
      [
        "Designs ledger changes such as a new fee, interest rule or hold type without breaking history.",
        "Corrects past errors with reversible adjusting entries rather than edits, and supports audit requests with evidence.",
      ],
      [
        "Owns ledger design and its invariants and sets money-handling standards across services.",
        "Leads balance migrations with a verified zero-difference cutover.",
      ],
    ]),
    evidence: [
      "Tests asserting posting invariants (debits equal credits).",
      "Reconciliation queries and their results at period close.",
      "Audit or finance requests answered with traceable evidence.",
    ],
    exampleKpis: [
      "Reach 0 unexplained differences between ledger and subledger balances at each month-end close this year.",
      "Run automated invariant checks (debits equal credits) daily on 100% of posted batches.",
      "Ship the fee-posting change with 0 post-release adjustments needed in the first 2 closes.",
    ],
  },
  {
    key: "payment-consistency",
    title: "Consistency in distributed payments",
    summary:
      "Making money movement safe across services and networks: idempotency, retries, timeouts, sagas and compensation.",
    levels: levels([
      [
        "Explains why retries can duplicate a payment and what idempotency means.",
        "Reads a payment flow and finds where it can fail partway.",
      ],
      [
        "Implements idempotency keys and safe retries.",
        "Makes a state change and its outgoing message atomic, for example with the outbox pattern.",
      ],
      [
        "Designs sagas and compensation for multi-step flows and tests them by injecting timeouts, duplicates and partial failures.",
        "Resolves production inconsistencies with reviewed, safe repair procedures.",
      ],
      [
        "Defines consistency standards and shared libraries for the organization.",
        "Leads post-incident reviews that change the architecture, not just the symptom.",
      ],
    ]),
    evidence: [
      "Failure-injection tests for the flows they own.",
      "Post-incident reviews with closed actions.",
      "Design notes describing retry and compensation behaviour.",
    ],
    exampleKpis: [
      "Cover the 5 highest-value payment flows with failure-injection tests (timeout, duplicate, partial failure) by end of Q2.",
      "Reduce duplicate or lost transactions found in reconciliation from 12 to 0 per quarter.",
      "Document and drill the stuck-transaction repair runbook at least 2 times this year.",
    ],
  },
  {
    key: "clearing-settlement",
    title: "Clearing, settlement and reconciliation",
    summary:
      "After authorization: clearing files, interchange and fees, chargebacks, settlement with schemes and partners, and finding and fixing breaks.",
    levels: levels([
      [
        "Explains the difference between authorization, presentment (clearing) and settlement.",
        "Reads a clearing or settlement file and explains its main record types.",
      ],
      [
        "Investigates a reconciliation break to its cause (timing, amount, duplicate or missing record).",
        "Changes file processing with validation and a safe re-run.",
      ],
      [
        "Automates reconciliation and exception handling and handles disputes and chargebacks end to end, including deadlines.",
        "Designs processing that is restartable and auditable.",
      ],
      [
        "Owns the settlement architecture and its technical partner and scheme relationships.",
        "Leads onboarding of new schemes or acquirers.",
      ],
    ]),
    evidence: [
      "Reconciliation reports and the count of exceptions cleared.",
      "Runbooks for file processing and re-runs.",
      "Chargeback handling records against deadlines.",
    ],
    exampleKpis: [
      "Raise the automatic reconciliation match rate from 97% to 99.5% by end of Q3.",
      "Clear 95% of reconciliation exceptions within 2 business days.",
      "Meet 100% of chargeback response deadlines this year.",
    ],
  },
  {
    key: "fraud-risk",
    title: "Fraud and risk controls",
    summary:
      "Detecting and limiting card fraud without hurting good customers: rules, velocity checks, scoring and case handling.",
    levels: levels([
      [
        "Explains common card fraud patterns (card-not-present, account takeover, card testing) and their basic controls.",
        "Reads rule definitions and explains their effect.",
      ],
      [
        "Implements and tests a rule or limit change.",
        "Measures its effect on fraud caught and on legitimate declines.",
      ],
      [
        "Designs real-time risk checks within a latency budget.",
        "Tunes thresholds with data and reviews false positives together with the business.",
      ],
      [
        "Owns the fraud-control strategy and tooling with the risk team.",
        "Introduces new signals or models with measurable gain and governance.",
      ],
    ]),
    evidence: [
      "Rule-change analyses with before and after metrics.",
      "Fraud case reviews with the control that would have helped.",
    ],
    exampleKpis: [
      "Reduce confirmed card-testing fraud losses by 30% against last year while keeping false declines under 0.3%.",
      "Ship 3 new risk rules, each with a documented before and after analysis.",
      "Keep latency added by fraud checks under 20 ms at p95.",
    ],
  },
  {
    key: "regulatory-compliance",
    title: "Regulation, compliance and auditability",
    summary:
      "Building to the rules that apply to card and payment systems: central-bank and financial-regulator requirements, scheme rules, data protection and audit trails. Always verify against the current official text.",
    levels: levels([
      [
        "Knows which regulations and scheme rules apply to the products they work on and where to find the current text.",
        "Keeps the audit logs and change records the rules require.",
      ],
      [
        "Turns a regulatory requirement into concrete acceptance criteria and tests.",
        "Answers audit requests with accurate evidence.",
      ],
      [
        "Plans delivery against regulatory deadlines together with compliance and legal.",
        "Designs systems with retention, access control and traceability built in.",
      ],
      [
        "Anticipates regulatory change and shapes the roadmap early.",
        "Represents engineering with regulators, auditors and partners.",
      ],
    ]),
    evidence: [
      "A traceability matrix from requirement to test.",
      "Closed audit findings.",
      "Compliance sign-offs on delivered changes.",
    ],
    exampleKpis: [
      "Deliver 100% of regulatory change items by their deadlines this year, each with a traceability matrix.",
      "Close all assigned audit findings within the agreed 30 days.",
      "Complete a user-access review for 3 card systems each half year with 0 overdue items.",
    ],
  },
  {
    key: "reliability-operations",
    title: "Reliability and operations",
    summary:
      "Keeping a 24/7 financial system dependable: observability, incident response, capacity, resilience and learning from failures.",
    levels: levels([
      [
        "Reads dashboards and alerts and follows runbooks for the systems they touch.",
        "Reports incidents clearly and promptly.",
      ],
      [
        "Adds useful metrics, alerts and logs together with each change.",
        "Takes part in incident response and writes accurate timelines.",
      ],
      [
        "Leads incident response and defines service-level objectives for business-critical flows such as approval rate and latency.",
        "Finds and removes recurring causes.",
      ],
      [
        "Owns resilience and disaster-recovery strategy.",
        "Sets reliability standards and error budgets across teams.",
      ],
    ]),
    evidence: [
      "Postmortems with closed action items.",
      "Service-level dashboards for the flows they own.",
      "Disaster-recovery test results.",
    ],
    exampleKpis: [
      "Keep monthly availability of the authorization service at or above 99.95%.",
      "Complete 100% of postmortem action items for P1 incidents within 30 days.",
      "Run 2 disaster-recovery drills with recovery time within the agreed target.",
    ],
  },
  {
    key: "financial-correctness-testing",
    title: "Testing for financial correctness",
    summary:
      "Proving money logic is right: test design for edge cases, simulators, reconciliation-based tests and safe test data.",
    levels: levels([
      [
        "Writes clear unit tests that include boundary amounts, currencies and rounding.",
        "Never uses real card data in tests.",
      ],
      [
        "Builds integration tests with network or scheme simulators.",
        "Tests idempotency, reversal and timeout paths.",
      ],
      [
        "Designs a test strategy across services, including property-based and reconciliation-based checks.",
        "Makes releases safe with canary and rollback tests.",
      ],
      [
        "Sets the quality bar and tooling for the organization and coaches others.",
        "Turns test escapes into process improvements.",
      ],
    ]),
    evidence: [
      "Test coverage of the critical money flows.",
      "Defect-escape analysis after releases.",
      "A written test-data policy that is followed.",
    ],
    exampleKpis: [
      "Keep line coverage of money-calculation modules at or above 90% while adding 15 boundary and rounding cases.",
      "Reduce production defects in payment flows found after release from 6 to 2 per quarter.",
      "Automate the 10 most-used regression scenarios and run them on every release.",
    ],
  },
];
