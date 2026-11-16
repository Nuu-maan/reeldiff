import { chromium } from "playwright";
import { expect, test } from "vitest";
import { assetUrls, captureSnapshot, rrwebInitScript } from "./snapshot.ts";

test("finds font and image URLs in serialized CSS, quoted or not", () => {
  const json = JSON.stringify({
    css: [
      '@font-face{src:url("http://localhost:3100/_next/static/media/a.p.woff2") format("woff2")}',
      ".hero{background:url('https://app.example.com/img/hero.webp?v=2')}",
      ".x{background:url(http://cdn.example.com/b.png)}",
      ".y{background:url(data:image/png;base64,AAAA)}",
      ".z{mask:url(#clip)}",
    ].join(" "),
  });
  expect([...assetUrls(json)]).toEqual([
    "http://localhost:3100/_next/static/media/a.p.woff2",
    "https://app.example.com/img/hero.webp?v=2",
    "http://cdn.example.com/b.png",
  ]);
});

test("snapshots a page that patches DOM prototypes without mounting a probe iframe", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript({ content: await rrwebInitScript() });
    let frames = 0;
    page.on("frameattached", () => frames++);
    await page.route("http://app.test/", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<script>const contains = Node.prototype.contains; Node.prototype.contains = function (n) { return contains.call(this, n); };</script><p>hi</p>`,
      }),
    );
    await page.goto("http://app.test/");
    await captureSnapshot(page, "input[type=password]");
    expect(frames).toBe(0);
  } finally {
    await browser.close();
  }
});
