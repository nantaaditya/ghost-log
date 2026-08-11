import { PageShell } from "@/components/layout/PageShell";
import { Spinner } from "@/components/ui/spinner";

export function RouteLoading() {
  return (
    <PageShell className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
        <Spinner className="h-5 w-5" />
      </div>
      <p className="text-[0.8rem] text-muted-foreground/60">Loading</p>
    </PageShell>
  );
}
