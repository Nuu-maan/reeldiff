import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/format.ts";
import type { ManifestFlow } from "../lib/manifest.ts";

type Props = {
  flow: ManifestFlow;
  selected: number;
  onSelect: (index: number) => void;
};

export function VideoStage({ flow, selected, onSelect }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(flow.durationMs / 1000);
  const fromVideo = useRef<number | null>(null);
  const captions = useMemo(() => captionTrack(flow), [flow]);

  useEffect(() => {
    const step = flow.steps.find((s) => s.index === selected);
    const element = video.current;
    if (!step || !element || fromVideo.current === selected) return;
    element.currentTime = Math.max(0, step.startMs / 1000);
  }, [selected, flow.steps]);

  useEffect(() => () => URL.revokeObjectURL(captions), [captions]);

  const onTime = () => {
    const element = video.current;
    if (!element) return;
    setTime(element.currentTime);
    const current = [...flow.steps]
      .reverse()
      .find((s) => s.startMs / 1000 <= element.currentTime + 0.05);
    if (current && current.index !== selected && !element.paused) {
      fromVideo.current = current.index;
      onSelect(current.index);
    }
  };

  return (
    <div className="grid gap-3">
      <video
        ref={video}
        src={flow.video}
        poster={flow.poster}
        controls
        playsInline
        preload="metadata"
        onTimeUpdate={onTime}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || duration)}
        className="w-full rounded-2xl bg-surface object-contain shadow-raised"
        style={{ aspectRatio: `${flow.viewport.width} / ${flow.viewport.height}` }}
      >
        <track kind="captions" src={captions} srcLang="en" label="Steps" />
      </video>
      <fieldset className="relative m-0 h-8 min-w-0 border-0 p-0">
        <legend className="sr-only">Steps on the timeline</legend>
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-control">
          <div
            className="h-full origin-left bg-accent transition-transform duration-200 ease-out"
            style={{ transform: `scaleX(${duration ? Math.min(1, time / duration) : 0})` }}
          />
        </div>
        {flow.steps.map((step) => {
          const left = duration ? Math.min(100, (step.startMs / 1000 / duration) * 100) : 0;
          return (
            <button
              key={step.index}
              type="button"
              aria-label={`Jump to step ${step.index}: ${step.intent ?? step.label}`}
              onClick={() => {
                fromVideo.current = null;
                onSelect(step.index);
                const element = video.current;
                if (element) element.currentTime = step.startMs / 1000;
              }}
              className="group absolute top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md outline-none focus-visible:shadow-focus"
              style={{ left: `${left}%` }}
            >
              <span
                className={cn(
                  "size-2.5 rounded-full ring-2 ring-page transition-[scale,background-color] duration-150 ease-out group-hover:scale-125",
                  step.index === selected
                    ? "scale-125 bg-accent"
                    : step.changed
                      ? "bg-accent/70"
                      : "bg-faint",
                )}
              />
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}

const timestamp = (ms: number) => new Date(Math.max(0, ms)).toISOString().slice(11, 23);

function captionTrack(flow: ManifestFlow) {
  const cues = flow.steps.map(
    (step) =>
      `${timestamp(step.startMs)} --> ${timestamp(step.endMs)}\n${step.caption ?? step.intent ?? step.label}`,
  );
  const vtt = `WEBVTT\n\n${cues.join("\n\n")}\n`;
  return URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
}
