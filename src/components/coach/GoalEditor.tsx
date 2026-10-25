"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { KpiMilestone } from "@/lib/db/schema";
import { HARD_SKILLS, SOFT_SKILLS } from "@/lib/kpi/framework";
import { goalTemplateFromSkill } from "@/lib/kpi/framework/templates";
import type { GoalDto } from "@/lib/kpi/goal-dto";
import { goalDraftSchema, MAX_MILESTONES } from "@/lib/kpi/validation";

const JSON_HEADERS = { "Content-Type": "application/json" };
const QUARTERS: KpiMilestone["quarter"][] = ["Q1", "Q2", "Q3", "Q4"];
const BLANK_PREFIX = "blank:";
const SELECT_CLASS =
  "h-9 rounded-xl border border-border/60 bg-muted/50 px-3 text-sm outline-none focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20";

type GoalType = GoalDto["type"];

interface GoalFields {
  type: GoalType;
  skillKey: string;
  title: string;
  measure: string;
  developmentAction: string;
  evidenceSource: string;
  milestones: KpiMilestone[];
}

interface CardState {
  key: string;
  /** Null until the goal has been created on the server. */
  id: string | null;
  status: GoalDto["status"];
  /** What the server holds; null for a goal that has never been saved. */
  saved: GoalFields | null;
  fields: GoalFields;
  busy: "save" | "share" | "delete" | null;
  error: string | null;
  confirmingDelete: boolean;
}

function fieldsOf(dto: GoalDto): GoalFields {
  return {
    type: dto.type,
    skillKey: dto.skillKey,
    title: dto.title,
    measure: dto.measure,
    developmentAction: dto.developmentAction,
    evidenceSource: dto.evidenceSource,
    milestones: dto.milestones.map((milestone) => ({ ...milestone })),
  };
}

function cardFromDto(dto: GoalDto): CardState {
  const fields = fieldsOf(dto);
  return {
    key: dto.id,
    id: dto.id,
    status: dto.status,
    saved: fields,
    fields,
    busy: null,
    error: null,
    confirmingDelete: false,
  };
}

function blankFields(type: GoalType): GoalFields {
  return {
    type,
    skillKey: "",
    title: "",
    measure: "",
    developmentAction: "",
    evidenceSource: "",
    milestones: [],
  };
}

function isDirty(card: CardState): boolean {
  return card.saved === null || JSON.stringify(card.saved) !== JSON.stringify(card.fields);
}

async function call(url: string, method: string, body?: unknown): Promise<{ id?: string; status?: GoalDto["status"] }> {
  const res = await fetch(url, {
    method,
    headers: JSON_HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Request failed");
  return json.data ?? {};
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

interface GoalEditorProps {
  userId: string;
  cycleYear: number;
  initialGoals: readonly GoalDto[];
}

/** The manager's editor for one member's goals: draft, refine, then share with the member. */
export default function GoalEditor({ userId, cycleYear, initialGoals }: GoalEditorProps) {
  const [cards, setCards] = useState<CardState[]>(() => initialGoals.map(cardFromDto));
  const [startFrom, setStartFrom] = useState(`${BLANK_PREFIX}hard`);
  const newKeyCounter = useRef(0);

  function patchCard(key: string, changes: Partial<CardState>) {
    setCards((prev) => prev.map((card) => (card.key === key ? { ...card, ...changes } : card)));
  }

  function editFields(key: string, changes: Partial<GoalFields>) {
    setCards((prev) =>
      prev.map((card) =>
        card.key === key
          ? { ...card, fields: { ...card.fields, ...changes }, error: null, confirmingDelete: false }
          : card,
      ),
    );
  }

  function addGoal() {
    const fields = startFrom.startsWith(BLANK_PREFIX)
      ? blankFields(startFrom.slice(BLANK_PREFIX.length) as GoalType)
      : goalTemplateFromSkill(startFrom);
    if (!fields) return;

    newKeyCounter.current += 1;
    const card: CardState = {
      key: `new-${newKeyCounter.current}`,
      id: null,
      status: "draft",
      saved: null,
      fields: { ...fields, milestones: [...fields.milestones] },
      busy: null,
      error: null,
      confirmingDelete: false,
    };
    setCards((prev) => [...prev, card]);
  }

  async function save(card: CardState) {
    const parsed = goalDraftSchema.safeParse(card.fields);
    if (!parsed.success) {
      patchCard(card.key, { error: parsed.error.issues[0]?.message ?? "This goal is not valid yet" });
      return;
    }

    patchCard(card.key, { busy: "save", error: null });
    try {
      const data =
        card.id === null
          ? await call("/api/admin/kpi/goals", "POST", { userId, cycleYear, ...parsed.data })
          : await call(`/api/admin/kpi/goals/${card.id}`, "PATCH", parsed.data);

      const saved: GoalFields = {
        type: parsed.data.type,
        skillKey: parsed.data.skillKey ?? "",
        title: parsed.data.title,
        measure: parsed.data.measure,
        developmentAction: parsed.data.developmentAction,
        evidenceSource: parsed.data.evidenceSource ?? "",
        milestones: parsed.data.milestones,
      };
      patchCard(card.key, {
        id: card.id ?? data.id ?? null,
        status: data.status ?? card.status,
        saved,
        fields: saved,
        busy: null,
      });
      toast.success("Goal saved");
    } catch (error) {
      patchCard(card.key, { busy: null });
      toast.error(errorMessage(error, "Failed to save goal"));
    }
  }

  async function toggleShare(card: CardState) {
    if (card.id === null) return;
    const next: GoalDto["status"] = card.status === "shared" ? "draft" : "shared";
    patchCard(card.key, { busy: "share" });
    try {
      await call(`/api/admin/kpi/goals/${card.id}`, "PATCH", { status: next });
      patchCard(card.key, { status: next, busy: null });
    } catch (error) {
      patchCard(card.key, { busy: null });
      toast.error(errorMessage(error, "Failed to update sharing"));
    }
  }

  async function remove(card: CardState) {
    if (card.id === null) {
      setCards((prev) => prev.filter((other) => other.key !== card.key));
      return;
    }
    if (!card.confirmingDelete) {
      patchCard(card.key, { confirmingDelete: true });
      return;
    }

    patchCard(card.key, { busy: "delete" });
    try {
      await call(`/api/admin/kpi/goals/${card.id}`, "DELETE");
      setCards((prev) => prev.filter((other) => other.key !== card.key));
    } catch (error) {
      patchCard(card.key, { busy: null, confirmingDelete: false });
      toast.error(errorMessage(error, "Failed to delete goal"));
    }
  }

  return (
    <div className="space-y-5">
      {cards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 p-5 text-[0.85rem] text-muted-foreground">
          No goals yet. Start from a framework skill below, or write one from scratch.
        </p>
      ) : (
        <ul className="space-y-4">
          {cards.map((card, index) => (
            <li key={card.key}>
              <GoalCard
                card={card}
                position={index + 1}
                onEdit={(changes) => editFields(card.key, changes)}
                onSave={() => void save(card)}
                onToggleShare={() => void toggleShare(card)}
                onDelete={() => void remove(card)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-muted/30 p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="goal-start-from" className="text-[0.7rem] font-medium text-muted-foreground">
            Start from
          </label>
          <select
            id="goal-start-from"
            value={startFrom}
            onChange={(event) => setStartFrom(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value={`${BLANK_PREFIX}hard`}>Blank technical goal</option>
            <option value={`${BLANK_PREFIX}soft`}>Blank behavioral goal</option>
            <optgroup label="Technical skills">
              {HARD_SKILLS.map((skill) => (
                <option key={skill.key} value={skill.key}>
                  {skill.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Behavioral skills">
              {SOFT_SKILLS.map((skill) => (
                <option key={skill.key} value={skill.key}>
                  {skill.title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <Button variant="outline" onClick={addGoal}>
          <Plus className="h-4 w-4" />
          Add goal
        </Button>
      </div>
    </div>
  );
}

interface GoalCardProps {
  card: CardState;
  position: number;
  onEdit: (changes: Partial<GoalFields>) => void;
  onSave: () => void;
  onToggleShare: () => void;
  onDelete: () => void;
}

function statusLabel(card: CardState): string {
  if (card.id === null) return "Not saved yet";
  return card.status === "shared" ? "Shared with member" : "Draft · only you can see this";
}

function GoalCard({ card, position, onEdit, onSave, onToggleShare, onDelete }: GoalCardProps) {
  const { fields } = card;
  const dirty = isDirty(card);
  const busy = card.busy !== null;

  function setMilestone(index: number, changes: Partial<KpiMilestone>) {
    onEdit({
      milestones: fields.milestones.map((milestone, i) => (i === index ? { ...milestone, ...changes } : milestone)),
    });
  }

  return (
    <section
      role="group"
      aria-label={`Goal ${position}`}
      className="space-y-4 rounded-2xl border border-border/50 p-5"
    >
      <header className="flex flex-wrap items-center gap-2 text-[0.7rem] font-medium">
        <span className="rounded-full bg-foreground/10 px-2 py-0.5">
          {fields.type === "hard" ? "Technical" : "Behavioral"}
        </span>
        <span
          className={
            card.status === "shared" && card.id !== null
              ? "rounded-full bg-primary/10 px-2 py-0.5 text-primary"
              : "rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400"
          }
        >
          {statusLabel(card)}
        </span>
      </header>

      {card.id !== null && card.status === "shared" && (
        <p className="text-[0.75rem] text-muted-foreground">
          The member sees this goal as soon as you save changes.
        </p>
      )}

      {/* Locked during a save, so text typed meanwhile cannot be replaced by the saved snapshot. */}
      <fieldset disabled={card.busy === "save"} className="m-0 min-w-0 space-y-3 border-0 p-0">
        <div className="space-y-1">
          <span aria-hidden className="text-[0.7rem] font-medium text-muted-foreground">Title</span>
          <Input aria-label="Title" value={fields.title} onChange={(e) => onEdit({ title: e.target.value })} />
        </div>
        <div className="space-y-1">
          <span aria-hidden className="text-[0.7rem] font-medium text-muted-foreground">
            How we will know (include a target number)
          </span>
          <Textarea
            aria-label="Measure"
            rows={2}
            className="min-h-16"
            value={fields.measure}
            onChange={(e) => onEdit({ measure: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <span aria-hidden className="text-[0.7rem] font-medium text-muted-foreground">
            How they will build it
          </span>
          <Textarea
            aria-label="Development action"
            rows={2}
            className="min-h-16"
            value={fields.developmentAction}
            onChange={(e) => onEdit({ developmentAction: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <span aria-hidden className="text-[0.7rem] font-medium text-muted-foreground">
            Why this goal (only you see this)
          </span>
          <Textarea
            aria-label="Evidence"
            rows={2}
            className="min-h-16"
            value={fields.evidenceSource}
            onChange={(e) => onEdit({ evidenceSource: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <span aria-hidden className="text-[0.7rem] font-medium text-muted-foreground">Milestones</span>
          {fields.milestones.map((milestone, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                aria-label={`Milestone ${index + 1} quarter`}
                value={milestone.quarter}
                onChange={(e) => setMilestone(index, { quarter: e.target.value as KpiMilestone["quarter"] })}
                className={SELECT_CLASS}
              >
                {QUARTERS.map((quarter) => (
                  <option key={quarter} value={quarter}>
                    {quarter}
                  </option>
                ))}
              </select>
              <Input
                aria-label={`Milestone ${index + 1} description`}
                value={milestone.description}
                onChange={(e) => setMilestone(index, { description: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove milestone ${index + 1}`}
                onClick={() => onEdit({ milestones: fields.milestones.filter((_, i) => i !== index) })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {fields.milestones.length < MAX_MILESTONES && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit({ milestones: [...fields.milestones, { quarter: "Q1", description: "" }] })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add milestone
            </Button>
          )}
        </div>
      </fieldset>

      {card.error && (
        <p role="alert" className="text-[0.8rem] text-destructive">
          {card.error}
        </p>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-border/30 pt-4">
        <Button onClick={onSave} disabled={!dirty || busy} loading={card.busy === "save"}>
          Save
        </Button>
        <Button
          variant="outline"
          onClick={onToggleShare}
          disabled={card.id === null || dirty || busy}
          loading={card.busy === "share"}
        >
          {card.status === "shared" ? "Unshare" : "Share with member"}
        </Button>
        <Button
          variant="ghost"
          className="ml-auto text-destructive"
          onClick={onDelete}
          disabled={busy}
          loading={card.busy === "delete"}
        >
          <Trash2 className="h-4 w-4" />
          {card.confirmingDelete ? "Confirm delete" : "Delete"}
        </Button>
      </footer>
    </section>
  );
}
