import { describe, it, expect } from "vitest";
import { createGoalSchema, updateGoalSchema, MAX_MILESTONES } from "../validation";

const validGoal = {
  userId: "0b0e9a62-6f5e-4c6c-9a4b-1f6d2f4f3a11",
  cycleYear: 2027,
  type: "hard" as const,
  title: "Own card authorization reconciliation",
  measure: "Daily recon breaks reduced from 12 to under 3",
  developmentAction: "Pair with settlement owner for two sprints",
  milestones: [{ quarter: "Q1" as const, description: "Map the recon flow" }],
};

describe("createGoalSchema", () => {
  it("accepts a valid goal and defaults status to draft", () => {
    const result = createGoalSchema.safeParse(validGoal);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("draft");
  });

  it("rejects an unknown goal type", () => {
    expect(createGoalSchema.safeParse({ ...validGoal, type: "other" }).success).toBe(false);
  });

  it("rejects an empty title", () => {
    expect(createGoalSchema.safeParse({ ...validGoal, title: "" }).success).toBe(false);
  });

  it("rejects a title over 150 characters", () => {
    expect(createGoalSchema.safeParse({ ...validGoal, title: "A".repeat(151) }).success).toBe(false);
  });

  it("rejects a cycleYear that is not a plausible year", () => {
    expect(createGoalSchema.safeParse({ ...validGoal, cycleYear: 27 }).success).toBe(false);
  });

  it("rejects an invalid milestone quarter", () => {
    const bad = { ...validGoal, milestones: [{ quarter: "Q5", description: "x" }] };
    expect(createGoalSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects more milestones than the maximum", () => {
    const milestones = Array.from({ length: MAX_MILESTONES + 1 }, () => ({
      quarter: "Q1" as const,
      description: "x",
    }));
    expect(createGoalSchema.safeParse({ ...validGoal, milestones }).success).toBe(false);
  });

  it("rejects a non-uuid userId", () => {
    expect(createGoalSchema.safeParse({ ...validGoal, userId: "abc" }).success).toBe(false);
  });
});

describe("updateGoalSchema", () => {
  it("accepts a partial update", () => {
    expect(updateGoalSchema.safeParse({ title: "New title" }).success).toBe(true);
  });

  it("accepts sharing a goal", () => {
    expect(updateGoalSchema.safeParse({ status: "shared" }).success).toBe(true);
  });

  it("rejects an empty update", () => {
    expect(updateGoalSchema.safeParse({}).success).toBe(false);
  });

  it("does not inject defaults, so a title-only edit cannot un-share a goal", () => {
    const result = updateGoalSchema.safeParse({ title: "New title" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("status" in result.data).toBe(false);
      expect("milestones" in result.data).toBe(false);
    }
  });

  it("does not allow reassigning the goal to another user", () => {
    const result = updateGoalSchema.safeParse({ title: "x", userId: validGoal.userId });
    expect(result.success).toBe(true);
    if (result.success) expect("userId" in result.data).toBe(false);
  });
});
