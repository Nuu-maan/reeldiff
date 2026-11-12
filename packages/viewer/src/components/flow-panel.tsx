import { Tabs } from "@base-ui/react/tabs";
import { useState } from "react";
import { cn } from "../lib/format.ts";
import type { ManifestFlow } from "../lib/manifest.ts";
import { CompareStage } from "./compare-stage.tsx";
import { StepList } from "./step-list.tsx";
import { TryItStage } from "./try-it-stage.tsx";
import { VideoStage } from "./video-stage.tsx";

type Mode = "video" | "try" | "compare";

const modeTab =
  "relative z-10 h-8 rounded-[8px] px-3 text-sm font-medium text-muted outline-none transition-colors duration-150 hover:text-ink focus-visible:shadow-focus data-[active]:text-ink";

export function FlowPanel({ flow, note }: { flow: ManifestFlow; note?: string }) {
  const hasCompare = flow.steps.some((step) => step.before);
  const firstChanged = flow.steps.find((step) => step.changed)?.index;
  const [mode, setMode] = useState<Mode>(flow.video ? "video" : "try");
  const [selected, setSelected] = useState(firstChanged ?? flow.steps[0]?.index ?? 0);
  const [tryIndex, setTryIndex] = useState(flow.steps[0]?.index ?? 0);
  const step = flow.steps.find((s) => s.index === selected);
  const tryStep = flow.steps.find((s) => s.index === tryIndex);

  const select = (index: number) => {
    setSelected(index);
    setTryIndex(index);
  };

  if (flow.kind === "route" || flow.steps.length === 0) {
    return (
      <div className="grid gap-4">
        {note && <p className="text-sm">{note}</p>}
        {flow.poster && (
          <img
            src={flow.poster}
            alt={flow.title}
            className="w-full rounded-2xl bg-surface shadow-raised"
            style={{ aspectRatio: `${flow.viewport.width} / ${flow.viewport.height}` }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
      <div className="grid min-w-0 content-start gap-4">
        <Tabs.Root value={mode} onValueChange={(value) => setMode(value as Mode)}>
          <Tabs.List className="relative flex w-fit gap-1 rounded-xl bg-surface p-1">
            {flow.video && (
              <Tabs.Tab value="video" className={modeTab}>
                Video
              </Tabs.Tab>
            )}
            <Tabs.Tab value="try" className={modeTab}>
              Try it
            </Tabs.Tab>
            {hasCompare && (
              <Tabs.Tab value="compare" className={modeTab}>
                Before and after
              </Tabs.Tab>
            )}
            <Tabs.Indicator className="absolute top-1 left-0 h-8 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-[8px] bg-raised shadow-raised transition-[translate,width] duration-300 ease-in-out" />
          </Tabs.List>
        </Tabs.Root>

        {mode === "video" && flow.video && (
          <VideoStage flow={flow} selected={selected} onSelect={setSelected} />
        )}
        {mode === "try" && (
          <TryItStage
            flow={flow}
            step={tryStep}
            onNext={() => {
              const next = flow.steps.find((s) => s.index > tryIndex);
              setTryIndex(next?.index ?? Number.POSITIVE_INFINITY);
              if (next) setSelected(next.index);
            }}
            onRestart={() => select(flow.steps[0]?.index ?? 0)}
          />
        )}
        {mode === "compare" && <CompareStage flow={flow} step={step} />}
        {note && <p className="text-sm">{note}</p>}
        {flow.status === "broken" && flow.reason && (
          <p className="rounded-xl bg-rose-600/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {flow.reason}
          </p>
        )}
      </div>
      <aside className={cn("min-w-0", "lg:pt-12")}>
        <StepList steps={flow.steps} selected={selected} onSelect={select} />
      </aside>
    </div>
  );
}
