import { spawn } from "node:child_process";
import { ReeldiffError } from "../errors.ts";

export function toMp4(input: string, output: string, startSeconds: number): Promise<void> {
  const args = [
    "-y",
    "-loglevel",
    "error",
    "-ss",
    Math.max(0, startSeconds).toFixed(3),
    "-i",
    input,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
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
