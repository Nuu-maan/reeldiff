import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { parseDocument } from "yaml";
import * as z from "zod";
import { ReeldiffError } from "../errors.ts";
import { type Flow, flowSchema } from "./schema.ts";

export const flowsDir = (rootDir: string) => resolve(rootDir, ".reeldiff", "flows");

const isFlowFile = (name: string) => [".yaml", ".yml"].includes(extname(name));

export function parseFlow(source: string, file: string): Flow {
  const doc = parseDocument(source);
  const yamlError = doc.errors[0];
  if (yamlError) {
    const at = yamlError.linePos?.[0];
    throw new ReeldiffError(
      `${file}${at ? `:${at.line}:${at.col}` : ""}: ${yamlError.message.split("\n")[0]}`,
    );
  }

  const result = flowSchema.safeParse(doc.toJS());
  if (!result.success) {
    throw new ReeldiffError(`Invalid flow ${file}\n${z.prettifyError(result.error)}`);
  }

  const expectedId = basename(file, extname(file));
  if (result.data.id !== expectedId) {
    throw new ReeldiffError(
      `${file}: id "${result.data.id}" must match the file name "${expectedId}"`,
    );
  }
  return result.data;
}

async function flowFiles(dir: string) {
  try {
    return (await readdir(dir)).filter(isFlowFile).sort();
  } catch {
    throw new ReeldiffError(`No flows folder at ${dir}. Add flows to .reeldiff/flows/.`);
  }
}

export async function loadFlows(dir: string): Promise<Flow[]> {
  const files = await flowFiles(dir);
  return Promise.all(
    files.map(async (name) => parseFlow(await readFile(join(dir, name), "utf8"), name)),
  );
}

export async function findFlowFile(dir: string, id: string): Promise<string> {
  const files = await flowFiles(dir);
  const name = files.find((file) => basename(file, extname(file)) === id);
  if (!name) {
    const known = files.map((file) => basename(file, extname(file)));
    throw new ReeldiffError(
      `No flow "${id}" in ${dir}.${known.length ? ` Known flows: ${known.join(", ")}` : ""}`,
    );
  }
  return join(dir, name);
}

export async function loadFlow(dir: string, id: string): Promise<Flow> {
  const path = await findFlowFile(dir, id);
  return parseFlow(await readFile(path, "utf8"), basename(path));
}
