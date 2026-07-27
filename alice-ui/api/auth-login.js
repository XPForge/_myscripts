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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!DATABASE_URL) {
    sendJson(res, 500, { error: "Account storage is not configured" });
    return;
  }

  let email;
  let password;
  try {
    const body = await readJsonBody(req);
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      sendJson(res, 400, { error: "Email and password are required" });
      return;
    }
  } catch {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  try {
    const sql = neon(DATABASE_URL);
    const rows = await sql`SELECT id, name, email, password_hash FROM users WHERE email = ${email}`;
    const user = rows[0];

    // Same generic error whether the email doesn't exist or the password is
    // wrong -- never reveal which one it was.
    if (!user) {
      sendJson(res, 401, { error: "Invalid email or password" });
      return;
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      sendJson(res, 401, { error: "Invalid email or password" });
      return;
    }

    await sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`;

    const token = issueSessionToken(user);
    setSessionCookie(res, req, token);
    sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("auth-login error:", err);
    sendJson(res, 500, { error: "Unable to sign in" });
  }
}
