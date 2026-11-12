import type { Manifest, ManifestFlow } from "../manifest.ts";

export type RunReport = {
  manifest: Manifest;
  runUrl?: string;
  assetUrl: (path: string | undefined) => string | undefined;
};

export type Notifier = {
  name: string;
  send(report: RunReport): Promise<void>;
};

export const shownFlows = (manifest: Manifest): ManifestFlow[] =>
  manifest.flows.filter((flow) => flow.status !== "unchanged");

export function counts(manifest: Manifest) {
  const by = (status: ManifestFlow["status"]) =>
    manifest.flows.filter((flow) => flow.status === status).length;
  return {
    total: manifest.flows.length,
    changed: by("changed"),
    new: by("new"),
    unchanged: by("unchanged"),
    broken: by("broken"),
  };
}

export const formatSeconds = (ms: number) =>
  ms < 60_000
    ? `${Math.round(ms / 1000)}s`
    : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
