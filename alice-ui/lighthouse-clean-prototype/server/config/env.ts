import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function applyEnvFile(path: string) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadEnvironment() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const prototypeRoot = join(currentDir, "..", "..");
  applyEnvFile(join(prototypeRoot, ".env"));
  applyEnvFile(join(prototypeRoot, "..", ".env"));
}

loadEnvironment();

export const env = {
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiApiBase: process.env.OPENAI_API_BASE || "https://api.openai.com",
  port: Number(process.env.PORT || 3100),
  discoveryPromptPath: process.env.LIGHTHOUSE_DISCOVERY_PROMPT_PATH || "",
  discoveryPromptValue: process.env.LIGHTHOUSE_DISCOVERY_SYSTEM_PROMPT || "",
  discoveryModel: process.env.OPENAI_DISCOVERY_MODEL || "gpt-4.1",
  synthesisModel: process.env.OPENAI_SYNTHESIS_MODEL || "gpt-4.1",
  transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
  ttsModel: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  ttsVoice: process.env.OPENAI_TTS_VOICE || "sage",
};
