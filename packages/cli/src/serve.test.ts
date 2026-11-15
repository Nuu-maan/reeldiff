import { mkdtemp, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { serveDir } from "./serve.ts";

test("a malformed path gets a 400 and the server keeps serving", async () => {
  const dir = await mkdtemp(join(tmpdir(), "reeldiff-serve-"));
  await writeFile(join(dir, "index.html"), "hi");
  const server = await serveDir(dir, 0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    expect((await fetch(`${base}/%E0%A4%A`)).status).toBe(400);
    expect(await (await fetch(`${base}/`)).text()).toBe("hi");
  } finally {
    server.close();
  }
});
