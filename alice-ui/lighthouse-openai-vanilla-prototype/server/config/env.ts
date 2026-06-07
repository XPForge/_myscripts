import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const dir = dirname(fileURLToPath(import.meta.url));
loadEnv(join(dir, "..", "..", ".env"));
loadEnv(join(dir, "..", "..", "..", ".env"));

export const env = {
  port: Number(process.env.PORT || 3300),
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiApiBase: process.env.OPENAI_API_BASE || "https://api.openai.com",
  model: process.env.OPENAI_MODEL || "gpt-4.1",
  transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
  ttsModel: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  ttsVoice: process.env.OPENAI_TTS_VOICE || "onyx",
};
