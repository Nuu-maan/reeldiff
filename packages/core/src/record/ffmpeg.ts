import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ReeldiffError } from "../errors.ts";
import type { PointerTrack } from "../replay/steps.ts";
import { type CursorSprites, cursorCommands } from "./cursor.ts";
import type { Frame } from "./screencast.ts";

export const videoFps = 30;

/** Concat list that shows each frame from its capture time until the next, trimmed to [start, end]. */
export function concatList(frames: Frame[], start: number, end: number): string {
  const firstShown = Math.max(
    0,
    frames.findLastIndex((frame) => frame.at <= start),
  );
  const shown = frames.slice(firstShown).filter((frame) => frame.at < end);
  const lines: string[] = ["ffconcat version 1.0"];
  for (const [i, frame] of shown.entries()) {
    const from = i === 0 ? start : frame.at;
    const to = shown[i + 1]?.at ?? end;
    lines.push(`file '${frame.file}'`, `duration ${((to - from) / 1000).toFixed(6)}`);
  }
  const last = shown.at(-1);
  // The concat demuxer drops the last entry's duration unless the file is listed again.
  if (last) lines.push(`file '${last.file}'`);
  return `${lines.join("\n")}\n`;
}

export async function framesToMp4(
  frames: Frame[],
  output: string,
  range: { start: number; end: number },
  cursor?: { track: PointerTrack; sprites: CursorSprites },
): Promise<void> {
  if (!frames.length) throw new ReeldiffError("The recording captured no frames.");
  const dir = dirname(frames[0]?.file ?? output);
  const list = join(dir, "frames.ffconcat");
  await writeFile(list, concatList(frames, range.start, range.end));
  const base = `[0:v]fps=${videoFps},scale=trunc(iw/2)*2:trunc(ih/2)*2`;
  let graph = `${base},format=yuv420p[out]`;
  const inputs = ["-f", "concat", "-safe", "0", "-i", list];
  if (cursor) {
    const commands = join(dir, "cursor.cmd");
    const count = Math.ceil(((range.end - range.start) / 1000) * videoFps) + 1;
    await writeFile(commands, cursorCommands(cursor.track, range.start, count, videoFps));
    const { ring, cursor: arrow, pressed } = cursor.sprites;
    for (const sprite of [ring, arrow, pressed]) inputs.push("-loop", "1", "-i", sprite);
    const hide = "x=-1000:y=-1000:eval=frame:shortest=1";
    graph = [
      `${base},sendcmd=f='${commands}'[v0]`,
      `[v0][1:v]overlay@ring=${hide}[v1]`,
      `[v1][2:v]overlay@cursor=${hide}[v2]`,
      `[v2][3:v]overlay@pressed=${hide},format=yuv420p[out]`,
    ].join(";");
  }
  const args = [
    "-y",
    "-loglevel",
    "error",
    ...inputs,
    "-filter_complex",
    graph,
    "-map",
    "[out]",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-tune",
    "animation",
    "-movflags",
    "+faststart",
    "-an",
    output,
  ];
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    ffmpeg.on("error", (error: NodeJS.ErrnoException) =>
      reject(
        error.code === "ENOENT"
          ? new ReeldiffError(
              "ffmpeg isn't installed. Install it (winget install ffmpeg, brew install ffmpeg or apt-get install ffmpeg) and try again.",
            )
          : error,
      ),
    );
    ffmpeg.on("close", (code) =>
      code === 0 ? resolve() : reject(new ReeldiffError(`ffmpeg failed: ${stderr.trim()}`)),
    );
  });
}
