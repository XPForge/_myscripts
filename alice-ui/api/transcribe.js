import { readSessionFromRequest, isAdminEmail } from "./_lib/auth.js";
import { getSessionIdFromRequest, estimateTranscriptionCostUsd, recordCostEvent } from "./_lib/costTracking.js";

function sanitizeSecret(value) {
  if (!value) return value;
  return value
    .split("")
    .filter((ch) => ch.charCodeAt(0) !== 0xfeff)
    .join("")
    .trim();
}

const OPENAI_API_BASE = sanitizeSecret(process.env.OPENAI_API_BASE || "https://api.openai.com").replace(/\/+$/, "");
const OPENAI_API_KEY = sanitizeSecret(process.env.OPENAI_API_KEY);
// The request body is a raw multipart passthrough (not parsed), so the
// actual `model` field the client sent isn't available here for cost
// logging -- this mirrors the transcriptionModel every current caller
// actually sends (see lighthouseDiscoveryConfig.ts). Update if that changes.
const ASSUMED_TRANSCRIBE_MODEL = "gpt-4o-transcribe";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!OPENAI_API_KEY) {
    sendJson(res, 500, { error: "OPENAI_API_KEY is not configured" });
    return;
  }

  const contentType = req.headers["content-type"];
  if (!contentType?.includes("multipart/form-data")) {
    sendJson(res, 400, { error: "Expected multipart/form-data with file and model fields" });
    return;
  }

  const body = await readRawBody(req);
  const response = await fetch(`${OPENAI_API_BASE}/v1/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": contentType,
    },
    body,
  });

  const payload = await response.text();

  if (response.ok) {
    try {
      const session = readSessionFromRequest(req);
      recordCostEvent({
        service: "openai.transcribe",
        model: ASSUMED_TRANSCRIBE_MODEL,
        kind: "discovery_answer_transcription",
        sessionId: getSessionIdFromRequest(req),
        quantity: body.length,
        unit: "bytes",
        estimatedCostUsd: estimateTranscriptionCostUsd(ASSUMED_TRANSCRIBE_MODEL, body.length),
        isTestAccount: isAdminEmail(session?.email),
        meta: { audioBytes: body.length },
      });
    } catch {
      // Cost logging must never affect the actual transcription response.
    }
  }

  res.statusCode = response.ok ? 200 : 502;
  res.setHeader("Content-Type", response.headers.get("Content-Type") || "application/json");
  res.end(payload);
}

