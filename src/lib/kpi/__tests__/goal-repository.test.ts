import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

vi.mock("@/lib/db/client", async () => {
  const { createTestDb } = await import("@/test/pg-test-db");
  return { db: await createTestDb() };
});

import { db } from "@/lib/db/client";
import { kpiGoals, users, type NewKpiGoal } from "@/lib/db/schema";
import {
  create,
  findById,
  listByUser,
  listSharedByUser,
  remove,
  update,
} from "../goal-repository";

const ANA = "11111111-1111-4111-8111-111111111111";
const BUDI = "22222222-2222-4222-8222-222222222222";

function goal(overrides: Partial<NewKpiGoal> = {}): NewKpiGoal {
  return {
    userId: ANA,
    cycleYear: 2027,
    type: "hard",
    title: "Own reconciliation",
    measure: "Match rate from 97% to 99.5%",
    developmentAction: "Pair with the settlement owner",
    milestones: [{ quarter: "Q1", description: "Map the flow" }],
    ...overrides,
  };
}

beforeAll(async () => {
  await db.insert(users).values([
    { id: ANA, email: "ana@example.com", name: "Ana", role: "member", status: "active" },
    { id: BUDI, email: "budi@example.com", name: "Budi", role: "member", status: "active" },
  ]);
});

beforeEach(async () => {
  await db.delete(kpiGoals);
});

describe("create / findById", () => {
  it("creates a private draft by default", async () => {
    const created = await create(goal());
    expect(created.status).toBe("draft");
    expect(created.milestones).toEqual([{ quarter: "Q1", description: "Map the flow" }]);
    expect((await findById(created.id))?.title).toBe("Own reconciliation");
  });

  it("findById is null for an unknown id", async () => {
    expect(await findById("99999999-9999-4999-8999-999999999999")).toBeNull();
  });
});

describe("listByUser", () => {
  it("returns the user's goals for the year ordered by sortOrder, then creation", async () => {
    await create(goal({ title: "third", sortOrder: 2 }));
    await create(goal({ title: "first", sortOrder: 0 }));
    await create(goal({ title: "second", sortOrder: 1 }));

    expect((await listByUser(ANA, 2027)).map((g) => g.title)).toEqual(["first", "second", "third"]);
  });

  it("is scoped to the user and the year", async () => {
    await create(goal({ title: "ana 2027" }));
    await create(goal({ title: "ana 2028", cycleYear: 2028 }));
    await create(goal({ title: "budi 2027", userId: BUDI }));

    expect((await listByUser(ANA, 2027)).map((g) => g.title)).toEqual(["ana 2027"]);
  });
});

describe("listSharedByUser", () => {
  it("returns only shared goals, so drafts can never reach a member", async () => {
    await create(goal({ title: "draft", status: "draft", sortOrder: 0 }));
    await create(goal({ title: "shared", status: "shared", sortOrder: 1 }));

    expect((await listSharedByUser(ANA, 2027)).map((g) => g.title)).toEqual(["shared"]);
  });

  it("is scoped to the user", async () => {
    await create(goal({ title: "budi shared", userId: BUDI, status: "shared" }));
    expect(await listSharedByUser(ANA, 2027)).toEqual([]);
  });
});

describe("update", () => {
  it("changes only the given fields, leaving status and milestones alone", async () => {
    const created = await create(goal({ status: "shared" }));
    const updated = await update(created.id, { title: "New title" });

    expect(updated?.title).toBe("New title");
    expect(updated?.status).toBe("shared");
    expect(updated?.milestones).toEqual(created.milestones);
    expect(updated?.measure).toBe(created.measure);
  });

  it("can share and unshare a goal", async () => {
    const created = await create(goal());
    expect((await update(created.id, { status: "shared" }))?.status).toBe("shared");
    expect((await update(created.id, { status: "draft" }))?.status).toBe("draft");
  });

  it("bumps updatedAt", async () => {
    const created = await create(goal());
    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = await update(created.id, { title: "Later" });
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
  });

  it("is null for an unknown id", async () => {
    expect(await update("99999999-9999-4999-8999-999999999999", { title: "x" })).toBeNull();
  });
});

describe("remove", () => {
  it("deletes only that goal", async () => {
    const keep = await create(goal({ title: "keep" }));
    const drop = await create(goal({ title: "drop" }));

    await remove(drop.id);

    expect((await listByUser(ANA, 2027)).map((g) => g.id)).toEqual([keep.id]);
  });
});
