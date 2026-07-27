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
  res.statusCode = response.ok ? 200 : 502;
  res.setHeader("Content-Type", response.headers.get("Content-Type") || "application/json");
  res.end(payload);
}

