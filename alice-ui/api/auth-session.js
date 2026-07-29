import { clearSessionCookie, readSessionFromRequest } from "./_lib/auth.js";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

// Combines the old auth-me (GET) and auth-logout (POST) endpoints into one
// serverless function -- Vercel's Hobby plan caps a deployment at 12
// functions, and these two were the smallest, most naturally paired pair to
// merge without touching anything's actual behavior.
export default async function handler(req, res) {
  if (req.method === "GET") {
    const session = readSessionFromRequest(req);
    if (!session) {
      sendJson(res, 200, { user: null });
      return;
    }
    sendJson(res, 200, { user: { id: session.userId, name: session.name, email: session.email } });
    return;
  }

  if (req.method === "POST") {
    clearSessionCookie(res, req);
    sendJson(res, 200, { status: "signed_out" });
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}
