import { isDeepStrictEqual } from "node:util";
import type { KpiProfile, NewKpiGoal, NewKpiProfile } from "@/lib/db/schema";
import type { ImportPayload, ImportPerson } from "./import-payload";
import { resolveMembers, type ImportUser, type NameMapping } from "./resolve-members";

export interface ImportDeps {
  findExisting(userId: string, cycleYear: number): Promise<KpiProfile | null>;
  upsert(profile: NewKpiProfile): Promise<void>;
  countGoals(userId: string, cycleYear: number): Promise<number>;
  insertGoals(goals: NewKpiGoal[]): Promise<void>;
}

export interface ImportResult {
  created: string[];
  updated: string[];
  unchanged: string[];
  /** People whose proposed goals were inserted as drafts. */
  goalsCreated: string[];
  /** People who already had goals for the cycle; their goals are never overwritten. */
  goalsSkipped: string[];
  problems: string[];
}

/** Proposed goals always arrive as private drafts; the manager shares them later. */
export function toNewGoals(
  goals: ImportPerson["goals"],
  userId: string,
  cycleYear: number,
): NewKpiGoal[] {
  return goals.map((goal, index) => ({
    userId,
    cycleYear,
    type: goal.type,
    skillKey: goal.skillKey ?? null,
    title: goal.title,
    measure: goal.measure,
    milestones: goal.milestones,
    developmentAction: goal.developmentAction,
    evidenceSource: goal.evidenceSource ?? null,
    status: "draft",
    sortOrder: index,
  }));
}

export function toNewProfile(person: ImportPerson, userId: string, cycleYear: number): NewKpiProfile {
  return {
    userId,
    cycleYear,
    fingerprint: person.fingerprint,
    scores: person.scores,
    profile: person.profile,
    answers: person.answers,
    memberSummary: person.memberSummary,
    managerSummary: person.managerSummary,
    managerDecisions: person.managerDecisions,
  };
}

/**
 * The columns a re-import overwrites. Ownership (userId, cycleYear) is never part of it. The
 * manager's notes and the member summary are written only when the export provides them, so
 * re-importing a trimmed export never erases text a person wrote.
 */
export function profileUpdateSet(dto: NewKpiProfile) {
  return {
    fingerprint: dto.fingerprint,
    scores: dto.scores,
    profile: dto.profile,
    answers: dto.answers,
    importedAt: new Date(),
    ...(dto.memberSummary !== undefined && { memberSummary: dto.memberSummary }),
    ...(dto.managerSummary !== undefined && { managerSummary: dto.managerSummary }),
    ...(dto.managerDecisions !== undefined && { managerDecisions: dto.managerDecisions }),
  };
}

// jsonb does not preserve key order, so compare structurally rather than by serialized text.
// A field the export does not provide cannot make the profile "changed".
function isSameContent(existing: KpiProfile, next: NewKpiProfile): boolean {
  return (
    existing.fingerprint === next.fingerprint &&
    isDeepStrictEqual(existing.scores, next.scores) &&
    isDeepStrictEqual(existing.profile, next.profile) &&
    isDeepStrictEqual(existing.answers, next.answers) &&
    (next.memberSummary === undefined || (existing.memberSummary ?? null) === next.memberSummary) &&
    (next.managerSummary === undefined || isDeepStrictEqual(existing.managerSummary, next.managerSummary)) &&
    (next.managerDecisions === undefined ||
      isDeepStrictEqual(existing.managerDecisions, next.managerDecisions))
  );
}

/**
 * Imports survey results. All-or-nothing on resolution: if any person cannot be matched to a
 * user, nothing is written. Re-running with the same data changes nothing. A mid-run database
 * failure throws; re-running finishes the rest because already-imported people are unchanged.
 */
export async function runImport(params: {
  payload: ImportPayload;
  users: ReadonlyArray<ImportUser>;
  mapping?: NameMapping;
  deps: ImportDeps;
  dryRun?: boolean;
}): Promise<ImportResult> {
  const { payload, users, mapping, deps, dryRun = false } = params;
  const { matched, problems } = resolveMembers(payload.people, users, mapping);
  if (problems.length > 0) {
    return { ...emptyResult(), problems: [...problems] };
  }

  const result = emptyResult();
  for (const { index, userId } of matched) {
    const person = payload.people[index];
    const next = toNewProfile(person, userId, payload.cycleYear);
    const existing = await deps.findExisting(userId, payload.cycleYear);

    if (existing && isSameContent(existing, next)) {
      result.unchanged.push(person.nama);
    } else {
      (existing ? result.updated : result.created).push(person.nama);
      if (!dryRun) await deps.upsert(next);
    }

    await importGoals({
      person,
      userId,
      cycleYear: payload.goalsCycleYear ?? payload.cycleYear + 1,
      deps,
      dryRun,
      result,
    });
  }
  return result;
}

function emptyResult(): ImportResult {
  return { created: [], updated: [], unchanged: [], goalsCreated: [], goalsSkipped: [], problems: [] };
}

async function importGoals(params: {
  person: ImportPerson;
  userId: string;
  cycleYear: number;
  deps: ImportDeps;
  dryRun: boolean;
  result: ImportResult;
}): Promise<void> {
  const { person, userId, cycleYear, deps, dryRun, result } = params;
  if (person.goals.length === 0) return;

  // Once a user has goals for the cycle, the manager may have edited or shared them; never replace.
  if ((await deps.countGoals(userId, cycleYear)) > 0) {
    result.goalsSkipped.push(person.nama);
    return;
  }
  result.goalsCreated.push(person.nama);
  if (!dryRun) await deps.insertGoals(toNewGoals(person.goals, userId, cycleYear));
}
