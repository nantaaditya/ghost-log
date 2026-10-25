import { z } from "zod";

export const MAX_MILESTONES = 4;
export const MIN_CYCLE_YEAR = 2026;
export const MAX_CYCLE_YEAR = 2100;

export const goalTypeSchema = z.enum(["soft", "hard"]);
export const goalStatusSchema = z.enum(["draft", "shared"]);

export const milestoneSchema = z.object({
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  description: z.string().trim().min(1, "Milestone is required").max(300),
});

const goalFields = z.object({
  type: goalTypeSchema,
  title: z.string().trim().min(1, "Title is required").max(150),
  measure: z.string().trim().min(1, "Measure is required").max(500),
  developmentAction: z.string().trim().min(1, "Development action is required").max(500),
  evidenceSource: z.string().trim().max(300).optional(),
  skillKey: z.string().trim().max(60).optional(),
  milestones: z.array(milestoneSchema).max(MAX_MILESTONES),
});

/** The editable content of a goal, without ownership, cycle or status. */
export const goalDraftSchema = goalFields;

export const createGoalSchema = goalFields.extend({
  userId: z.uuid(),
  cycleYear: z.number().int().min(MIN_CYCLE_YEAR).max(MAX_CYCLE_YEAR),
  milestones: z.array(milestoneSchema).max(MAX_MILESTONES).default([]),
  status: goalStatusSchema.default("draft"),
});

// Built from `goalFields` (no defaults) so a partial edit never resets status or milestones.
// userId and cycleYear are intentionally absent: a goal cannot be reassigned.
export const updateGoalSchema = goalFields
  .extend({ status: goalStatusSchema })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export type CreateGoalDto = z.infer<typeof createGoalSchema>;
export type UpdateGoalDto = z.infer<typeof updateGoalSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
