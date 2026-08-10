import { PageShell } from "@/components/layout/PageShell";
import { Spinner } from "@/components/ui/spinner";

export function RouteLoading() {
  return (
    <PageShell className="flex items-center justify-center min-h-[50vh]">
      <Spinner className="h-6 w-6 text-muted-foreground" />
    </PageShell>
  );
}
