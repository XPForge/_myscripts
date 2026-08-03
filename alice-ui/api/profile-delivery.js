import { renderProfilePdf } from "./_lib/profilePdf.js";
import { readSessionFromRequest, isAdminEmail } from "./_lib/auth.js";
import { getSessionIdFromRequest, estimateEmailCostUsd, recordCostEvent } from "./_lib/costTracking.js";

export const config = { api: { bodyParser: false } };

function sanitizeSecret(value) {
  if (!value) return value;
  return value
    .split("")
    .filter((ch) => ch.charCodeAt(0) !== 0xfeff)
    .join("")
    .trim();
}

const RESEND_API_KEY = sanitizeSecret(process.env.RESEND_API_KEY);
const FROM_ADDRESS = sanitizeSecret(process.env.PROFILE_EMAIL_FROM) || "Lighthouse Discovery <discovery@beseenatlighthouse.online>";

// Mirrors src/services/ozSchemaCoverage.ts's OZ_SCHEMA_AREA_LABELS and
// api/profile-author.js's copy of the same map -- duplicated here so this
// serverless function has no fragile cross-file import chain.
const OZ_SCHEMA_AREA_LABELS = {
  capabilities: "What they're capable of",
  constraints: "What limits or constrains them",
  preferences: "How they like to work",
  motivations: "What motivates them",
  environment_fit: "The environments where they fit best",
  relationships: "How they relate to and work with others",
  values: "What matters most to them",
  decision_making: "How they make decisions",
  uncertainty: "What's still uncertain or unconfirmed",
  other: "Other notable observations",
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function paragraphs(text) {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px 0;">${block.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function buildProfileEmailHtml(participantName, profile) {
  const sections = Object.entries(OZ_SCHEMA_AREA_LABELS)
    .map(([key, label]) => {
      const value = profile[key];
      if (!value) return "";
      return `
        <tr>
          <td style="padding:18px 0;border-top:1px solid #e5e7eb;">
            <div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#b8860b;font-weight:600;margin-bottom:6px;">${escapeHtml(label)}</div>
            <div style="font-size:15px;line-height:1.6;color:#1f2937;">${escapeHtml(value)}</div>
          </td>
        </tr>`;
    })
    .join("");

  return `
  <div style="background:#f4f5f7;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="background:#0f172a;padding:28px 32px;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f6c34a;margin-bottom:4px;">Project Lighthouse</div>
          <div style="font-size:22px;color:#f6faff;font-weight:600;">Your Discovery Profile</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px 8px 32px;">
          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#1f2937;">Hi ${escapeHtml(participantName || "there")},</p>
          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#1f2937;">Here is the profile Alice authored from your Discovery conversation. This reflects what you shared — nothing scored, ranked, or judged, just what came into view.</p>
        </td>
      </tr>
      ${profile.discoverySummary ? `
      <tr>
        <td style="padding:0 32px 8px 32px;">
          <div style="background:#fff8e6;border:1px solid #f2d98a;border-radius:10px;padding:16px 18px;">
            <div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#92700c;font-weight:600;margin-bottom:6px;">Summary</div>
            <div style="font-size:15px;line-height:1.6;color:#1f2937;">${escapeHtml(profile.discoverySummary)}</div>
          </div>
        </td>
      </tr>` : ""}
      <tr>
        <td style="padding:8px 32px 8px 32px;">
          <table role="presentation" width="100%">
            ${sections}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 32px 32px;border-top:1px solid #e5e7eb;">
          <div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;font-weight:600;margin-bottom:10px;">Full Narrative</div>
          <div style="font-size:14px;line-height:1.7;color:#374151;">${paragraphs(profile.generatedProfile)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;background:#f9fafb;font-size:12px;color:#9ca3af;">
          Sent by Lighthouse Discovery. You received this because you generated a profile at beseenatlighthouse.online.
        </td>
      </tr>
    </table>
  </div>`;
}

async function handlePdf(req, res, body) {
  if (!body.profile || typeof body.profile !== "object") {
    sendJson(res, 400, { error: "Invalid request: profile is required" });
    return;
  }
  const participantName = typeof body.participantName === "string" ? body.participantName : "";
  try {
    const pdfBuffer = await renderProfilePdf(participantName, body.profile);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="lighthouse-discovery-profile.pdf"');
    res.end(pdfBuffer);
  } catch (err) {
    console.error("profile-delivery (pdf) error:", err);
    sendJson(res, 500, { error: "PDF generation failed" });
  }
}

async function handleEmail(req, res, body) {
  if (!RESEND_API_KEY) {
    sendJson(res, 500, { error: "Email delivery is not configured" });
    return;
  }
  if (typeof body.participantEmail !== "string" || !body.participantEmail.trim()) {
    sendJson(res, 400, { error: "Invalid request: participantEmail is required" });
    return;
  }
  if (!body.profile || typeof body.profile !== "object") {
    sendJson(res, 400, { error: "Invalid request: profile is required" });
    return;
  }
  const participantName = typeof body.participantName === "string" ? body.participantName : "";
  const { participantEmail, profile } = body;

  let attachments;
  try {
    const pdfBuffer = await renderProfilePdf(participantName, profile);
    attachments = [{ filename: "lighthouse-discovery-profile.pdf", content: pdfBuffer.toString("base64") }];
  } catch (err) {
    console.error("PDF generation failed, sending email without attachment:", err);
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: participantEmail,
        subject: "Your Lighthouse Discovery Profile",
        html: buildProfileEmailHtml(participantName, profile),
        ...(attachments ? { attachments } : {}),
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("Resend send error:", response.status, errText);
      sendJson(res, 502, { error: "Email delivery failed" });
      return;
    }

    try {
      const session = readSessionFromRequest(req);
      recordCostEvent({
        service: "resend.email",
        model: null,
        kind: "profile_delivery_email",
        sessionId: getSessionIdFromRequest(req),
        quantity: 1,
        unit: "email",
        estimatedCostUsd: estimateEmailCostUsd(),
        isTestAccount: isAdminEmail(session?.email),
      });
    } catch {
      // Cost logging must never affect the actual delivery response.
    }

    sendJson(res, 200, { status: "sent" });
  } catch (err) {
    console.error("profile-delivery (email) error:", err);
    sendJson(res, 500, { error: "Email delivery failed" });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  if (body.mode === "email") {
    await handleEmail(req, res, body);
    return;
  }
  if (body.mode === "pdf") {
    await handlePdf(req, res, body);
    return;
  }
  sendJson(res, 400, { error: "Invalid request: mode must be 'pdf' or 'email'" });
}
