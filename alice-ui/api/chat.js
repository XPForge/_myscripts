const OPENAI_API_BASE = (process.env.OPENAI_API_BASE || "https://api.openai.com").replace(/\/+$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-sol";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
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

  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 500, { error: "OPENAI_API_KEY is not configured" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const system = typeof body.system === "string" ? body.system : "";

    const response = await fetch(`${OPENAI_API_BASE}/v1/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: system,
        input: messages,
      }),
    });

    if (!response.ok) {
      sendJson(res, 502, { error: "OpenAI request failed" });
      return;
    }

    const payload = await response.json();
    const reply = extractText(payload);
    sendJson(res, 200, { reply: reply || "What feels important to add next?" });
  } catch {
    sendJson(res, 400, { error: "Invalid chat request" });
  }
}
