import type { KpiInsightItem } from "@/lib/db/schema";

interface ManagerNotesProps {
  summary: readonly KpiInsightItem[];
  decisions: readonly KpiInsightItem[];
}

function NoteList({ title, items }: { title: string; items: readonly KpiInsightItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3 rounded-2xl border border-border/50 p-5">
      <h3 className="text-[0.85rem] font-semibold">{title}</h3>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={`${index}-${item.judul}`} className="space-y-0.5">
            <p className="text-[0.85rem] font-medium">{item.judul}</p>
            <p className="whitespace-pre-wrap text-[0.8rem] leading-relaxed text-foreground/75">{item.isi}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What the survey suggests for the manager's 1:1. Only ever rendered for an admin. */
export default function ManagerNotes({ summary, decisions }: ManagerNotesProps) {
  if (summary.length === 0 && decisions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/60 p-5 text-[0.8rem] text-muted-foreground">
        No manager notes were imported for this person.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div
        role="note"
        className="rounded-2xl bg-amber-500/10 px-4 py-3 text-[0.8rem] leading-relaxed text-foreground/80 ring-1 ring-amber-500/20"
      >
        These are hypotheses from a self-reflection tool, drafted for your 1:1. They are not facts and
        not a basis for rating or promotion. They are not shown to the member.
      </div>
      <NoteList title="What stood out" items={summary} />
      <NoteList title="Ways to open the 1:1" items={decisions} />
    </div>
  );
}
