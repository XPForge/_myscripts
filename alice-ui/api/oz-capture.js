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
//
// Incremental on top of that: this used to re-derive evidence/themes from
// the WHOLE transcript every single turn, re-paying for everything it had
// already found on turn 1 again on turn 10. Now the caller (see
// buildInstruction below) is shown a compact summary of what's already been
// captured and is asked for only what's new -- new evidence, and only
// themes that are new or need updating. schemaAreaMappings is left as a
// full fresh derivation every time (it's cheap -- 10 short entries -- and
// the model already has the full transcript, so there's no accuracy cost to
// not incrementalizing it). The server (see mergeCapture below) does the
// actual appending/merging so the response contract to the client is
// unchanged -- it still always gets back the full accumulated capture.
const OZ_CAPTURE_BASE_INSTRUCTION = `You are Oz Discovery Capture Wrapper v0.1.

You run only after Discovery meaning appears in a participant and Alice transcript. You do not conduct Discovery, script Alice, choose Alice's next question, force coverage, score, rank, match, diagnose, decide truth, or mark an inference confirmed.

Core principle:
Alice discovers meaning in motion.
Oz preserves meaning after it appears.
The schema organizes Discovery; it does not conduct Discovery.

Capture only what the transcript supports. Preserve participant language in evidence excerpts. Treat emerging themes as provisional -- every theme requires participant confirmation. Record per-theme uncertainty. Keep excerpts and notes concise. Never invent evidence.

You will be given the full transcript, plus a summary of what has already been captured in earlier turns. Do not repeat anything already captured. Return JSON only, using this exact top-level shape:
{
  "newEvidenceItems": [{"id":"new-evidence-1","excerpt":""}],
  "themes": [{"id":"new-theme-1 (for a brand new theme) or the exact existing theme id (to update it)","title":"","description":"","evidenceItemIds":[],"uncertaintyNotes":[]}],
  "schemaAreaMappings": [{"schemaArea":"other","evidenceItemIds":[],"notes":[]}]
}

Rules:
- newEvidenceItems: only quotes not already captured. Give each a local id like "new-evidence-1", "new-evidence-2".
- themes: only include a theme here if it's genuinely new, or an existing theme needs updating because of new evidence. Do not re-list unchanged existing themes. evidenceItemIds may reference either an existing evidence id shown below, or one of this turn's new-evidence-N ids.
- schemaAreaMappings: always return the FULL current picture across all 10 areas (this one is not incremental) -- capabilities, constraints, preferences, motivations, environment_fit, relationships, values, decision_making, uncertainty, other. evidenceItemIds here MUST reference real evidence: either an existing evidence id shown below, or one of this turn's new-evidence-N ids from newEvidenceItems above. Never invent an id, and never list an area's evidenceItemIds unless a specific quote actually supports it -- an area is only "filled" once real evidence backs it, not because it was touched on in passing. If a category came up only vaguely, with no specific quote to point to yet, put a short note in \`notes\` instead of an evidenceItemIds entry. Use empty arrays/notes where the transcript doesn't support a category.`;

function buildOzCaptureInstruction(previousCapture) {
  const priorEvidence = Array.isArray(previousCapture?.evidenceItems) ? previousCapture.evidenceItems : [];
  const priorThemes = Array.isArray(previousCapture?.emergingThemes) ? previousCapture.emergingThemes : [];
  if (!priorEvidence.length && !priorThemes.length) return OZ_CAPTURE_BASE_INSTRUCTION;

  const evidenceSummary = priorEvidence.map((item) => `- ${item.id}: "${item.excerpt}"`).join("\n") || "(none)";
  const themeSummary = priorThemes.map((theme) => `- ${theme.id}: "${theme.title}" -- ${theme.description}`).join("\n") || "(none)";

  return `${OZ_CAPTURE_BASE_INSTRUCTION}

Already captured in earlier turns -- do not repeat any of this:

Existing evidence:
${evidenceSummary}

Existing themes:
${themeSummary}`;
}

// Merges a turn's delta response into the accumulated capture, assigning
// globally-unique ids to genuinely-new items and remapping any references
// to this turn's local new-evidence-N ids so themes stay correctly linked.
function mergeCapture(previousCapture, delta) {
  const priorEvidence = Array.isArray(previousCapture?.evidenceItems) ? previousCapture.evidenceItems : [];
  const priorThemes = Array.isArray(previousCapture?.emergingThemes) ? previousCapture.emergingThemes : [];

  const newEvidenceRaw = Array.isArray(delta.newEvidenceItems) ? delta.newEvidenceItems : [];
  const localToGlobalEvidenceId = new Map();
  const newEvidenceItems = newEvidenceRaw
    .filter((item) => item && typeof item.excerpt === "string" && item.excerpt.trim())
    .map((item, index) => {
      const globalId = `evidence-${priorEvidence.length + index + 1}`;
      if (typeof item.id === "string") localToGlobalEvidenceId.set(item.id, globalId);
      return { id: globalId, excerpt: item.excerpt, sourceTurnIds: [], schemaAreas: [], uncertaintyNotes: [] };
    });
  const evidenceItems = [...priorEvidence, ...newEvidenceItems];
  const validEvidenceIds = new Set(evidenceItems.map((item) => item.id));

  // Also drops any id that still doesn't resolve to a real evidence item
  // after remapping (a hallucinated id, or one from a prior schema version)
  // -- coverage/"filled" status downstream must only ever reflect evidence
  // that genuinely exists, never Oz's raw say-so.
  const remapEvidenceIds = (ids) => (Array.isArray(ids) ? ids.map((id) => localToGlobalEvidenceId.get(id) ?? id).filter((id) => validEvidenceIds.has(id)) : []);

  const schemaAreaMappings = (Array.isArray(delta.schemaAreaMappings) ? delta.schemaAreaMappings : []).map((mapping) => ({
    schemaArea: mapping?.schemaArea,
    evidenceItemIds: remapEvidenceIds(mapping?.evidenceItemIds),
    possibleSignalIds: [],
    notes: Array.isArray(mapping?.notes) ? mapping.notes : [],
  }));

  const themeById = new Map(priorThemes.map((theme) => [theme.id, theme]));
  let nextThemeNumber = priorThemes.length + 1;
  for (const theme of Array.isArray(delta.themes) ? delta.themes : []) {
    if (!theme || typeof theme.title !== "string") continue;
    const isUpdateToExisting = typeof theme.id === "string" && themeById.has(theme.id);
    const finalId = isUpdateToExisting ? theme.id : `theme-${nextThemeNumber++}`;
    themeById.set(finalId, {
      id: finalId,
      title: theme.title,
      description: typeof theme.description === "string" ? theme.description : "",
      evidenceItemIds: remapEvidenceIds(theme.evidenceItemIds),
      participantConfirmationNeeded: true,
      uncertaintyNotes: Array.isArray(theme.uncertaintyNotes) ? theme.uncertaintyNotes : [],
    });
  }

  return { evidenceItems, emergingThemes: [...themeById.values()], schemaAreaMappings };
}

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
    const previousCapture = body.previousCapture && typeof body.previousCapture === "object" ? body.previousCapture : null;

    const response = await fetch(`${OPENAI_API_BASE}/v1/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OZ_CAPTURE_MODEL,
        instructions: buildOzCaptureInstruction(previousCapture),
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
    const merged = mergeCapture(previousCapture, capture);

    // Response keeps the full OzDiscoveryCapture shape for backward
    // compatibility (nothing on the client needs to change): evidenceItems
    // and emergingThemes are the accumulated result of merging this turn's
    // delta into previousCapture, not just this turn's model output. The
    // model is no longer asked to generate possibleSignals, openQuestions,
    // doNotAssumeNotes, top-level participantConfirmationNeeded, or
    // top-level uncertaintyNotes -- those keys stay always empty.
    sendJson(res, 200, {
      captureId: crypto.randomUUID(),
      version: "0.1",
      createdAt: new Date().toISOString(),
      transcriptThroughTurnId: lastTurn.id,
      evidenceItems: merged.evidenceItems,
      possibleSignals: [],
      emergingThemes: merged.emergingThemes,
      openQuestions: [],
      doNotAssumeNotes: [],
      participantConfirmationNeeded: [],
      // merged.schemaAreaMappings (not the raw model output) -- evidenceItemIds
      // have already been resolved to real evidence ids and anything that
      // didn't resolve has been dropped, so "filled" downstream always means
      // genuine evidence exists, not just that Oz mentioned the area.
      schemaAreaMappings: merged.schemaAreaMappings,
      uncertaintyNotes: [],
    });
  } catch {
    sendJson(res, 400, { error: "Invalid Oz capture request" });
  }
}

