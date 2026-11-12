export type ActionInputs = {
  headUrl: string;
  baseUrl?: string;
  config?: string;
  modelProvider?: string;
  model?: string;
  baseRef?: string;
  headRef?: string;
};

export function runArgs(inputs: ActionInputs): string[] {
  const pairs: [string, string | undefined][] = [
    ["--url", inputs.headUrl],
    ["--compare-url", inputs.baseUrl],
    ["--config", inputs.config],
    ["--model-provider", inputs.modelProvider],
    ["--model", inputs.model],
    ["--base", inputs.baseRef],
    ["--head", inputs.headRef],
  ];
  return ["run", ...pairs.flatMap(([flag, value]) => (value ? [flag, value] : []))];
}

export const secretEnv = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "OPENROUTER_API_KEY",
  "OPENAI_COMPATIBLE_API_KEY",
  "SLACK_WEBHOOK_URL",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
];
