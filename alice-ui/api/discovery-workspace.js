import { neon } from "@neondatabase/serverless";
import { readSessionFromRequest } from "./_lib/auth.js";

export const config = { api: { bodyParser: false } };

function sanitizeSecret(value) {
  if (!value) return value;
  return value
    .split("")
    .filter((ch) => ch.charCodeAt(0) !== 0xfeff)
    .join("")
    .trim();
}

const DATABASE_URL = sanitizeSecret(process.env.DATABASE_URL);

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

// Mirrors src/services/ozSchemaCoverage.ts's OZ_SCHEMA_AREA_LABELS, but
// phrased for a sentence rather than a checklist row -- this file's whole
// job is turning structured state into something that reads like memory,
// not a database dump. Duplicated here (plain JS) so this serverless
// function has no fragile cross-file import chain.
const OZ_SCHEMA_AREA_LABELS = {
  capabilities: "what they're capable of",
  constraints: "what limits or constrains them",
  preferences: "how they like to work",
  motivations: "what motivates them",
  environment_fit: "the environments where they fit best",
  relationships: "how they relate to and work with others",
  values: "what matters most to them",
  decision_making: "how they make decisions",
  uncertainty: "what's still uncertain or unconfirmed",
  other: "other notable observations",
};

function joinNatural(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Mirrors src/services/ozSchemaCoverage.ts's MINIMUM_EVIDENCE_FOR_FILLED --
// a single rough per-area token (Oz's own description of what these ids
// are) isn't enough to honestly claim "explored in meaningful depth" to the
// participant. Keep these two thresholds in sync.
const MINIMUM_EVIDENCE_FOR_FILLED = 2;

// Turns structured Oz state into 1-3 plain sentences -- never raw schema
// names, resolution labels, evidence counts, or "continuity packet"
// language reach Alice's prompt directly. Template-based, not a model call:
// the mapping is small (10 areas, a couple of status buckets) so this stays
// simple and free, matching the rest of this session's cost-consciousness.
function buildMemorySummary(ozCapture, profileGenerated) {
  const mappings = Array.isArray(ozCapture?.schemaAreaMappings) ? ozCapture.schemaAreaMappings : [];
  const filled = [];
  const touched = [];
  for (const mapping of mappings) {
    const label = OZ_SCHEMA_AREA_LABELS[mapping?.schemaArea];
    if (!label) continue;
    const evidenceCount = Array.isArray(mapping.evidenceItemIds) ? mapping.evidenceItemIds.length : 0;
    const hasSignal = (Array.isArray(mapping.possibleSignalIds) && mapping.possibleSignalIds.length > 0) || (Array.isArray(mapping.notes) && mapping.notes.length > 0);
    if (evidenceCount >= MINIMUM_EVIDENCE_FOR_FILLED) filled.push(label);
    else if (evidenceCount > 0 || hasSignal) touched.push(label);
  }

  const sentences = [];
  if (filled.length) sentences.push(`This participant has already explored ${joinNatural(filled)} in meaningful depth.`);
  if (touched.length) {
    const verb = touched.length === 1 ? "has" : "have";
    const remain = touched.length === 1 ? "remains" : "remain";
    sentences.push(`${capitalize(joinNatural(touched))} ${verb} come up, but ${remain} less developed.`);
  }

  const themes = Array.isArray(ozCapture?.emergingThemes) ? ozCapture.emergingThemes : [];
  if (themes.length) {
    const richest = [...themes].sort((a, b) => (b?.evidenceItemIds?.length ?? 0) - (a?.evidenceItemIds?.length ?? 0))[0];
    if (richest?.title) sentences.push(`A notable thread so far: ${richest.title.toLowerCase()}.`);
  }

  if (profileGenerated) sentences.push("An initial profile has already been generated.");

  return sentences.length ? sentences.join(" ") : null;
}

async function getOrCreateWorkspaceId(sql, userId) {
  const existing = await sql`SELECT id FROM discovery_workspaces WHERE user_id = ${userId}`;
  if (existing[0]) return existing[0].id;
  const created = await sql`INSERT INTO discovery_workspaces (user_id) VALUES (${userId}) RETURNING id`;
  return created[0].id;
}

async function getLatestSession(sql, workspaceId) {
  const rows = await sql`SELECT * FROM discovery_sessions WHERE workspace_id = ${workspaceId} ORDER BY session_number DESC LIMIT 1`;
  return rows[0] ?? null;
}

async function handleGet(req, res, sql, userId) {
  const workspaceId = await getOrCreateWorkspaceId(sql, userId);
  const latest = await getLatestSession(sql, workspaceId);

  if (!latest) {
    sendJson(res, 200, { relationshipState: "first_session", memorySummary: null, turns: null, ozCapture: null, checkpointAnnounced: false });
    return;
  }

  if (latest.profile_generated) {
    // A profile already exists for the prior session -- this visit starts a
    // fresh session row under the same workspace rather than reopening the
    // old (now-finalized) transcript. memorySummary still carries forward
    // what was learned; the visible transcript starts clean.
    const memorySummary = buildMemorySummary(latest.oz_capture_json, true);
    await sql`
      INSERT INTO discovery_sessions (workspace_id, session_number, turns_json, checkpoint_announced, profile_generated)
      VALUES (${workspaceId}, ${latest.session_number + 1}, ${JSON.stringify([])}, false, false)
    `;
    sendJson(res, 200, { relationshipState: "continuing_after_profile", memorySummary, turns: null, ozCapture: null, checkpointAnnounced: false });
    return;
  }

  const relationshipState = latest.checkpoint_announced ? "returning_session" : "resuming_interrupted_session";
  const memorySummary = buildMemorySummary(latest.oz_capture_json, false);
  // checkpointAnnounced is carried forward as-is (not reset to false client-side
  // like a fresh mount would default to) -- otherwise a resumed session that
  // already crossed the checkpoint in a prior visit re-announces it and
  // reopens the review modal the instant the restored coverage lands. See
  // DiscoveryPage.tsx's workspace-restore effect for where this gets applied.
  sendJson(res, 200, { relationshipState, memorySummary, turns: latest.turns_json, ozCapture: latest.oz_capture_json, checkpointAnnounced: latest.checkpoint_announced });
}

async function handleDelete(req, res, sql, userId) {
  // Backs both "Reset Discovery Profile" and "Delete My Data" -- both need
  // the server-side workspace cleared, not just localStorage, now that the
  // server is the authoritative continuity source. Session rows must go
  // first (FK reference), then the workspace row itself; getOrCreateWorkspaceId
  // will lazily recreate a fresh one on the next visit.
  const existing = await sql`SELECT id FROM discovery_workspaces WHERE user_id = ${userId}`;
  if (existing[0]) {
    await sql`DELETE FROM discovery_sessions WHERE workspace_id = ${existing[0].id}`;
    await sql`DELETE FROM discovery_workspaces WHERE id = ${existing[0].id}`;
  }
  sendJson(res, 200, { status: "deleted" });
}

async function handlePost(req, res, sql, userId, body) {
  if (!Array.isArray(body.turns)) {
    sendJson(res, 400, { error: "Invalid request: turns is required" });
    return;
  }
  const workspaceId = await getOrCreateWorkspaceId(sql, userId);
  const latest = await getLatestSession(sql, workspaceId);
  const turnsJson = JSON.stringify(body.turns);
  const ozCaptureJson = body.ozCapture ? JSON.stringify(body.ozCapture) : null;
  const checkpointAnnounced = body.checkpointAnnounced === true;
  const profileGenerated = body.profileGenerated === true;

  if (latest) {
    await sql`
      UPDATE discovery_sessions
      SET turns_json = ${turnsJson}, oz_capture_json = ${ozCaptureJson}, checkpoint_announced = ${checkpointAnnounced}, profile_generated = ${profileGenerated}, updated_at = now()
      WHERE id = ${latest.id}
    `;
  } else {
    await sql`
      INSERT INTO discovery_sessions (workspace_id, session_number, turns_json, oz_capture_json, checkpoint_announced, profile_generated)
      VALUES (${workspaceId}, 1, ${turnsJson}, ${ozCaptureJson}, ${checkpointAnnounced}, ${profileGenerated})
    `;
  }
  await sql`UPDATE discovery_workspaces SET updated_at = now() WHERE id = ${workspaceId}`;
  sendJson(res, 200, { status: "synced" });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "DELETE") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (!DATABASE_URL) {
    sendJson(res, 500, { error: "Discovery workspace storage is not configured" });
    return;
  }

  const session = readSessionFromRequest(req);
  if (!session?.userId) {
    sendJson(res, 401, { error: "Sign in required" });
    return;
  }

  try {
    const sql = neon(DATABASE_URL);
    if (req.method === "GET") {
      await handleGet(req, res, sql, session.userId);
      return;
    }
    if (req.method === "DELETE") {
      await handleDelete(req, res, sql, session.userId);
      return;
    }
    const body = await readJsonBody(req);
    await handlePost(req, res, sql, session.userId, body);
  } catch (err) {
    console.error("discovery-workspace error:", err);
    sendJson(res, 500, { error: "Discovery workspace request failed" });
  }
}
