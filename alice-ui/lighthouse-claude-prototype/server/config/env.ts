import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function applyEnv(path: string) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const configDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(configDir, "..", "..");
applyEnv(join(projectRoot, ".env"));

export const env = {
  port: Number(process.env.PORT || 3200),
  mockProvider: (process.env.MOCK_PROVIDER || "true") !== "false",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicApiBase: process.env.ANTHROPIC_API_BASE || "https://api.anthropic.com",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  discoveryPromptPath: process.env.LIGHTHOUSE_DISCOVERY_PROMPT_PATH || "",
  discoveryPromptValue: process.env.LIGHTHOUSE_DISCOVERY_SYSTEM_PROMPT || "",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiApiBase: process.env.OPENAI_API_BASE || "https://api.openai.com",
};
