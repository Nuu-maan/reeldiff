import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

export type StorageProvider = {
  name: string;
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  url(key: string): string | undefined;
};

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
};

export const contentTypeFor = (file: string) =>
  contentTypes[extname(file).toLowerCase()] ?? "application/octet-stream";

async function filesIn(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

export type Published = { prefix: string; url?: string; files: number };

export async function publishRun(
  storage: StorageProvider,
  runDir: string,
  prefix: string,
): Promise<Published> {
  const files = await filesIn(runDir);
  const key = (file: string) => `${prefix}/${relative(runDir, file).split(sep).join("/")}`;
  const queue = [...files];
  const workers = Array.from({ length: 8 }, async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      await storage.put(key(file), await readFile(file), contentTypeFor(file));
    }
  });
  await Promise.all(workers);
  return { prefix, url: storage.url(`${prefix}/index.html`), files: files.length };
}

export const runPrefix = (input: { repo?: string; pr?: number; runId: string }) =>
  ["runs", input.repo ?? "local", input.pr ? `pr-${input.pr}` : undefined, input.runId]
    .filter(Boolean)
    .join("/");
