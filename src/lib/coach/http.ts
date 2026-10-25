/** The app's standard JSON error envelope: `{ success: false, error }`. */
export function fail(status: number, error: string): Response {
  return Response.json({ success: false, error }, { status });
}
