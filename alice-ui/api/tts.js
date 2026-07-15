const OPENAI_API_BASE = (process.env.OPENAI_API_BASE || "https://api.openai.com").replace(/\/+$/, "");
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 500, { error: "OPENAI_API_KEY is not configured" });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
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
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
