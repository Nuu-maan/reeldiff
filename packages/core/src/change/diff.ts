import { readFile } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const window = 64;

export async function diffRatio(before: string, after: string): Promise<number> {
  const [a, b] = await Promise.all(
    [before, after].map(async (file) => PNG.sync.read(await readFile(file))),
  );
  if (!a || !b || a.width !== b.width || a.height !== b.height) return 1;
  const worstWindow = pixelmatch(a.data, b.data, null, a.width, a.height, {
    threshold: 0.1,
    windowSize: window,
  });
  return worstWindow / (window * window);
}
