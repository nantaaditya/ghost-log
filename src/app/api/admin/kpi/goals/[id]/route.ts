import { z } from "zod";
import { guardAdminWrite } from "@/lib/coach/admin-guard";
import { fail } from "@/lib/coach/http";
import { findById, remove, update } from "@/lib/kpi/goal-repository";
import { updateGoalSchema } from "@/lib/kpi/validation";

type Params = { params: Promise<{ id: string }> };

const idSchema = z.uuid();

export async function PATCH(req: Request, { params }: Params): Promise<Response> {
  const guard = await guardAdminWrite(req);
  if ("response" in guard) return guard.response;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return fail(400, "Invalid id");

  const json: unknown = await req.json().catch(() => null);
  const parsed = updateGoalSchema.safeParse(json);
  if (!parsed.success) return fail(400, "Invalid input");

  const goal = await update(id.data, parsed.data);
  if (!goal) return fail(404, "Goal not found");

  return Response.json({ success: true, data: goal });
}

export async function DELETE(req: Request, { params }: Params): Promise<Response> {
  const guard = await guardAdminWrite(req);
  if ("response" in guard) return guard.response;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return fail(400, "Invalid id");

  if (!(await findById(id.data))) return fail(404, "Goal not found");

  await remove(id.data);
  return Response.json({ success: true });
}
