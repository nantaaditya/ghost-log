import type { Viewer } from "./access";
import { countUnread, listThreadSummaries } from "./message-repository";

/**
 * How many chat messages are waiting for this person, for the badge on the dashboard.
 * The badge is a nicety, so any failure (for example the migration has not run yet) yields 0
 * rather than taking the page down.
 */
export async function getUnreadTotal(viewer: Viewer): Promise<number> {
  try {
    if (viewer.role === "admin") {
      const threads = await listThreadSummaries();
      return threads.reduce((total, thread) => total + thread.unreadCount, 0);
    }
    if (viewer.role === "member") return await countUnread(viewer.id, viewer.id);
    return 0;
  } catch (error) {
    console.error("[coach] could not count unread messages:", error instanceof Error ? error.message : error);
    return 0;
  }
}
