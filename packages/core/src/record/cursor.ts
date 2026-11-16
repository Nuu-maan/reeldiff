import { join } from "node:path";
import type { Browser } from "playwright";
import type { Point, PointerTrack } from "../replay/steps.ts";

export type CursorSprites = { cursor: string; pressed: string; ring: string };

/** Pixel in each sprite that sits on the pointer position. */
export const hotspot = { cursor: { x: 9, y: 8 }, ring: { x: 26, y: 26 } };
const pressMs = 140;
const ringMs = 220;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function pointerAt(track: PointerTrack, at: number): Point | undefined {
  let last: Point | undefined;
  for (const move of track.moves) {
    if (at < move.start) break;
    if (at < move.end) {
      const t = ease((at - move.start) / (move.end - move.start));
      return {
        x: move.from.x + (move.to.x - move.from.x) * t,
        y: move.from.y + (move.to.y - move.from.y) * t,
      };
    }
    last = move.to;
  }
  return last;
}

/** sendcmd script placing the cursor, pressed cursor and click ring on every output frame. */
export function cursorCommands(track: PointerTrack, start: number, frames: number, fps: number) {
  const hidden = -1000;
  const lines: string[] = [];
  for (let i = 0; i < frames; i++) {
    const seconds = i / fps;
    const at = start + seconds * 1000;
    const point = pointerAt(track, at);
    const pressed = track.presses.some((p) => at >= p && at < p + pressMs);
    const ringOn = point && track.presses.some((p) => at >= p && at < p + ringMs);
    const place = (name: string, on: boolean, spot: Point) => {
      const x = on && point ? Math.round(point.x - spot.x) : hidden;
      const y = on && point ? Math.round(point.y - spot.y) : hidden;
      return `overlay@${name} x ${x}, overlay@${name} y ${y}`;
    };
    // Fire half a frame early: a rounded time just above the frame's own pts would leave that frame on the old position.
    const fireAt = Math.max(0, (i - 0.5) / fps);
    lines.push(
      `${fireAt.toFixed(4)} ${[
        place("ring", Boolean(ringOn), hotspot.ring),
        place("cursor", Boolean(point) && !pressed, hotspot.cursor),
        place("pressed", Boolean(point) && pressed, hotspot.cursor),
      ].join(", ")};`,
    );
  }
  return `${lines.join("\n")}\n`;
}

const arrow = (scale: number) => `<svg width="40" height="44" viewBox="0 0 40 44">
  <g transform="translate(9 8) scale(${scale}) translate(-3 -2)" style="filter: drop-shadow(0 1px 2px rgb(0 0 0 / .35))">
    <path d="M3 2.5v19.2c0 .9 1.1 1.3 1.7.6l4.6-5.1h7.2c.9 0 1.3-1.1.7-1.7L4.7 1.8C4.1 1.2 3 1.6 3 2.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
  </g>
</svg>`;

const ringSvg = `<svg width="52" height="52" viewBox="0 0 52 52">
  <circle cx="26" cy="26" r="20" fill="rgb(0 0 0 / .14)" stroke="rgb(255 255 255 / .5)" stroke-width="1.5"/>
</svg>`;

export async function renderCursorSprites(browser: Browser, dir: string): Promise<CursorSprites> {
  const page = await browser.newPage({ viewport: { width: 200, height: 100 } });
  try {
    await page.setContent(
      `<style>body{margin:0;background:transparent;display:flex}svg{display:block}</style>${arrow(1)}${arrow(0.88)}${ringSvg}`,
    );
    const svgs = page.locator("svg");
    const sprites = {
      cursor: join(dir, "cursor.png"),
      pressed: join(dir, "cursor-pressed.png"),
      ring: join(dir, "ring.png"),
    };
    await svgs.nth(0).screenshot({ path: sprites.cursor, omitBackground: true });
    await svgs.nth(1).screenshot({ path: sprites.pressed, omitBackground: true });
    await svgs.nth(2).screenshot({ path: sprites.ring, omitBackground: true });
    return sprites;
  } finally {
    await page.close();
  }
}
