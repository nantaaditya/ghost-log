import { db } from "@/lib/db/client";
import { kpiGoals, type KpiGoal, type NewKpiGoal } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import type { UpdateGoalDto } from "./validation";

export async function listByUser(userId: string, cycleYear: number): Promise<KpiGoal[]> {
  return db
    .select()
    .from(kpiGoals)
    .where(and(eq(kpiGoals.userId, userId), eq(kpiGoals.cycleYear, cycleYear)))
    .orderBy(asc(kpiGoals.sortOrder), asc(kpiGoals.createdAt));
}

/** Only goals the manager has shared; drafts are filtered in SQL, not left to the caller. */
export async function listSharedByUser(userId: string, cycleYear: number): Promise<KpiGoal[]> {
  return db
    .select()
    .from(kpiGoals)
    .where(
      and(
        eq(kpiGoals.userId, userId),
        eq(kpiGoals.cycleYear, cycleYear),
        eq(kpiGoals.status, "shared"),
      ),
    )
    .orderBy(asc(kpiGoals.sortOrder), asc(kpiGoals.createdAt));
}

export async function findById(id: string): Promise<KpiGoal | null> {
  const [row] = await db.select().from(kpiGoals).where(eq(kpiGoals.id, id)).limit(1);
  return row ?? null;
}

export async function create(dto: NewKpiGoal): Promise<KpiGoal> {
  const [row] = await db.insert(kpiGoals).values(dto).returning();
  return row;
}

export async function update(id: string, dto: UpdateGoalDto): Promise<KpiGoal | null> {
  const [row] = await db
    .update(kpiGoals)
    .set({ ...dto, updatedAt: new Date() })
    .where(eq(kpiGoals.id, id))
    .returning();

  return row ?? null;
}

export async function remove(id: string): Promise<void> {
  await db.delete(kpiGoals).where(eq(kpiGoals.id, id));
}
