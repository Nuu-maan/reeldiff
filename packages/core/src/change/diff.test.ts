import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { expect, test } from "vitest";
import { diffRatio } from "./diff.ts";

async function png(dir: string, name: string, paint?: (x: number, y: number) => boolean) {
  const image = new PNG({ width: 400, height: 300 });
  for (let y = 0; y < 300; y++) {
    for (let x = 0; x < 400; x++) {
      const i = (y * 400 + x) * 4;
      const dark = paint?.(x, y) ?? false;
      image.data.set(dark ? [0, 0, 0, 255] : [255, 255, 255, 255], i);
    }
  }
  const file = join(dir, name);
  await writeFile(file, PNG.sync.write(image));
  return file;
}

test("scores identical, specks and localized changes against the default threshold", async () => {
  const dir = await mkdtemp(join(tmpdir(), "reeldiff-diff-"));
  const blank = await png(dir, "blank.png");
  const same = await png(dir, "same.png");
  const speck = await png(dir, "speck.png", (x, y) => x === 10 && y === 10);
  const block = await png(dir, "block.png", (x, y) => x >= 100 && x < 120 && y >= 100 && y < 120);

  expect(await diffRatio(blank, same)).toBe(0);
  expect(await diffRatio(blank, speck)).toBeLessThan(0.01);
  expect(await diffRatio(blank, block)).toBeGreaterThan(0.01);
});
