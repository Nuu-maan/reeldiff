import { Tabs } from "@base-ui/react/tabs";
import { useEffect, useState } from "react";
import { FlowPanel } from "./components/flow-panel.tsx";
import { Mark } from "./components/icons.tsx";
import { StatusBadge } from "./components/status-badge.tsx";
import { formatDuration, formatTime, shortSha } from "./lib/format.ts";
import { loadManifest, type Manifest } from "./lib/manifest.ts";

const order = { changed: 0, broken: 1, new: 2, unchanged: 3 } as const;

export function App() {
  const [manifest, setManifest] = useState<Manifest>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadManifest()
      .then((data) => {
        setManifest(data);
        document.title = data.summary?.headline ?? data.pr?.title ?? "Reeldiff";
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 md:py-10">
      <header className="flex items-center justify-between gap-4 text-sm">
        <span className="flex items-center gap-2 font-semibold text-ink">
          <Mark width={18} height={18} />
          Reeldiff
        </span>
        {manifest && (
          <span className="flex flex-wrap justify-end gap-x-3 text-right">
            {manifest.repo && <span>{manifest.repo}</span>}
            {manifest.pr?.sha && (
              <span className="font-mono text-xs leading-5">{shortSha(manifest.pr.sha)}</span>
            )}
            <time dateTime={manifest.createdAt}>{formatTime(manifest.createdAt)}</time>
          </span>
        )}
      </header>

      <main id="main" className="grid gap-8">
        {error && (
          <div className="grid gap-2 rounded-2xl bg-surface p-6">
            <h1 className="text-lg font-semibold">I can't load this run</h1>
            <p className="text-sm">
              manifest.json didn't load ({error}). Open this page from the run folder, for example
              with
              <code className="mx-1 rounded-md bg-control px-1.5 py-0.5 font-mono text-xs text-ink">
                reeldiff view
              </code>
              .
            </p>
          </div>
        )}
        {!manifest && !error && <Skeleton />}
        {manifest && <Run manifest={manifest} />}
      </main>

      <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-xs text-faint">
        <span>Recorded by Reeldiff</span>
        {manifest && (
          <span>
            {manifest.flows.length} flow{manifest.flows.length === 1 ? "" : "s"} ·{" "}
            {formatDuration(manifest.durationMs)}
          </span>
        )}
      </footer>
    </div>
  );
}

function Run({ manifest }: { manifest: Manifest }) {
  const flows = [...manifest.flows].sort((a, b) => order[a.status] - order[b.status]);
  const headline = manifest.summary?.headline ?? manifest.pr?.title ?? "UI changes";
  const requested = new URLSearchParams(location.search).get("flow");
  const initial = flows.find((flow) => flow.id === requested)?.id ?? flows[0]?.id;

  return (
    <>
      <section className="grid gap-3">
        {manifest.pr && (
          <a
            href={manifest.pr.url}
            className="w-fit text-sm text-muted underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:shadow-focus"
          >
            #{manifest.pr.number} {manifest.pr.title}
          </a>
        )}
        <h1 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">{headline}</h1>
        {manifest.summary && (
          <ul className="grid max-w-3xl gap-1.5">
            {manifest.summary.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2.5">
                <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-faint" />
                {bullet}
              </li>
            ))}
          </ul>
        )}
      </section>

      {flows.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-sm">No flows were affected in this run.</p>
      ) : (
        <Tabs.Root defaultValue={initial} className="grid gap-6">
          <Tabs.List
            className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-3rem),transparent)] sm:mx-0 sm:px-0"
            aria-label="Flows"
          >
            {flows.map((flow) => (
              <Tabs.Tab
                key={flow.id}
                value={flow.id}
                className="flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted outline-none transition-colors duration-150 hover:bg-black/[0.04] hover:text-ink focus-visible:shadow-focus data-[active]:bg-raised data-[active]:text-ink data-[active]:shadow-raised dark:hover:bg-white/[0.04]"
              >
                {flow.title}
                <StatusBadge status={flow.status} />
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {flows.map((flow) => (
            <Tabs.Panel key={flow.id} value={flow.id} className="outline-none">
              <FlowPanel flow={flow} note={manifest.summary?.perFlow[flow.id]} />
            </Tabs.Panel>
          ))}
        </Tabs.Root>
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <span className="sr-only">Loading run</span>
      <div className="h-9 w-2/3 rounded-xl bg-surface" />
      <div className="h-10 w-80 rounded-xl bg-surface" />
      <div className="aspect-[16/10] w-full rounded-2xl bg-surface lg:w-[calc(100%-22rem)]" />
    </div>
  );
}
