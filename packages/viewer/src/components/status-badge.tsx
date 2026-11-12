import { cn } from "../lib/format.ts";
import type { FlowStatus } from "../lib/manifest.ts";

const styles: Record<FlowStatus, string> = {
  changed: "bg-accent text-on-accent",
  new: "bg-emerald-600/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  unchanged: "bg-control text-muted",
  broken: "bg-rose-600/12 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
};

export function StatusBadge({ status, className }: { status: FlowStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-semibold tracking-wide uppercase",
        styles[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
