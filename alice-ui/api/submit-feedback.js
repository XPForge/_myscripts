import { neon } from "@neondatabase/serverless";
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

const DATABASE_URL = sanitizeSecret(process.env.DATABASE_URL);
const RESEND_API_KEY = sanitizeSecret(process.env.RESEND_API_KEY);
const FROM_ADDRESS = sanitizeSecret(process.env.PROFILE_EMAIL_FROM) || "Lighthouse Discovery <discovery@beseenatlighthouse.online>";
// Where new testimonial submissions get emailed for review. Not a secret,
// just the one account this whole app already gates developer tools to.
const ADMIN_NOTIFICATION_EMAIL = "humancapabilityprofile@gmail.com";

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

async function notifyAdmin({ id, participantName, participantEmail, feedbackText, inputMode, consent, sessionId, isTestAccount }) {
  if (!RESEND_API_KEY) return;
  try {
    const sendResult = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: `New Discovery feedback${consent ? " (testimonial consent given)" : ""}`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;">
            <p><b>${escapeHtml(participantName || "Anonymous")}</b> (${escapeHtml(participantEmail || "no email")}) left feedback via ${escapeHtml(inputMode)}.</p>
            <p><b>Testimonial consent:</b> ${consent ? "Yes" : "No"}</p>
            <blockquote style="border-left:3px solid #f0bd42;padding-left:12px;margin:16px 0;color:#374151;">${escapeHtml(feedbackText)}</blockquote>
            <p style="color:#9ca3af;font-size:12px;">Record id: ${escapeHtml(id)} — status: pending_review</p>
          </div>
        `,
      }),
    });

    if (sendResult.ok) {
      recordCostEvent({
        service: "resend.email",
        model: null,
        kind: "feedback_admin_notification",
        sessionId: sessionId || null,
        quantity: 1,
        unit: "email",
        estimatedCostUsd: estimateEmailCostUsd(),
        isTestAccount: Boolean(isTestAccount),
      });
    }
  } catch (err) {
    console.error("Failed to send admin feedback notification:", err);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!DATABASE_URL) {
    sendJson(res, 500, { error: "Feedback storage is not configured" });
    return;
  }

  let participantName;
  let participantEmail;
  let feedbackText;
  let inputMode;
  let consentToUseAsTestimonial;
  try {
    const body = await readJsonBody(req);
    if (typeof body.feedbackText !== "string" || !body.feedbackText.trim()) {
      sendJson(res, 400, { error: "Invalid request: feedbackText is required" });
      return;
    }
    participantName = typeof body.participantName === "string" ? body.participantName : "";
    participantEmail = typeof body.participantEmail === "string" ? body.participantEmail : "";
    feedbackText = body.feedbackText.trim();
    inputMode = body.inputMode === "voice" ? "voice" : "typed";
    consentToUseAsTestimonial = body.consentToUseAsTestimonial === true;
  } catch {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  try {
    const session = readSessionFromRequest(req);
    const sql = neon(DATABASE_URL);
    const rows = await sql`
      INSERT INTO testimonials (participant_name, participant_email, feedback_text, input_mode, consent_to_use_as_testimonial, user_id)
      VALUES (${participantName || null}, ${participantEmail || null}, ${feedbackText}, ${inputMode}, ${consentToUseAsTestimonial}, ${session?.userId || null})
      RETURNING id
    `;
    const id = rows[0]?.id;

    await notifyAdmin({
      id,
      participantName,
      participantEmail,
      feedbackText,
      inputMode,
      consent: consentToUseAsTestimonial,
      sessionId: getSessionIdFromRequest(req),
      isTestAccount: isAdminEmail(session?.email),
    });

    sendJson(res, 200, { status: "saved", id });
  } catch (err) {
    console.error("submit-feedback error:", err);
    sendJson(res, 500, { error: "Unable to save feedback" });
  }
}
