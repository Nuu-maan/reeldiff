import { useEffect, useRef, useState } from "react";
import { createCache, createMirror, rebuildIntoSandboxedIframe } from "rrweb-snapshot";
import type { ManifestFlow, ManifestStep } from "../lib/manifest.ts";
import { Restart } from "./icons.tsx";
import { useScale } from "./use-scale.ts";

type Props = {
  flow: ManifestFlow;
  step: ManifestStep | undefined;
  onNext: () => void;
  onRestart: () => void;
};

type Snapshot = Parameters<typeof rebuildIntoSandboxedIframe>[0];

export function TryItStage({ flow, step, onNext, onRestart }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const scale = useScale(stage, flow.viewport.width);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    root.replaceChildren();
    setFailed(false);
    setReady(false);
    if (!step?.snapshot) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    fetch(step.snapshot)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<Snapshot>;
      })
      .then((snapshot) => {
        if (cancelled) return;
        const { iframe } = rebuildIntoSandboxedIframe(snapshot, {
          root,
          cache: createCache(),
          mirror: createMirror(),
          iframeAttributes: { title: `Step ${step.index} preview`, tabindex: "-1" },
        });
        iframe.style.cssText = `width:${flow.viewport.width}px;height:${flow.viewport.height}px;border:0;pointer-events:none;`;
        iframe.contentWindow?.scrollTo(step.scroll?.x ?? 0, step.scroll?.y ?? 0);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [step, flow.viewport.width, flow.viewport.height]);

  const done = !step;
  const target = step?.target;

  return (
    <div
      ref={stage}
      className="relative w-full overflow-hidden rounded-2xl bg-surface shadow-raised"
      style={{ aspectRatio: `${flow.viewport.width} / ${flow.viewport.height}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: flow.viewport.width,
          height: flow.viewport.height,
          transform: `scale(${scale})`,
        }}
      >
        <div ref={host} className={failed || done ? "hidden" : ""} />
        {(failed || done) && (
          <img
            src={done ? flow.poster : step?.screenshot}
            alt={done ? `${flow.title}, final state` : `Step ${step?.index}`}
            className="size-full object-cover"
          />
        )}
      </div>

      {!done && target && (ready || failed) && (
        <button
          type="button"
          onClick={onNext}
          aria-label={`Next: ${step.intent ?? step.label}`}
          className="absolute rounded-xl border-2 border-accent bg-accent/5 outline-none transition-[scale] duration-150 ease-out [animation:hotspot_1.6s_var(--ease-out)_infinite] hover:scale-[1.03] focus-visible:shadow-focus active:scale-[0.97]"
          style={{
            left: (target.x - 6) * scale,
            top: (target.y - 6) * scale,
            width: (target.width + 12) * scale,
            height: (target.height + 12) * scale,
          }}
        />
      )}

      {!done && step && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
          <p className="max-w-[min(32rem,100%)] rounded-xl bg-accent/90 px-3 py-1.5 text-center text-sm font-medium text-on-accent">
            {step.caption ?? step.intent ?? step.label}
          </p>
        </div>
      )}

      {done && (
        <div className="absolute inset-0 grid place-items-center bg-page/60">
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-medium text-on-accent shadow-popover outline-none transition-[scale] duration-150 ease-out focus-visible:shadow-focus active:scale-[0.96]"
          >
            <Restart />
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
