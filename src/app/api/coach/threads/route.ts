import { isAdminViewer } from "@/lib/coach/access";
import { listThreadSummaries } from "@/lib/coach/message-repository";
import { getActiveViewer } from "@/lib/coach/viewer";

export async function GET(): Promise<Response> {
  const viewer = await getActiveViewer();
  if (!viewer) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminViewer(viewer)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const threads = await listThreadSummaries();
  return Response.json({ success: true, data: threads });
}
