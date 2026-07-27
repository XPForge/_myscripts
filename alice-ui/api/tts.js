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
const TTS_MODEL = sanitizeSecret(process.env.OPENAI_TTS_MODEL) || "gpt-4o-mini-tts";
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!OPENAI_API_KEY) {
    sendJson(res, 500, { error: "OPENAI_API_KEY is not configured" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid request body" });
    return;
  }
  const input = typeof body.input === "string" ? body.input.trim() : "";
  const voice = typeof body.voice === "string" ? body.voice : "sage";
  const instructions = typeof body.instructions === "string" ? body.instructions.trim() : "";
  const responseFormat = typeof body.responseFormat === "string" ? body.responseFormat : "mp3";

  if (!input) {
    sendJson(res, 400, { error: "Missing input" });
    return;
  }

  const response = await fetch(`${OPENAI_API_BASE}/v1/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice,
      input,
      instructions: instructions || undefined,
      response_format: responseFormat,
    }),
  });

  if (!response.ok) {
    sendJson(res, 502, { error: "Speech request failed" });
    return;
  }

  const audio = Buffer.from(await response.arrayBuffer());
  res.statusCode = 200;
  res.setHeader("Content-Type", responseFormat === "wav" ? "audio/wav" : "audio/mpeg");
  res.end(audio);
}
