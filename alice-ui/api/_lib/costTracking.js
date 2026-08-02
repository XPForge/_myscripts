// Estimated-cost logging for metered external service calls (OpenAI,
// Anthropic, Resend). Deliberately NOT backed by a database table -- this
// writes one structured JSON line per call via console.log, which Vercel
// already captures as function logs in every environment, and which a local
// `npm run dev` session already prints to the terminal. See
// scripts/costReport.mjs for turning a saved log file into a summary.
//
// Never pass transcript/participant text into these events -- sessionId is
// an opaque correlation token, not participant data, and `meta` should only
// ever hold small numeric fields (token counts, byte counts, etc).
import { getRate } from "./costPricing.js";

// Only used to turn an uploaded recording's byte size into an estimated
// duration, since the transcription API doesn't echo back audio length or
// usage. Typical compressed voice recordings (WebM/Opus, mono, speech
// bitrate) fall roughly in this range -- adjust if your recordings are
// encoded differently.
const ASSUMED_AUDIO_BITRATE_KBPS = 32;

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function resolveEnvironment() {
  // Vercel sets VERCEL_ENV automatically ("production" | "preview" |
  // "development") on every deployment; it's unset when running the local
  // Vite dev server, which we also want bucketed as "development".
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  return "development";
}

export function getSessionIdFromRequest(req) {
  const raw = req.headers?.["x-lighthouse-session-id"];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 && trimmed.length <= 100 ? trimmed : null;
}

export function estimateChatCostUsd(service, model, usage) {
  const rate = getRate(service, model);
  if (!rate || !usage) return null;
  const inputTokens = usage.input_tokens ?? usage.inputTokens ?? 0;
  const outputTokens = usage.output_tokens ?? usage.outputTokens ?? 0;
  const cost =
    (inputTokens / 1_000_000) * rate.inputPerMillionTokensUsd +
    (outputTokens / 1_000_000) * rate.outputPerMillionTokensUsd;
  return round(cost, 6);
}

export function estimateTtsCostUsd(model, inputText) {
  const rate = getRate("openai.tts", model);
  if (!rate || typeof inputText !== "string") return null;
  const cost = (inputText.length / 1_000_000) * rate.perMillionCharsUsd;
  return round(cost, 6);
}

export function estimateTranscriptionCostUsd(model, audioBytes) {
  const rate = getRate("openai.transcribe", model);
  if (!rate || typeof audioBytes !== "number" || audioBytes <= 0) return null;
  const estimatedSeconds = (audioBytes * 8) / (ASSUMED_AUDIO_BITRATE_KBPS * 1000);
  const estimatedMinutes = estimatedSeconds / 60;
  return round(estimatedMinutes * rate.perMinuteUsd, 6);
}

export function estimateEmailCostUsd() {
  const rate = getRate("resend.email", "default");
  return rate ? round(rate.perEmailUsd, 6) : null;
}

export function recordCostEvent(input) {
  try {
    const { service, model, kind, sessionId, quantity, unit, estimatedCostUsd, isTestAccount, meta } = input || {};
    const event = {
      type: "lighthouse_cost_event",
      ts: new Date().toISOString(),
      environment: resolveEnvironment(),
      service,
      model: model || null,
      kind: kind || null,
      sessionId: sessionId || null,
      quantity: typeof quantity === "number" ? quantity : null,
      unit: unit || null,
      estimatedCostUsd: typeof estimatedCostUsd === "number" ? estimatedCostUsd : null,
      isTestAccount: Boolean(isTestAccount),
      ...(meta && typeof meta === "object" ? { meta } : {}),
    };
    console.log(JSON.stringify(event));
  } catch {
    // Cost logging must never break the request it's observing.
  }
}
