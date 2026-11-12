import { expect, test } from "vitest";
import { setStepTargets } from "./edit.ts";

test("replaces one step's target and keeps comments and the rest of the file", () => {
  const source = `# yaml-language-server: $schema=flow.schema.json
id: create-project
title: Create a project
steps:
  # open the dialog
  - action: click
    target: { role: button, name: "New project" }
    intent: Open the dialog
  - action: click
    target: { role: button, name: "Create" }
    intent: Submit
`;
  const updated = setStepTargets(source, new Map([[0, { role: "button", name: "Add project" }]]));
  expect(updated).toContain("# yaml-language-server");
  expect(updated).toContain("# open the dialog");
  expect(updated).toContain("target: { role: button, name: Add project }");
  expect(updated).toContain('target: { role: button, name: "Create" }');
});
