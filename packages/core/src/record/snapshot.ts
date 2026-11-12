import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
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
