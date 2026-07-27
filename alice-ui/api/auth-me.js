import { readSessionFromRequest } from "./_lib/auth.js";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const session = readSessionFromRequest(req);
  if (!session) {
    sendJson(res, 200, { user: null });
    return;
  }
  sendJson(res, 200, { user: { id: session.userId, name: session.name, email: session.email } });
}
