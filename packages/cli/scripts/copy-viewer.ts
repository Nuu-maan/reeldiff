import { cp, rm } from "node:fs/promises";

const from = new URL("../../viewer/dist/", import.meta.url);
const to = new URL("../dist/viewer/", import.meta.url);
await rm(to, { recursive: true, force: true });
await cp(from, to, { recursive: true });
