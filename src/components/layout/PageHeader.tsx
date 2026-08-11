import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, leading, actions, className }: Props) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0">
          <h1 className="text-[1.35rem] font-semibold tracking-tight sm:text-[1.5rem]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[0.8rem] text-muted-foreground mt-1 font-medium tracking-wide uppercase">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
