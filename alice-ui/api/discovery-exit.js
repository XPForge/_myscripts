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

function toPercentage(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : null;
}

function toCount(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
}

// Sent via navigator.sendBeacon as the participant leaves mid-Discovery, so
// this has to tolerate a body that never arrives (browser can drop the
// beacon) and must never make the caller wait -- there's no one listening
// for the response by the time it lands.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!DATABASE_URL) {
    sendJson(res, 500, { error: "Exit-event storage is not configured" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  const exitReason = body.exitReason === "pagehide" ? "pagehide" : "visibilitychange";
  const participantName = typeof body.participantName === "string" ? body.participantName.trim() : "";
  const participantEmail = typeof body.participantEmail === "string" ? body.participantEmail.trim() : "";

  try {
    const session = readSessionFromRequest(req);
    const sql = neon(DATABASE_URL);
    await sql`
      INSERT INTO discovery_exit_events
        (user_id, participant_name, participant_email, schema_coverage_percentage, profile_readiness_percentage, turn_count, profile_generated, exit_reason)
      VALUES
        (${session?.userId || null}, ${participantName || null}, ${participantEmail || null}, ${toPercentage(body.schemaCoveragePercentage)}, ${toPercentage(body.profileReadinessPercentage)}, ${toCount(body.turnCount)}, ${body.profileGenerated === true}, ${exitReason})
    `;
    sendJson(res, 200, { status: "recorded" });
  } catch (err) {
    console.error("discovery-exit error:", err);
    sendJson(res, 500, { error: "Unable to record exit event" });
  }
}
