import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "playwright";

export type Frame = { file: string; at: number };

export type Screencast = {
  /** Drop frames until resume, so the video holds the last frame instead of showing overlay-free captures. */
  pause(): void;
  resume(): void;
  stop(): Promise<Frame[]>;
};

export async function startScreencast(
  page: Page,
  dir: string,
  size: { width: number; height: number },
): Promise<Screencast> {
  const cdp = await page.context().newCDPSession(page);
  const frames: Frame[] = [];
  const writes: Promise<void>[] = [];
  let paused = false;
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    if (paused) return;
    const file = join(dir, `${String(frames.length).padStart(6, "0")}.jpg`);
    const captured = (metadata.timestamp ?? Date.now() / 1000) * 1000;
    // Chrome's frame timestamps are coarse and can step backwards; frames still arrive in order.
    frames.push({ file, at: Math.max(captured, (frames.at(-1)?.at ?? 0) + 1) });
    writes.push(writeFile(file, Buffer.from(data, "base64")));
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 85,
    maxWidth: size.width,
    maxHeight: size.height,
    everyNthFrame: 1,
  });
  return {
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    async stop() {
      await cdp.send("Page.stopScreencast").catch(() => {});
      await cdp.detach().catch(() => {});
      await Promise.all(writes);
      return frames;
    },
  };
}
