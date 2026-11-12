import type { Manifest } from "@reeldiff/core";

export type { FlowStatus, Manifest, ManifestFlow, ManifestStep } from "@reeldiff/core";

export async function loadManifest(): Promise<Manifest> {
  const response = await fetch("./manifest.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`manifest.json returned ${response.status}`);
  return (await response.json()) as Manifest;
}
