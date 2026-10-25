import type { MemberGoalDto } from "@/lib/kpi/goal-dto";

interface PlanViewProps {
  /** Only goals the manager has shared, already stripped of the manager's notes. */
  goals: readonly MemberGoalDto[];
  year: number;
}

function GoalCard({ goal }: { goal: MemberGoalDto }) {
  return (
    <li className="space-y-3 rounded-2xl border border-border/50 p-5">
      <h4 className="text-[0.95rem] font-semibold">{goal.title}</h4>
      <dl className="space-y-3 text-[0.85rem]">
        <div>
          <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground/70">
            How we will know
          </dt>
          <dd>{goal.measure}</dd>
        </div>
        <div>
          <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground/70">
            How you will build it
          </dt>
          <dd>{goal.developmentAction}</dd>
        </div>
      </dl>
      {goal.milestones.length > 0 && (
        <ol className="space-y-1.5 border-t border-border/30 pt-3">
          {goal.milestones.map((milestone, index) => (
            <li key={index} className="flex gap-3 text-[0.8rem]">
              <span className="w-8 shrink-0 font-medium text-primary">{milestone.quarter}</span>
              <span>{milestone.description}</span>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

function Group({ title, goals }: { title: string; goals: readonly MemberGoalDto[] }) {
  if (goals.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-[0.85rem] font-semibold">{title}</h3>
      <ul className="space-y-3">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </ul>
    </section>
  );
}

/** The plan as the member sees it. Deliberately omits the manager's evidence notes. */
export default function PlanView({ goals, year }: PlanViewProps) {
  if (goals.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/60 p-5 text-[0.85rem] text-muted-foreground">
        Your manager hasn&apos;t shared a {year} plan yet. You can talk it through in the chat.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Group title="Technical skills" goals={goals.filter((goal) => goal.type === "hard")} />
      <Group title="Behavioral skills" goals={goals.filter((goal) => goal.type === "soft")} />
    </div>
  );
}
