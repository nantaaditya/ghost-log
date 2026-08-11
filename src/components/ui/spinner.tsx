import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("animate-spin opacity-60", className)}
      aria-hidden="true"
    />
  );
}
