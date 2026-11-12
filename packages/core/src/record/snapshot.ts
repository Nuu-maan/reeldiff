import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join } from "node:path";
import type { Page } from "playwright";

let cached: string | undefined;

export async function rrwebInitScript(): Promise<string> {
  cached ??= await readFile(createRequire(import.meta.url).resolve("rrweb-snapshot"), "utf8");
  return `(() => { const module = { exports: {} }; const exports = module.exports;\n${cached}\n;window.__rrwebSnapshot = module.exports; })();`;
}

type SnapshotWindow = Window & {
  __rrwebSnapshot: {
    snapshot: (doc: Document, options: Record<string, unknown>) => unknown;
  };
};

const assetUrl =
  /url\((?:\\?["'])?(https?:\/\/[^"')\\\s]+\.(?:woff2?|ttf|otf|png|jpe?g|gif|webp|svg|avif)(?:\?[^"')\\\s]*)?)(?:\\?["'])?\)/g;

export const assetUrls = (json: string): Set<string> =>
  new Set([...json.matchAll(assetUrl)].map((match) => match[1] as string));

export async function localizeAssets(
  json: string,
  page: Page,
  runDir: string,
  assetDir: string,
  saved: Map<string, string>,
): Promise<string> {
  const origin = new URL(page.url()).origin;
  for (const url of assetUrls(json)) {
    if (saved.has(url) || new URL(url).origin !== origin) continue;
    const response = await page.request.get(url).catch(() => undefined);
    if (!response?.ok()) continue;
    const name = `${createHash("sha1").update(url).digest("hex").slice(0, 12)}${extname(new URL(url).pathname)}`;
    await mkdir(join(runDir, assetDir), { recursive: true });
    await writeFile(join(runDir, assetDir, name), await response.body());
    saved.set(url, `${assetDir}/${name}`);
  }
  let result = json;
  for (const [url, local] of saved) result = result.replaceAll(url, local);
  return result;
}

export function captureSnapshot(page: Page, mask: string): Promise<unknown> {
  return page.evaluate((selector) => {
    const masked = (el: Element | null) => Boolean(el?.matches(selector));
    return (window as unknown as SnapshotWindow).__rrwebSnapshot.snapshot(document, {
      inlineStylesheet: true,
      inlineImages: true,
      slimDOM: "all",
      maskTextSelector: selector,
      maskAllInputs: true,
      maskInputFn: (text: string, el: HTMLElement) => (masked(el) ? "•".repeat(text.length) : text),
    });
  }, mask);
}
