import { writeFile } from "node:fs/promises";
import { flowJsonSchema } from "../src/flow/json-schema.ts";

await writeFile(new URL("../schema/flow.schema.json", import.meta.url), flowJsonSchema());
