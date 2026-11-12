import { cn, formatDuration } from "../lib/format.ts";
import type { ManifestStep } from "../lib/manifest.ts";

type Props = {
  steps: ManifestStep[];
  selected: number;
  onSelect: (index: number) => void;
};

export function StepList({ steps, selected, onSelect }: Props) {
  return (
    <ol className="grid gap-1" aria-label="Steps">
      {steps.map((step) => {
        const active = step.index === selected;
        return (
          <li key={step.index}>
            <button
              type="button"
              aria-current={active ? "step" : undefined}
              onClick={() => onSelect(step.index)}
              className={cn(
                "grid w-full grid-cols-[1.5rem_1fr] gap-x-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors duration-150 focus-visible:shadow-focus",
                active
                  ? "bg-raised shadow-raised"
                  : "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-6 place-items-center rounded-md text-xs font-semibold",
                  step.status === "failed"
                    ? "bg-rose-600 text-white"
                    : active
                      ? "bg-accent text-on-accent"
                      : "bg-control text-muted",
                )}
              >
                {step.index}
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className={cn("text-sm", active ? "text-ink" : "text-ink/85")}>
                  {step.intent ?? step.label}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 text-xs">
                  {step.changed && <span className="font-medium text-ink">Changed</span>}
                  {step.status === "failed" && (
                    <span className="text-rose-600 dark:text-rose-400">
                      {step.error ?? "Failed"}
                    </span>
                  )}
                  <span className="text-faint">{formatDuration(step.endMs - step.startMs)}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
