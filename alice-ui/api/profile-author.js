// Vercel/Vite-compatible serverless equivalent of backend/modelResponseEndpoint.ts's
// authorProfile handler — same instructions, same behavior, but reachable at a
// relative path (/api/profile-author) instead of a hardcoded localhost port,
// so it actually works once deployed.

import { neon } from "@neondatabase/serverless";
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
const OPENAI_MODEL = sanitizeSecret(process.env.OPENAI_MODEL) || "gpt-5.6-sol";
// Decoupled from OPENAI_REALTIME_MODEL (the live voice model, which may be a
// cheaper mini variant) — always defaults to the flagship text model.
const PROFILE_AUTHORING_MODEL = sanitizeSecret(process.env.PROFILE_AUTHORING_MODEL) || OPENAI_MODEL;
const OPENAI_API_KEY = sanitizeSecret(process.env.OPENAI_API_KEY);
const DATABASE_URL = sanitizeSecret(process.env.DATABASE_URL);

// Best-effort retention of a development copy. Only called when the
// participant explicitly consents via the Participant Authority checkbox.
// A failure here must never break profile generation for the participant.
async function saveDevelopmentCopy(participantName, participantEmail, model, profile, userId) {
  if (!DATABASE_URL) return;
  try {
    const sql = neon(DATABASE_URL);
    await sql`
      INSERT INTO discovery_profiles (participant_name, participant_email, model, profile_json, user_id)
      VALUES (${participantName}, ${participantEmail || null}, ${model}, ${JSON.stringify(profile)}, ${userId || null})
    `;
  } catch (err) {
    console.error("Failed to save development copy:", err);
  }
}

// Mirrors src/services/lighthouseProfile.ts's DISCOVERY_FIELD_KEYS and
// src/services/discoverySchemaTracker.ts's DISCOVERY_FIELD_LABELS. Duplicated
// here (plain JS, no TS import) so this serverless function has no fragile
// cross-file import chain in the deployed environment.
const DISCOVERY_FIELD_LABELS = {
  workMotivators: "What motivates their work",
  workFrustrators: "What frustrates or drains them",
  learningCharacteristics: "How they learn",
  problemSolvingCharacteristics: "How they solve problems",
  communicationCharacteristics: "How they communicate",
  leadershipCharacteristics: "How they lead",
  collaborationCharacteristics: "How they collaborate",
  environmentalAccelerators: "Environments that help them thrive",
  environmentalInhibitors: "Environments that hold them back",
  adaptabilityCharacteristics: "How they adapt to change",
  pressureResponse: "How they respond under pressure",
  opportunityIndicators: "What opportunities interest them",
  overlookedCharacteristics: "Strengths that get overlooked",
  supportingEvidence: "Concrete examples and evidence",
  emergentDiscoveries: "New things surfacing in conversation",
  notYetDiscovered: "What's still unexplored",
};

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

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString("utf8"));
}

function getAnswer(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text;

  const text = payload.output
    ?.flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("");

  return text?.trim() ? text : null;
}

function extractFirstJsonObject(text) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildProfileAuthoringInstructions() {
  const fieldList = Object.entries(DISCOVERY_FIELD_LABELS)
    .map(([key, label]) => `- "${key}": ${label}`)
    .join("\n");

  return [
    "You are authoring a Lighthouse Discovery profile from a completed discovery conversation transcript.",
    "This is Discovery, not evaluation: do not score, rank, diagnose, or produce fit/match/percentage judgments.",
    "Base every statement only on what the transcript actually supports. If something was not discussed, say so plainly rather than inventing it.",
    "Return ONLY a single JSON object (no prose outside it) with exactly these keys:",
    fieldList,
    '- "discoverySummary": a short narrative summary of the whole conversation',
    '- "generatedProfile": a polished, complete, well-formatted long-form profile document combining all of the above into readable prose with headings',
    "Every value must be a string. If the transcript does not support a field, use a short honest note such as \"Not enough was discussed to describe this yet.\" instead of inventing content.",
  ].join("\n");
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
  if (!PROFILE_AUTHORING_MODEL) {
    sendJson(res, 500, { error: "Profile authoring model is not configured" });
    return;
  }

  let transcript;
  let participantName;
  let participantEmail;
  let retainForDevelopment;
  try {
    const body = await readJsonBody(req);
    if (typeof body.transcript !== "string" || !body.transcript.trim()) {
      sendJson(res, 400, { error: "Invalid request: transcript is required" });
      return;
    }
    transcript = body.transcript;
    participantName = typeof body.participantName === "string" ? body.participantName : "the participant";
    participantEmail = typeof body.participantEmail === "string" ? body.participantEmail : "";
    retainForDevelopment = body.retainForDevelopment === true;
  } catch {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  try {
    const response = await fetch(`${OPENAI_API_BASE}/v1/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PROFILE_AUTHORING_MODEL,
        instructions: buildProfileAuthoringInstructions(),
        input: `Participant: ${participantName}\n\nTranscript:\n${transcript}`,
      }),
    });

    if (!response.ok) {
      sendJson(res, 502, { error: "Profile authoring request failed" });
      return;
    }

    const payload = await response.json().catch(() => null);
    const answer = getAnswer(payload);
    if (!answer) {
      sendJson(res, 502, { error: "Profile authoring request failed" });
      return;
    }

    const parsed = extractFirstJsonObject(answer);
    if (!parsed || typeof parsed !== "object") {
      sendJson(res, 502, { error: "Profile authoring returned an unreadable response" });
      return;
    }

    const session = readSessionFromRequest(req);

    if (retainForDevelopment) {
      await saveDevelopmentCopy(participantName, participantEmail, PROFILE_AUTHORING_MODEL, parsed, session?.userId);
    }

    try {
      recordCostEvent({
        service: "openai.chat",
        model: PROFILE_AUTHORING_MODEL,
        kind: "profile_authoring",
        sessionId: getSessionIdFromRequest(req),
        quantity: (payload?.usage?.input_tokens ?? 0) + (payload?.usage?.output_tokens ?? 0),
        unit: "tokens",
        estimatedCostUsd: estimateChatCostUsd("openai.chat", PROFILE_AUTHORING_MODEL, payload?.usage),
        isTestAccount: isAdminEmail(session?.email),
        meta: { inputTokens: payload?.usage?.input_tokens ?? null, outputTokens: payload?.usage?.output_tokens ?? null },
      });
    } catch {
      // Cost logging must never affect the actual profile-authoring response.
    }

    sendJson(res, 200, { model: PROFILE_AUTHORING_MODEL, profile: parsed });
  } catch {
    sendJson(res, 500, { error: "Profile authoring request failed" });
  }
}
