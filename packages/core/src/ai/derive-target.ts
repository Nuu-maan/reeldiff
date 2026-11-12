import type { Locator, Page } from "playwright";
import { ReeldiffError } from "../errors.ts";
import type { Target } from "../flow/schema.ts";
import { locate } from "../replay/locate.ts";

export function parseAriaLine(snapshot: string): { role: string; name?: string } | undefined {
  const match = snapshot.trim().match(/^- ([a-z]+)(?: "((?:[^"\\]|\\.)*)")?/);
  if (!match?.[1]) return undefined;
  return { role: match[1], name: match[2]?.replace(/\\(.)/g, "$1") || undefined };
}

type DomFacts = {
  label?: string;
  placeholder?: string;
  text?: string;
  testId?: string;
  css: string;
};

const domFacts = (element: Locator) =>
  element.evaluate((el): DomFacts => {
    const clean = (value: string | null | undefined) =>
      value?.replace(/\s+/g, " ").trim() || undefined;
    const field = el as HTMLInputElement;
    const label = field.labels?.[0] ? clean(field.labels[0].textContent) : undefined;
    const text = clean(el.textContent);
    const cssPath = (node: Element): string => {
      if (node.id && document.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
        return `#${CSS.escape(node.id)}`;
      }
      const parent = node.parentElement;
      if (!parent) return node.tagName.toLowerCase();
      const siblings = [...parent.children].filter((child) => child.tagName === node.tagName);
      const nth = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(node) + 1})` : "";
      return `${cssPath(parent)} > ${node.tagName.toLowerCase()}${nth}`;
    };
    return {
      label,
      placeholder: clean(el.getAttribute("placeholder")),
      text: text && text.length <= 60 ? text : undefined,
      testId: clean(el.getAttribute("data-testid")),
      css: cssPath(el),
    };
  });

async function pointsAt(page: Page, target: Target, element: Locator) {
  const candidate = locate(page, target);
  if ((await candidate.count()) !== 1) return false;
  const handle = await element.elementHandle();
  const exact = "css" in target;
  return candidate.evaluate(
    (node, [other, strict]) =>
      node === other || (!strict && (other?.contains(node) || node.contains(other ?? null))),
    [handle, exact] as const,
  );
}

export async function deriveTarget(page: Page, selector: string): Promise<Target> {
  const element = page.locator(selector).first();
  if ((await element.count()) === 0) {
    throw new ReeldiffError(`The element the model picked (${selector}) is gone from the page.`);
  }
  const aria = parseAriaLine(await element.ariaSnapshot().catch(() => ""));
  const facts = await domFacts(element);
  const candidates: Target[] = [];
  if (aria?.name) candidates.push({ role: aria.role, name: aria.name });
  if (facts.label) candidates.push({ label: facts.label });
  if (facts.placeholder) candidates.push({ placeholder: facts.placeholder });
  if (facts.text) candidates.push({ text: facts.text });
  if (facts.testId) candidates.push({ testId: facts.testId });
  if (aria && !aria.name) candidates.push({ role: aria.role });
  candidates.push({ css: facts.css });

  for (const candidate of candidates) {
    if (await pointsAt(page, candidate, element).catch(() => false)) return candidate;
  }
  throw new ReeldiffError(`Could not find a stable target for ${selector}.`);
}
