import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { configFileNames } from "@reeldiff/core";
import {
  configTemplate,
  type Framework,
  gitignoreEntries,
  workflowTemplate,
} from "../templates.ts";

async function detect(cwd: string): Promise<{ framework: Framework; uiPaths: string[] }> {
  const pkg = await readFile(join(cwd, "package.json"), "utf8").catch(() => "{}");
  const deps = { ...JSON.parse(pkg).dependencies, ...JSON.parse(pkg).devDependencies };
  const src = existsSync(join(cwd, "src")) ? "src/" : "";
  if (deps.next && existsSync(join(cwd, `${src}app`))) {
    return { framework: "nextjs-app", uiPaths: [`${src}app/**`, `${src}components/**`] };
  }
  if (deps.next && existsSync(join(cwd, `${src}pages`))) {
    return { framework: "nextjs-pages", uiPaths: [`${src}pages/**`, `${src}components/**`] };
  }
  return { framework: "none", uiPaths: ["src/**/*.{tsx,jsx,vue,svelte,css}"] };
}

async function create(path: string, content: string, created: string[]) {
  if (existsSync(path)) return;
  await writeFile(path, content);
  created.push(path);
}

export async function initCommand() {
  const cwd = process.cwd();
  const created: string[] = [];

  if (configFileNames.some((name) => existsSync(join(cwd, name)))) {
    console.log("A Reeldiff config already exists, leaving it as is.");
  } else {
    const { framework, uiPaths } = await detect(cwd);
    await create(join(cwd, "reeldiff.config.ts"), configTemplate(framework, uiPaths), created);
  }

  await mkdir(join(cwd, ".reeldiff", "flows"), { recursive: true });
  await create(join(cwd, ".reeldiff", "flows", ".gitkeep"), "", created);
  await mkdir(join(cwd, ".github", "workflows"), { recursive: true });
  await create(join(cwd, ".github", "workflows", "reeldiff.yml"), workflowTemplate, created);

  const gitignore = join(cwd, ".gitignore");
  const current = await readFile(gitignore, "utf8").catch(() => "");
  const missing = gitignoreEntries.filter((entry) => !current.split(/\r?\n/).includes(entry));
  if (missing.length) {
    await appendFile(
      gitignore,
      `${current && !current.endsWith("\n") ? "\n" : ""}${missing.join("\n")}\n`,
    );
    created.push(".gitignore entries");
  }

  for (const item of created)
    console.log(`Created ${item.replace(`${cwd}/`, "").replace(`${cwd}\\`, "")}`);
  console.log(`
Next:
  1. Install the browser:    npx reeldiff install-browser
  2. Write your first flow:  npx reeldiff explore "Sign up for an account" --url http://localhost:3000
                             (needs model in reeldiff.config.ts), or hand-write .reeldiff/flows/<id>.yaml
  3. Record it:              npx reeldiff record <flowId> && npx reeldiff view`);
}
