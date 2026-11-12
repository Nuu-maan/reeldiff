import type { Task } from "./data";
import { progress } from "./data";

export function ProgressBar({ tasks, label }: { tasks: Task[]; label: string }) {
  const { done, total } = progress(tasks);
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="grid gap-2">
      <div className="flex justify-between text-xs">
        <span>{total ? `${done} of ${total} done` : "No tasks yet"}</span>
        <span>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 overflow-hidden rounded-full bg-control"
      >
        <div
          className="h-full origin-left rounded-full bg-neutral-900 transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>
    </div>
  );
}
