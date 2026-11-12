import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { StorageProvider } from "./storage.ts";

export function localStorage(dir: string, publicUrl?: string): StorageProvider {
  return {
    name: "local",
    async put(key, body) {
      const file = join(dir, key);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, body);
    },
    url: (key) =>
      publicUrl
        ? new URL(key, publicUrl.endsWith("/") ? publicUrl : `${publicUrl}/`).href
        : undefined,
  };
}
