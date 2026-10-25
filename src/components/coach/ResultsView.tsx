import type { MemberProfile } from "@/lib/kpi/profile-repository";

// Friendly labels for the survey's character-profile keys, in the order the survey asks them.
const PROFILE_LABELS: ReadonlyArray<readonly [string, string]> = [
  ["gaya_sosial", "Social style"],
  ["pemulihan", "How you recharge"],
  ["peran_tim", "Team role"],
  ["motivator", "Motivator"],
  ["gaya_konflik", "Conflict style"],
  ["kekuatan", "Strength"],
  ["growth", "Growth area"],
  ["energi", "Energy"],
];

const EMPTY_VALUE = "—";

interface ResultsViewProps {
  profile: MemberProfile;
  /** Set when someone else is reading these results (an admin), so the copy names the member. */
  subjectName?: string;
}

interface Copy {
  banner: string;
  summaryHeading: string;
  emphasisHeading: string;
  emphasisIntro: string;
  profileHeading: string;
  rechargeLabel: string;
  answersHeading: (count: number) => string;
}

const SELF_NOTE = "This is a self-reflection, not a rating. It is not used to rate, rank or promote anyone; it is a starting point for";

function copyFor(subjectName: string | undefined): Copy {
  if (!subjectName) {
    return {
      banner: `${SELF_NOTE} your 1:1.`,
      summaryHeading: "A note for you",
      emphasisHeading: "What you emphasised",
      emphasisIntro:
        "Each question asked you to pick one of six options, so these counts show which themes you chose most often. A low count means you rarely chose it, not that you are weak at it.",
      profileHeading: "Your character profile",
      rechargeLabel: "How you recharge",
      answersHeading: (count) => `Your answers (${count})`,
    };
  }
  return {
    banner: `${SELF_NOTE} the 1:1 with ${subjectName}.`,
    summaryHeading: `Note shown to ${subjectName}`,
    emphasisHeading: `What ${subjectName} emphasised`,
    emphasisIntro:
      "Each question asked them to pick one of six options, so these counts show which themes they chose most often. A low count means they rarely chose it, not that they are weak at it.",
    profileHeading: `${subjectName}'s character profile`,
    rechargeLabel: "How they recharge",
    answersHeading: (count) => `${subjectName}'s answers (${count})`,
  };
}

function DimensionDots({ filled, total }: { filled: number; total: number }) {
  return (
    <span aria-hidden className="flex gap-0.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`size-1.5 rounded-full ${index < filled ? "bg-primary" : "bg-muted-foreground/20"}`}
        />
      ))}
    </span>
  );
}

/**
 * A member's own survey results. Scores are shown as counts only: each question picked one of six
 * options, so a count says what was chosen most often, never how capable someone is, and it must
 * not be compared across people (hence no percentages and no ranking against others).
 */
export default function ResultsView({ profile, subjectName }: ResultsViewProps) {
  const copy = copyFor(subjectName);
  // Array.prototype.sort is stable, so ties keep the survey's own dimension order.
  const dimensions = [...profile.scores].sort((a, b) => b.jumlah - a.jumlah);

  return (
    <div className="space-y-5">
      <div
        role="note"
        className="rounded-2xl bg-primary/5 px-4 py-3 text-[0.8rem] leading-relaxed text-foreground/80 ring-1 ring-primary/15"
      >
        {copy.banner}
      </div>

      {profile.memberSummary && (
        <section className="space-y-2 rounded-2xl border border-border/50 p-5">
          <h3 className="text-[0.85rem] font-semibold">{copy.summaryHeading}</h3>
          <p className="whitespace-pre-wrap text-[0.85rem] leading-relaxed text-foreground/80">
            {profile.memberSummary}
          </p>
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-border/50 p-5">
        <div className="space-y-1">
          <h3 className="text-[0.85rem] font-semibold">{copy.emphasisHeading}</h3>
          <p className="text-[0.75rem] leading-relaxed text-muted-foreground">{copy.emphasisIntro}</p>
        </div>
        <ul className="divide-y divide-border/30">
          {dimensions.map((score) => (
            <li
              key={score.kode}
              data-testid="dimension-row"
              data-dimension={score.dimensi}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <span className="text-[0.85rem] font-medium">{score.dimensi}</span>
              <span className="flex items-center gap-3">
                <DimensionDots filled={score.jumlah} total={score.total} />
                <span className="w-16 text-right text-[0.75rem] tabular-nums text-muted-foreground">
                  {score.jumlah} of {score.total}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-border/50 p-5">
        <h3 className="text-[0.85rem] font-semibold">{copy.profileHeading}</h3>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {PROFILE_LABELS.map(([key, defaultLabel]) => {
            const label = key === "pemulihan" ? copy.rechargeLabel : defaultLabel;
            return (
            <div key={key}>
              <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground/70">
                {label}
              </dt>
              <dd className="text-[0.85rem]">{profile.profile[key] || EMPTY_VALUE}</dd>
            </div>
            );
          })}
        </dl>
      </section>

      <details className="rounded-2xl border border-border/50 p-5">
        <summary className="cursor-pointer text-[0.85rem] font-semibold">
          {copy.answersHeading(profile.answers.length)}
        </summary>
        <ol className="mt-4 space-y-4">
          {profile.answers.map((answer) => (
            <li key={answer.q} className="space-y-1">
              <p className="text-[0.75rem] text-muted-foreground">
                <span className="font-medium">{answer.q}.</span> <span>{answer.pertanyaan}</span>
              </p>
              <p className="whitespace-pre-wrap text-[0.85rem]">{answer.jawaban}</p>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
