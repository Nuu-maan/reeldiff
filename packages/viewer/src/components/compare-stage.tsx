import { useState } from "react";
import type { ManifestFlow, ManifestStep } from "../lib/manifest.ts";

export function CompareStage({
  flow,
  step,
}: {
  flow: ManifestFlow;
  step: ManifestStep | undefined;
}) {
  const [split, setSplit] = useState(50);
  const ratio = { aspectRatio: `${flow.viewport.width} / ${flow.viewport.height}` };

  if (!step?.before || !step.screenshot) {
    return (
      <div
        className="grid w-full place-items-center rounded-2xl bg-surface p-6 text-center text-sm"
        style={ratio}
      >
        <p>There's no before picture for this step. Pick a step marked as changed.</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-2xl bg-surface shadow-raised"
      style={ratio}
    >
      <img
        src={step.screenshot}
        alt={`Step ${step.index} after`}
        className="absolute inset-0 size-full object-cover"
      />
      <img
        src={step.before}
        alt={`Step ${step.index} before`}
        className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-accent"
        style={{ left: `${split}%` }}
      >
        <div className="absolute top-1/2 left-1/2 h-10 w-3 -translate-x-1/2 -translate-y-1/2 rounded-md bg-accent shadow-popover" />
      </div>
      <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-accent/85 px-1.5 py-0.5 text-xs font-medium text-on-accent">
        Before
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-md bg-accent/85 px-1.5 py-0.5 text-xs font-medium text-on-accent">
        After
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={split}
        onChange={(event) => setSplit(Number(event.target.value))}
        aria-label="Drag to compare before and after"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
