import { describe, it, expect } from "vitest";
import type { KpiGoal } from "@/lib/db/schema";
import { toGoalDto, toMemberGoalDto } from "../goal-dto";

const row: KpiGoal = {
  id: "44444444-4444-4444-8444-444444444444",
  userId: "11111111-1111-4111-8111-111111111111",
  cycleYear: 2027,
  type: "hard",
  skillKey: "clearing-settlement",
  title: "Own reconciliation",
  measure: "Match rate from 97% to 99.5%",
  milestones: [{ quarter: "Q1", description: "Map the flow" }],
  developmentAction: "Pair with the settlement owner",
  evidenceSource: "Role; Q22",
  status: "draft",
  sortOrder: 3,
  createdAt: new Date("2026-10-25T10:00:00Z"),
  updatedAt: new Date("2026-10-25T10:00:00Z"),
};

describe("toMemberGoalDto", () => {
  it("carries only what a member is shown, so the manager's notes cannot be serialized to their browser", () => {
    const dto = toMemberGoalDto({ ...row, evidenceSource: "RAHASIA-MANAGER" });
    expect(Object.keys(dto).sort()).toEqual(["developmentAction", "id", "measure", "milestones", "title", "type"]);
    expect(JSON.stringify(dto)).not.toContain("RAHASIA-MANAGER");
  });

  it("copies milestones", () => {
    const dto = toMemberGoalDto(row);
    expect(dto.milestones).toEqual(row.milestones);
    expect(dto.milestones).not.toBe(row.milestones);
  });
});

describe("toGoalDto", () => {
  it("keeps what an editor needs and drops owner, order and dates", () => {
    expect(Object.keys(toGoalDto(row)).sort()).toEqual(
      ["developmentAction", "evidenceSource", "id", "measure", "milestones", "skillKey", "status", "title", "type"].sort(),
    );
  });

  it("turns empty optional columns into empty strings, which is what form fields hold", () => {
    const dto = toGoalDto({ ...row, skillKey: null, evidenceSource: null });
    expect(dto.skillKey).toBe("");
    expect(dto.evidenceSource).toBe("");
  });

  it("copies milestones so editing the form cannot change the source row", () => {
    const dto = toGoalDto(row);
    expect(dto.milestones).toEqual(row.milestones);
    expect(dto.milestones).not.toBe(row.milestones);
    expect(dto.milestones[0]).not.toBe(row.milestones[0]);
  });

  it("is plain data that survives the server-to-client boundary", () => {
    const dto = toGoalDto(row);
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });
});
