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
    <div className={cn("mx-auto w-full px-4 py-5 sm:px-6 sm:py-6 space-y-6", widthMap[maxWidth], className)}>
      {children}
    </div>
  );
}
