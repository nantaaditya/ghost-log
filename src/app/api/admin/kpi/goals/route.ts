import { guardAdminWrite } from "@/lib/coach/admin-guard";
import { fail } from "@/lib/coach/http";
import { findMemberById } from "@/lib/coach/member-repository";
import { create, listByUser } from "@/lib/kpi/goal-repository";
import { createGoalSchema } from "@/lib/kpi/validation";

export async function POST(req: Request): Promise<Response> {
  const guard = await guardAdminWrite(req);
  if ("response" in guard) return guard.response;

  const json: unknown = await req.json().catch(() => null);
  const parsed = createGoalSchema.safeParse(json);
  if (!parsed.success) return fail(400, "Invalid input");
  const dto = parsed.data;

  if (!(await findMemberById(dto.userId))) return fail(404, "Member not found");

  // New goals go after the highest existing position, so deleting an earlier goal cannot make
  // a new one collide with a surviving one.
  const existing = await listByUser(dto.userId, dto.cycleYear);
  const nextSortOrder = existing.reduce((highest, goal) => Math.max(highest, goal.sortOrder), -1) + 1;
  const goal = await create({
    userId: dto.userId,
    cycleYear: dto.cycleYear,
    type: dto.type,
    skillKey: dto.skillKey ?? null,
    title: dto.title,
    measure: dto.measure,
    milestones: dto.milestones,
    developmentAction: dto.developmentAction,
    evidenceSource: dto.evidenceSource ?? null,
    status: dto.status,
    sortOrder: nextSortOrder,
  });

  return Response.json({ success: true, data: goal }, { status: 201 });
}
