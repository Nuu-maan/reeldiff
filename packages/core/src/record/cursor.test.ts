import { expect, test } from "vitest";
import { cursorCommands, hotspot, pointerAt } from "./cursor.ts";
import { concatList } from "./ffmpeg.ts";

const track = {
  moves: [{ start: 1000, end: 1600, from: { x: 0, y: 0 }, to: { x: 600, y: 300 } }],
  presses: [1600],
};

test("the pointer is hidden before the first move, eases along it and rests at the end", () => {
  expect(pointerAt(track, 900)).toBeUndefined();
  expect(pointerAt(track, 1000)).toEqual({ x: 0, y: 0 });
  expect(pointerAt(track, 1300)).toEqual({ x: 300, y: 150 });
  expect(pointerAt(track, 5000)).toEqual({ x: 600, y: 300 });
});

test("cursor commands fire half a frame early and swap to the pressed sprite on a click", () => {
  const lines = cursorCommands(track, 1000, 30, 30).trim().split("\n");
  expect(lines).toHaveLength(30);
  expect(lines[0]).toMatch(/^0\.0000 /);
  expect(lines[2]).toMatch(/^0\.0500 /);
  const pressed = lines[18] ?? "";
  expect(pressed).toContain(`overlay@pressed x ${600 - hotspot.cursor.x}`);
  expect(pressed).toContain("overlay@cursor x -1000");
  expect(pressed).toContain(`overlay@ring x ${600 - hotspot.ring.x}`);
});

test("concat list trims to the range and holds each frame until the next", () => {
  const frames = [
    { file: "/f/0.jpg", at: 500 },
    { file: "/f/1.jpg", at: 1500 },
    { file: "/f/2.jpg", at: 2000 },
    { file: "/f/3.jpg", at: 9000 },
  ];
  expect(concatList(frames, 1000, 3000)).toBe(
    [
      "ffconcat version 1.0",
      "file '/f/0.jpg'",
      "duration 0.500000",
      "file '/f/1.jpg'",
      "duration 0.500000",
      "file '/f/2.jpg'",
      "duration 1.000000",
      "file '/f/2.jpg'",
      "",
    ].join("\n"),
  );
});
