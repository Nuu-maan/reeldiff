import * as z from "zod";
import { flowSchema } from "./schema.ts";

export const flowJsonSchema = (): string =>
  `${JSON.stringify(
    {
      ...z.toJSONSchema(flowSchema, { io: "input" }),
      title: "Reeldiff flow",
    },
    null,
    2,
  )}\n`;
