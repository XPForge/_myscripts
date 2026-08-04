import { readSessionFromRequest, isAdminEmail } from "./_lib/auth.js";
import { getSessionIdFromRequest, estimateChatCostUsd, recordCostEvent } from "./_lib/costTracking.js";

export const config = { api: { bodyParser: false } };

function sanitizeSecret(value) {
  if (!value) return value;
  return value
    .split("")
    .filter((ch) => ch.charCodeAt(0) !== 0xfeff)
    .join("")
    .trim();
}

const OPENAI_API_BASE = sanitizeSecret(process.env.OPENAI_API_BASE || "https://api.openai.com").replace(/\/+$/, "");
const OZ_CAPTURE_MODEL = sanitizeSecret(process.env.OZ_CAPTURE_MODEL) || sanitizeSecret(process.env.OPENAI_MODEL) || "gpt-5.6-sol";
const OPENAI_API_KEY = sanitizeSecret(process.env.OPENAI_API_KEY);

// Trimmed to only the fields the live product actually renders (Discovery
// Insights panel/modal and the progress ring/checklist) -- this used to also
// ask for possibleSignals, openQuestions, doNotAssumeNotes, a top-level
// participantConfirmationNeeded list, and top-level uncertaintyNotes, none
// of which any client ever reads. Cutting them roughly halved output tokens
// with no behavior change (the API response still includes those keys, just
// always empty -- see the handler below).
const OZ_CAPTURE_INSTRUCTION = `You are Oz Discovery Capture Wrapper v0.1.

You run only after Discovery meaning appears in a participant and Alice transcript. You do not conduct Discovery, script Alice, choose Alice's next question, force coverage, score, rank, match, diagnose, decide truth, or mark an inference confirmed.

Core principle:
Alice discovers meaning in motion.
Oz preserves meaning after it appears.
The schema organizes Discovery; it does not conduct Discovery.

Capture only what the transcript supports. Preserve participant language in evidence excerpts. Treat emerging themes as provisional -- every theme requires participant confirmation. Record per-theme uncertainty. Keep excerpts and notes concise. Return JSON only, using this exact top-level shape:
{
  "evidenceItems": [{"id":"evidence-1","excerpt":""}],
  "emergingThemes": [{"id":"theme-1","title":"","description":"","evidenceItemIds":[],"participantConfirmationNeeded":true,"uncertaintyNotes":[]}],
  "schemaAreaMappings": [{"schemaArea":"other","evidenceItemIds":[],"notes":[]}]
}

Allowed schema areas: capabilities, constraints, preferences, motivations, environment_fit, relationships, values, decision_making, uncertainty, other.
Use empty arrays when the transcript does not support a category. Never invent evidence.`;

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function extractText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  return payload?.output?.flatMap(item => item.content || [])
    .filter(content => content.type === "output_text" && typeof content.text === "string")
    .map(content => content.text).join("");
}

function parseCapture(text) {
  const normalized = text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(normalized);
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString("utf8"));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  if (!OPENAI_API_KEY) return sendJson(res, 500, { error: "OPENAI_API_KEY is not configured" });

  try {
    const body = await readJsonBody(req);
    const turns = Array.isArray(body.turns) ? body.turns.filter(turn => turn && typeof turn.text === "string") : [];
    if (!turns.length) return sendJson(res, 400, { error: "Transcript turns are required" });

    const response = await fetch(`${OPENAI_API_BASE}/v1/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OZ_CAPTURE_MODEL,
        instructions: OZ_CAPTURE_INSTRUCTION,
        input: [{ role: "user", content: `Capture Discovery records from this transcript:\n${JSON.stringify(turns)}` }],
      }),
    });

    if (!response.ok) return sendJson(res, 502, { error: "Oz capture provider request failed" });
    const responsePayload = await response.json();
    const capture = parseCapture(extractText(responsePayload) || "{}");

    try {
      const session = readSessionFromRequest(req);
      recordCostEvent({
        service: "openai.chat",
        model: OZ_CAPTURE_MODEL,
        kind: "oz_discovery_capture",
        sessionId: getSessionIdFromRequest(req),
        quantity: (responsePayload.usage?.input_tokens ?? 0) + (responsePayload.usage?.output_tokens ?? 0),
        unit: "tokens",
        estimatedCostUsd: estimateChatCostUsd("openai.chat", OZ_CAPTURE_MODEL, responsePayload.usage),
        isTestAccount: isAdminEmail(session?.email),
        meta: { inputTokens: responsePayload.usage?.input_tokens ?? null, outputTokens: responsePayload.usage?.output_tokens ?? null },
      });
    } catch {
      // Cost logging must never affect the actual capture response.
    }

    const lastTurn = turns[turns.length - 1];
    // Response keeps the full OzDiscoveryCapture shape for backward
    // compatibility (nothing on the client needs to change) even though the
    // model is no longer asked to generate possibleSignals, openQuestions,
    // doNotAssumeNotes, top-level participantConfirmationNeeded, or
    // top-level uncertaintyNotes -- those keys are now always empty.
    sendJson(res, 200, {
      captureId: crypto.randomUUID(),
      version: "0.1",
      createdAt: new Date().toISOString(),
      transcriptThroughTurnId: lastTurn.id,
      evidenceItems: Array.isArray(capture.evidenceItems)
        ? capture.evidenceItems.map((item) => ({
            id: item?.id,
            excerpt: item?.excerpt,
            sourceTurnIds: [],
            schemaAreas: [],
            uncertaintyNotes: [],
          }))
        : [],
      possibleSignals: [],
      emergingThemes: Array.isArray(capture.emergingThemes) ? capture.emergingThemes : [],
      openQuestions: [],
      doNotAssumeNotes: [],
      participantConfirmationNeeded: [],
      schemaAreaMappings: Array.isArray(capture.schemaAreaMappings)
        ? capture.schemaAreaMappings.map((mapping) => ({
            schemaArea: mapping?.schemaArea,
            evidenceItemIds: Array.isArray(mapping?.evidenceItemIds) ? mapping.evidenceItemIds : [],
            possibleSignalIds: [],
            notes: Array.isArray(mapping?.notes) ? mapping.notes : [],
          }))
        : [],
      uncertaintyNotes: [],
    });
  } catch {
    sendJson(res, 400, { error: "Invalid Oz capture request" });
  }
}

