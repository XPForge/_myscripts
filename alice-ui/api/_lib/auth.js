import jwt from "jsonwebtoken";

function sanitizeSecret(value) {
  if (!value) return value;
  return value
    .split("")
    .filter((ch) => ch.charCodeAt(0) !== 0xfeff)
    .join("")
    .trim();
}

const AUTH_JWT_SECRET = sanitizeSecret(process.env.AUTH_JWT_SECRET);
const SESSION_COOKIE_NAME = "lighthouse_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function issueSessionToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, AUTH_JWT_SECRET, {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

export function verifySessionToken(token) {
  try {
    const payload = jwt.verify(token, AUTH_JWT_SECRET);
    return { userId: payload.sub, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function readSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}

// Vercel's Node runtime always uses HTTPS at the edge in Production/Preview;
// the local dev proxy is plain http, so Secure would silently drop the
// cookie there.
function isSecureContext(req) {
  return req.headers["x-forwarded-proto"] === "https";
}

export function setSessionCookie(res, req, token) {
  const secure = isSecureContext(req) ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`
  );
}

export function clearSessionCookie(res, req) {
  const secure = isSecureContext(req) ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}
