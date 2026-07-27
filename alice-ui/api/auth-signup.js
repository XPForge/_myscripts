import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { issueSessionToken, setSessionCookie } from "./_lib/auth.js";

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!DATABASE_URL) {
    sendJson(res, 500, { error: "Account storage is not configured" });
    return;
  }

  let name;
  let email;
  let password;
  try {
    const body = await readJsonBody(req);
    name = typeof body.name === "string" ? body.name.trim() : "";
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    password = typeof body.password === "string" ? body.password : "";
    if (!name) {
      sendJson(res, 400, { error: "Name is required" });
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      sendJson(res, 400, { error: "A valid email is required" });
      return;
    }
    if (password.length < 8) {
      sendJson(res, 400, { error: "Password must be at least 8 characters" });
      return;
    }
  } catch {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  try {
    const sql = neon(DATABASE_URL);
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      sendJson(res, 409, { error: "An account with that email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const rows = await sql`
      INSERT INTO users (name, email, password_hash, last_login_at)
      VALUES (${name}, ${email}, ${passwordHash}, now())
      RETURNING id, name, email
    `;
    const user = rows[0];

    const token = issueSessionToken(user);
    setSessionCookie(res, req, token);
    sendJson(res, 200, { user });
  } catch (err) {
    if (err?.code === "23505") {
      sendJson(res, 409, { error: "An account with that email already exists" });
      return;
    }
    console.error("auth-signup error:", err);
    sendJson(res, 500, { error: "Unable to create account" });
  }
}
