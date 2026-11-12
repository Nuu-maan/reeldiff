import { resolve } from "node:path";
import type { StorageConfig } from "../config/schema.ts";
import { localStorage } from "./local.ts";
import { s3Storage } from "./s3.ts";
import type { StorageProvider } from "./storage.ts";

export function storageFor(config: StorageConfig, rootDir: string): StorageProvider {
  return config.type === "s3"
    ? s3Storage(config)
    : localStorage(resolve(rootDir, config.dir), config.publicUrl);
}
