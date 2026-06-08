import type { IncomingMessage, ServerResponse } from "node:http";
import { addTurn, createSession, getSession, saveSession } from "../storage/sessionStore.js";
import { createRealtimeClientSecret, generateProfile, nextAssistant, speak, transcribe } from "../providers/openai.js";
import { isPromptExtractionAttempt, promptExtractionFallback, sanitizeAssistantText, sanitizeProfileMarkdown } from "../security/filters.js";
import { safeLog, safeWarn } from "../security/logger.js";
import type { Session } from "../storage/sessionStore.js";

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
    name: typeof body.name === "string" ? body.name.trim().slice(0, 120) : undefined,
    email: typeof body.email === "string" ? body.email.trim().slice(0, 254) : undefined,
  };
}

function requireSession(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Session not found.");
  const session = getSession(id);
  if (!session) throw new Error("Session not found.");
  return session;
}

function requireAuthorizedSession(id: string, accessToken: string) {
  const session = requireSession(id);
  if (!accessToken || session.accessToken !== accessToken) throw new Error("Session not found.");
  return session;
}

function publicSession(session: Session) {
  const { accessToken: _accessToken, ...safeSession } = session;
  return safeSession;
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
      safeLog("session_created");
      const result = await assistantFor(session);
      sendJson(res, 200, {
        session: publicSession(result.session),
        accessToken: session.accessToken,
        audioBase64: result.audio.audio.toString("base64"),
        audioMimeType: result.audio.mimeType,
      });
      return;
    }

    if (pathname === "/api/realtime/session") {
      const body = await readJson(req);
      const session = createSession(metadataFrom(body));
      safeLog("session_created", { mode: "realtime" });
      const realtime = await createRealtimeClientSecret({ name: session.name });
      sendJson(res, 200, { session: publicSession(session), accessToken: session.accessToken, realtime });
      return;
    }

    if (pathname === "/api/realtime/turn") {
      const body = await readJson(req);
      const session = requireAuthorizedSession(String(body.sessionId || ""), String(body.accessToken || ""));
      const role = body.role === "assistant" ? "assistant" : "user";
      const text = String(body.text || "").trim();
      if (text) {
        if (role === "user" && isPromptExtractionAttempt(text)) {
          safeWarn("prompt_extraction_attempt_detected", { route: "realtime" });
          addTurn(session, "user", text);
          addTurn(session, "assistant", promptExtractionFallback);
        } else {
          const storedText = role === "assistant" ? sanitizeAssistantText(text).text : text;
          addTurn(session, role, storedText);
        }
      }
      sendJson(res, 200, { session: publicSession(requireSession(session.id)) });
      return;
    }

    if (pathname === "/api/conversation/text") {
      const body = await readJson(req);
      const session = requireAuthorizedSession(String(body.sessionId || ""), String(body.accessToken || ""));
      const userText = String(body.text || "");
      addTurn(session, "user", userText);
      if (isPromptExtractionAttempt(userText)) {
        safeWarn("prompt_extraction_attempt_detected", { route: "text" });
        addTurn(session, "assistant", promptExtractionFallback);
        sendJson(res, 200, {
          session: publicSession(requireSession(session.id)),
          participantText: body.text,
          audioBase64: "",
          audioMimeType: "",
        });
        return;
      }
      const result = await assistantFor(requireSession(session.id));
      sendJson(res, 200, {
        session: publicSession(result.session),
        participantText: body.text,
        audioBase64: result.audio.audio.toString("base64"),
        audioMimeType: result.audio.mimeType,
      });
      return;
    }

    if (pathname === "/api/conversation/audio") {
      const sessionId = searchParams.get("sessionId") || "";
      const accessToken = searchParams.get("accessToken") || "";
      const contentType = req.headers["content-type"];
      const mimeType = Array.isArray(contentType) ? contentType[0] : contentType || "audio/webm";
      const session = requireAuthorizedSession(sessionId, accessToken);
      safeLog("audio_received");
      const participantText = await transcribe(await readBuffer(req), mimeType);
      safeLog("transcription_completed");
      addTurn(session, "user", participantText);
      if (isPromptExtractionAttempt(participantText)) {
        safeWarn("prompt_extraction_attempt_detected", { route: "audio" });
        addTurn(session, "assistant", promptExtractionFallback);
        const audio = await speak(promptExtractionFallback);
        sendJson(res, 200, {
          session: publicSession(requireSession(session.id)),
          participantText,
          audioBase64: audio.audio.toString("base64"),
          audioMimeType: audio.mimeType,
        });
        return;
      }
      const result = await assistantFor(requireSession(session.id));
      sendJson(res, 200, {
        session: publicSession(result.session),
        participantText,
        audioBase64: result.audio.audio.toString("base64"),
        audioMimeType: result.audio.mimeType,
      });
      return;
    }

    if (pathname === "/api/profile/generate") {
      const body = await readJson(req);
      const session = requireAuthorizedSession(String(body.sessionId || ""), String(body.accessToken || ""));
      session.profileMarkdown = sanitizeProfileMarkdown(await generateProfile(session.turns));
      if (session.email) {
        session.profileEmailStatus = "not_configured";
        session.profileEmailPreparedAt = new Date().toISOString();
        session.profileEmailMessage = `Profile prepared for ${session.email}. Automatic email delivery is not connected in this prototype yet.`;
      }
      saveSession(session);
      safeLog("profile_generated");
      sendJson(res, 200, { session: publicSession(session), profileMarkdown: session.profileMarkdown });
      return;
    }

    if (pathname === "/api/sessions/get") {
      const body = await readJson(req);
      sendJson(res, 200, { session: publicSession(requireAuthorizedSession(String(body.sessionId || ""), String(body.accessToken || ""))) });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    safeWarn("request_failed", { route: pathname });
    sendJson(res, 500, { error: "Something went wrong. Please try again." });
  }
}
