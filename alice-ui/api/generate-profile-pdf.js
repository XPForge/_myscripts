import { renderProfilePdf } from "./_lib/profilePdf.js";

export const config = { api: { bodyParser: false } };

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

  let participantName;
  let profile;
  try {
    const body = await readJsonBody(req);
    if (!body.profile || typeof body.profile !== "object") {
      sendJson(res, 400, { error: "Invalid request: profile is required" });
      return;
    }
    participantName = typeof body.participantName === "string" ? body.participantName : "";
    profile = body.profile;
  } catch {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  try {
    const pdfBuffer = await renderProfilePdf(participantName, profile);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="lighthouse-discovery-profile.pdf"');
    res.end(pdfBuffer);
  } catch (err) {
    console.error("generate-profile-pdf error:", err);
    sendJson(res, 500, { error: "PDF generation failed" });
  }
}
