import { expect, test } from "vitest";
import { assetUrls } from "./snapshot.ts";

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
