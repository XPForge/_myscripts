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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

async function handleLogin(req, res, body) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    sendJson(res, 400, { error: "Email and password are required" });
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
    console.error("auth-credentials (login) error:", err);
    sendJson(res, 500, { error: "Unable to sign in" });
  }
}

async function handleSignup(req, res, body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
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
    console.error("auth-credentials (signup) error:", err);
    sendJson(res, 500, { error: "Unable to create account" });
  }
}

// Combines the old auth-login and auth-signup endpoints into one serverless
// function -- Vercel's Hobby plan caps a deployment at 12 functions, and
// adding profile-author.js/profile-delivery.js pushed the project to 13.
// These two were both POST-only with near-identical plumbing, so they're
// merged here with a `mode` field distinguishing the two, same pattern
// already used for auth-session.js's GET/POST merge of auth-me/auth-logout.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!DATABASE_URL) {
    sendJson(res, 500, { error: "Account storage is not configured" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  if (body.mode === "login") {
    await handleLogin(req, res, body);
    return;
  }
  if (body.mode === "signup") {
    await handleSignup(req, res, body);
    return;
  }
  sendJson(res, 400, { error: "Invalid request: mode must be 'login' or 'signup'" });
}
