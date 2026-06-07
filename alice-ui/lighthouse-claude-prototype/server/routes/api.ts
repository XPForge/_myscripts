import type { IncomingMessage, ServerResponse } from "node:http";
import { normalizeContext } from "../prompts/wrappers.js";
import type { SessionOrchestrator } from "../orchestrator/sessionOrchestrator.js";
import { logServerError, sendJson, sendSafeError } from "../security/sanitizeError.js";

async function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function readJson(req: IncomingMessage) {
  const body = await readBody(req);
  return body ? JSON.parse(body) : {};
}

function publicSession(session: { id: string; context: string; turns: unknown[]; profileMarkdown?: string }) {
  return {
    id: session.id,
    context: session.context,
    turns: session.turns,
    profileMarkdown: session.profileMarkdown,
  };
}

export async function handleApi(pathname: string, req: IncomingMessage, res: ServerResponse, orchestrator: SessionOrchestrator) {
  try {
    if (pathname === "/api/sessions") {
      const body = await readJson(req);
      const session = await orchestrator.start(normalizeContext(body.context));
      sendJson(res, 200, { session: publicSession(session) });
      return;
    }

    if (pathname === "/api/conversation/text") {
      const body = await readJson(req);
      const session = await orchestrator.acceptText(String(body.sessionId || ""), String(body.text || ""));
      sendJson(res, 200, { session: publicSession(session) });
      return;
    }

    if (pathname === "/api/profile/generate") {
      const body = await readJson(req);
      const session = await orchestrator.generateProfile(String(body.sessionId || ""));
      sendJson(res, 200, { session: publicSession(session), profileMarkdown: session.profileMarkdown });
      return;
    }

    if (pathname === "/api/sessions/get") {
      const body = await readJson(req);
      const session = orchestrator.getSession(String(body.sessionId || ""));
      sendJson(res, 200, { session: publicSession(session) });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    logServerError(pathname, error);
    sendSafeError(res);
  }
}
