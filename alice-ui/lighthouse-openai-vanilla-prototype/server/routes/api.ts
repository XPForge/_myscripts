import type { IncomingMessage, ServerResponse } from "node:http";
import { addTurn, createSession, getSession, saveSession } from "../storage/sessionStore.js";
import { createRealtimeClientSecret, generateProfile, nextAssistant, speak, transcribe } from "../providers/openai.js";

export function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function readBuffer(req: IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req: IncomingMessage) {
  const buffer = await readBuffer(req);
  return buffer.length ? JSON.parse(buffer.toString("utf8")) : {};
}

function metadataFrom(body: any) {
  return {
    name: typeof body.name === "string" ? body.name.trim() : undefined,
    email: typeof body.email === "string" ? body.email.trim() : undefined,
  };
}

function requireSession(id: string) {
  const session = getSession(id);
  if (!session) throw new Error("Session not found.");
  return session;
}

async function assistantFor(session: ReturnType<typeof requireSession>) {
  const text = await nextAssistant(session.turns);
  addTurn(session, "assistant", text);
  const latest = requireSession(session.id);
  const audio = await speak(text);
  return { session: latest, audio };
}

export async function handleApi(pathname: string, searchParams: URLSearchParams, req: IncomingMessage, res: ServerResponse) {
  try {
    if (pathname === "/api/sessions") {
      const body = await readJson(req);
      const session = createSession(metadataFrom(body));
      const result = await assistantFor(session);
      sendJson(res, 200, {
        session: result.session,
        audioBase64: result.audio.audio.toString("base64"),
        audioMimeType: result.audio.mimeType,
      });
      return;
    }

    if (pathname === "/api/realtime/session") {
      const body = await readJson(req);
      const session = createSession(metadataFrom(body));
      const realtime = await createRealtimeClientSecret();
      sendJson(res, 200, { session, realtime });
      return;
    }

    if (pathname === "/api/realtime/turn") {
      const body = await readJson(req);
      const session = requireSession(String(body.sessionId || ""));
      const role = body.role === "assistant" ? "assistant" : "user";
      const text = String(body.text || "").trim();
      if (text) addTurn(session, role, text);
      sendJson(res, 200, { session: requireSession(session.id) });
      return;
    }

    if (pathname === "/api/conversation/text") {
      const body = await readJson(req);
      const session = requireSession(String(body.sessionId || ""));
      addTurn(session, "user", String(body.text || ""));
      const result = await assistantFor(requireSession(session.id));
      sendJson(res, 200, {
        session: result.session,
        participantText: body.text,
        audioBase64: result.audio.audio.toString("base64"),
        audioMimeType: result.audio.mimeType,
      });
      return;
    }

    if (pathname === "/api/conversation/audio") {
      const sessionId = searchParams.get("sessionId") || "";
      const contentType = req.headers["content-type"];
      const mimeType = Array.isArray(contentType) ? contentType[0] : contentType || "audio/webm";
      const session = requireSession(sessionId);
      const participantText = await transcribe(await readBuffer(req), mimeType);
      addTurn(session, "user", participantText);
      const result = await assistantFor(requireSession(session.id));
      sendJson(res, 200, {
        session: result.session,
        participantText,
        audioBase64: result.audio.audio.toString("base64"),
        audioMimeType: result.audio.mimeType,
      });
      return;
    }

    if (pathname === "/api/profile/generate") {
      const body = await readJson(req);
      const session = requireSession(String(body.sessionId || ""));
      session.profileMarkdown = await generateProfile(session.turns);
      if (session.email) {
        session.profileEmailStatus = "not_configured";
        session.profileEmailPreparedAt = new Date().toISOString();
        session.profileEmailMessage = `Profile prepared for ${session.email}. Automatic email delivery is not connected in this prototype yet.`;
      }
      saveSession(session);
      sendJson(res, 200, { session, profileMarkdown: session.profileMarkdown });
      return;
    }

    if (pathname === "/api/sessions/get") {
      const body = await readJson(req);
      sendJson(res, 200, { session: requireSession(String(body.sessionId || "")) });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    sendJson(res, 500, { error: "Something went wrong. Please try again." });
  }
}
