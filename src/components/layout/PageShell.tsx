import { cn } from "@/lib/utils";

type MaxWidth = "2xl" | "3xl" | "4xl";

const widthMap: Record<MaxWidth, string> = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

type Props = {
  children: React.ReactNode;
  maxWidth?: MaxWidth;
  className?: string;
};

export function PageShell({ children, maxWidth = "3xl", className }: Props) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-5 py-8 sm:px-8 sm:py-12 space-y-8",
        widthMap[maxWidth],
        className
      )}
    >
      {children}
    </main>
  );
}
