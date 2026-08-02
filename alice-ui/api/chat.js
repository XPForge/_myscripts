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
const OPENAI_API_KEY = sanitizeSecret(process.env.OPENAI_API_KEY);

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

function extractText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  return payload?.output
    ?.flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("");
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

  try {
    const body = await readJsonBody(req);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const system = typeof body.system === "string" ? body.system : "";

    const response = await fetch(`${OPENAI_API_BASE}/v1/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: system,
        input: messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("chat OpenAI error:", response.status, errText);
      sendJson(res, 502, { error: "OpenAI request failed" });
      return;
    }

    const payload = await response.json();
    const reply = extractText(payload);

    try {
      const session = readSessionFromRequest(req);
      recordCostEvent({
        service: "openai.chat",
        model: OPENAI_MODEL,
        kind: "discovery_chat_turn",
        sessionId: getSessionIdFromRequest(req),
        quantity: (payload.usage?.input_tokens ?? 0) + (payload.usage?.output_tokens ?? 0),
        unit: "tokens",
        estimatedCostUsd: estimateChatCostUsd("openai.chat", OPENAI_MODEL, payload.usage),
        isTestAccount: isAdminEmail(session?.email),
        meta: { inputTokens: payload.usage?.input_tokens ?? null, outputTokens: payload.usage?.output_tokens ?? null },
      });
    } catch {
      // Cost logging must never affect the actual chat response.
    }

    sendJson(res, 200, { reply: reply || "What feels important to add next?" });
  } catch (err) {
    console.error("chat handler error:", err);
    sendJson(res, 400, { error: "Invalid chat request" });
  }
}
