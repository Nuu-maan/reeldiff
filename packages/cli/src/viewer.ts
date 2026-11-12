import { cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const viewerDir = fileURLToPath(new URL("./viewer/", import.meta.url));

export const copyViewer = (runDir: string) => cp(viewerDir, runDir, { recursive: true });
