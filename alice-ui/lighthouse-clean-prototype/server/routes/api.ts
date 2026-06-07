import { ServerResponse } from "node:http";
import { normalizeContext } from "../prompts/wrappers.js";
import { logServerError, sendClientError, sendJson } from "../security/sanitizeError.js";
import type { SessionOrchestrator } from "../orchestrator/sessionOrchestrator.js";

type Incoming = {
  on(event: "data", listener: (chunk: Buffer) => void): void;
  on(event: "end", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  headers: Record<string, string | string[] | undefined>;
};

async function readBuffer(req: Incoming) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req: Incoming) {
  const body = await readBuffer(req);
  if (body.length === 0) return {};
  return JSON.parse(body.toString("utf8"));
}

function publicSession(session: { id: string; context: string; turns: unknown[]; profileMarkdown?: string }) {
  return {
    id: session.id,
    context: session.context,
    turns: session.turns,
    profileMarkdown: session.profileMarkdown,
  };
}

export async function handleApi(
  pathname: string,
  searchParams: URLSearchParams,
  req: Incoming,
  res: ServerResponse,
  orchestrator: SessionOrchestrator
) {
  try {
    if (pathname === "/api/sessions") {
      const body = await readJson(req);
      const result = await orchestrator.start(normalizeContext(body.context));
      sendJson(res, 200, {
        session: publicSession(result.session),
        assistantText: result.assistantText,
      });
      return;
    }

    if (pathname === "/api/conversation/text") {
      const body = await readJson(req);
      const result = await orchestrator.acceptText(
        String(body.sessionId || ""),
        String(body.text || ""),
        "text",
        Boolean(body.includeAudio)
      );
      sendJson(res, 200, {
        session: publicSession(result.session),
        participantText: result.participantText,
        assistantText: result.assistantText,
        audioBase64: result.audioBase64,
        audioMimeType: result.audioMimeType,
      });
      return;
    }

    if (pathname === "/api/conversation/audio") {
      const sessionId = searchParams.get("sessionId") || "";
      const mimeTypeHeader = req.headers["content-type"];
      const mimeType = Array.isArray(mimeTypeHeader) ? mimeTypeHeader[0] : mimeTypeHeader || "audio/webm";
      const audio = await readBuffer(req);
      const result = await orchestrator.acceptAudio(sessionId, audio, mimeType);
      sendJson(res, 200, {
        session: publicSession(result.session),
        participantText: result.participantText,
        assistantText: result.assistantText,
        audioBase64: result.audioBase64,
        audioMimeType: result.audioMimeType,
      });
      return;
    }

    if (pathname === "/api/profile/generate") {
      const body = await readJson(req);
      const session = await orchestrator.generateProfile(String(body.sessionId || ""));
      sendJson(res, 200, {
        session: publicSession(session),
        profileMarkdown: session.profileMarkdown,
      });
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
    sendClientError(res);
  }
}
