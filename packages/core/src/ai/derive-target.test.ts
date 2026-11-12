import { type Browser, chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { deriveTarget, parseAriaLine } from "./derive-target.ts";

vi.setConfig({ testTimeout: 30_000 });

describe("parseAriaLine", () => {
  test("reads role and name", () => {
    expect(parseAriaLine('- button "New project"')).toEqual({
      role: "button",
      name: "New project",
    });
    expect(parseAriaLine('- link "Mobile onboarding":\n  - heading')).toEqual({
      role: "link",
      name: "Mobile onboarding",
    });
    expect(parseAriaLine('- textbox "Say \\"hi\\""')).toEqual({
      role: "textbox",
      name: 'Say "hi"',
    });
    expect(parseAriaLine("- main")).toEqual({ role: "main", name: undefined });
    expect(parseAriaLine("")).toBeUndefined();
  });
});

describe("deriveTarget", () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium.launch();
  });
  afterAll(() => browser.close());

  const html = `
    <button>Save</button><button>Save</button>
    <button id="go">Continue</button>
    <label for="n">Name</label><input id="n">
    <input placeholder="Search projects">
    <div class="card"><span>Plain words</span></div>
    <p id="status"><span>You're on Team.</span></p>
    <div data-testid="unique-thing"><div></div></div>
    <div><div></div><div class="x"></div></div>`;

  const derive = async (xpath: string) => {
    const page = await browser.newPage();
    await page.setContent(html);
    return deriveTarget(page, `xpath=${xpath}`);
  };

  test("prefers role and name", async () => {
    expect(await derive("//button[@id='go']")).toEqual({ role: "button", name: "Continue" });
  });

  test("uses the label for a labelled input", async () => {
    expect(await derive("//input[@id='n']")).toEqual({ role: "textbox", name: "Name" });
  });

  test("uses the placeholder when there's no label", async () => {
    expect(await derive("//input[@placeholder]")).toEqual({
      role: "textbox",
      name: "Search projects",
    });
  });

  test("skips ambiguous names and falls back to something unique", async () => {
    const target = await derive("(//button)[2]");
    expect(target).not.toEqual({ role: "button", name: "Save" });
    expect(target).toHaveProperty("css");
  });

  test("accepts text that lands on an inner element of the picked one", async () => {
    expect(await derive("//p[@id='status']")).toEqual({ text: "You're on Team." });
  });

  test("uses text, then test id", async () => {
    expect(await derive("//span")).toEqual({ text: "Plain words" });
    expect(await derive("//div[@data-testid]")).toEqual({ testId: "unique-thing" });
  });
});
