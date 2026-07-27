import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DISCOVERY_FIELD_KEYS } from "../src/services/lighthouseProfile.ts";
import { DISCOVERY_FIELD_LABELS } from "../src/services/discoverySchemaTracker.ts";

function loadEnvFile() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [join(currentDir, ".env"), join(currentDir, "..", ".env")];

  for (const envPath of candidatePaths) {
    if (!existsSync(envPath)) continue;

    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

  }
}

loadEnvFile();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim();
// Profile authoring is deliberately decoupled from OPENAI_REALTIME_MODEL (the
// live voice model, which may be a cheaper mini variant). It always defaults
// to the flagship text model unless explicitly overridden.
const PROFILE_AUTHORING_MODEL = process.env.PROFILE_AUTHORING_MODEL?.trim() || OPENAI_MODEL;
const OPENAI_API_BASE = (process.env.OPENAI_API_BASE?.trim() || "https://api.openai.com").replace(
  /\/+$/,
  "",
);
const MODEL_API_PORT = Number(process.env.MODEL_API_PORT || 3001);

if (!Number.isInteger(MODEL_API_PORT) || MODEL_API_PORT < 1 || MODEL_API_PORT > 65535) {
  throw new Error("MODEL_API_PORT must be a valid port number.");
}

function getResponsesUrl() {
  try {
    const baseUrl = new URL(OPENAI_API_BASE);
    if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") return null;

    const basePath = baseUrl.pathname.replace(/\/+$/, "").replace(/\/v1$/, "");
    baseUrl.pathname = `${basePath}/v1/responses`;
    return baseUrl.toString();
  } catch {
    return null;
  }
}

function logDiagnostic(label: string, detail?: string | number) {
  const suffix = detail === undefined ? "" : ` ${detail}`;
  console.error(`[model-api] ${label}${suffix}`);
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function getAnswer(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: unknown; text?: unknown }> }>;
  };

  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  const text = response.output
    ?.flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text as string)
    .join("");

  return text?.trim() ? text : null;
}

function extractFirstJsonObject(text: string): unknown {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildProfileAuthoringInstructions() {
  const fieldList = DISCOVERY_FIELD_KEYS.map(
    (key) => `- "${key}": ${DISCOVERY_FIELD_LABELS[key]}`
  ).join("\n");

  return [
    "You are authoring a Lighthouse Discovery profile from a completed discovery conversation transcript.",
    "This is Discovery, not evaluation: do not score, rank, diagnose, or produce fit/match/percentage judgments.",
    "Base every statement only on what the transcript actually supports. If something was not discussed, say so plainly rather than inventing it.",
    "Return ONLY a single JSON object (no prose outside it) with exactly these keys:",
    fieldList,
    '- "discoverySummary": a short narrative summary of the whole conversation',
    '- "generatedProfile": a polished, complete, well-formatted long-form profile document combining all of the above into readable prose with headings',
    "Every value must be a string. If the transcript does not support a field, use a short honest note such as \"Not enough was discussed to describe this yet.\" instead of inventing content.",
  ].join("\n");
}

const PROFILES_DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "data", "profiles");

function sanitizeEmailForFilename(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9.@_-]/g, "_");
}

function saveAuthoredProfileToDisk(
  email: string,
  participantName: string,
  model: string,
  profile: unknown
): void {
  try {
    mkdirSync(PROFILES_DATA_DIR, { recursive: true });
    const filePath = join(PROFILES_DATA_DIR, `${sanitizeEmailForFilename(email)}.json`);
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          email,
          participantName,
          model,
          profile,
          authoredAt: new Date().toISOString(),
          participantAuthority: {
            consentGiven: true,
            consentPurpose: "development purposes only",
            note: "Participant explicitly allowed Lighthouse to keep this copy for development. Remove once that work is done.",
          },
        },
        null,
        2
      ),
      "utf8"
    );
  } catch (error) {
    logDiagnostic("profile_save_failed", error instanceof Error ? error.message : String(error));
  }
}

async function authorProfile(req: IncomingMessage, res: ServerResponse) {
  let transcript: string;
  let participantName: string;
  let participantEmail: string;
  let retainForDevelopment: boolean;
  try {
    const body = JSON.parse((await readBody(req)) || "{}");
    if (typeof body?.transcript !== "string" || !body.transcript.trim()) {
      sendJson(res, 400, { error: "Invalid request: transcript is required" });
      return;
    }
    transcript = body.transcript;
    participantName = typeof body?.participantName === "string" ? body.participantName : "the participant";
    participantEmail = typeof body?.participantEmail === "string" ? body.participantEmail.trim() : "";
    // Participant authority: never persist a copy without explicit, informed consent.
    retainForDevelopment = body?.retainForDevelopment === true;
  } catch {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  const responsesUrl = getResponsesUrl();
  if (!OPENAI_API_KEY || !PROFILE_AUTHORING_MODEL || !responsesUrl) {
    logDiagnostic("configuration_error", "profile_authoring_not_configured");
    sendJson(res, 500, { error: "Profile authoring is not configured" });
    return;
  }

  try {
    const response = await fetch(responsesUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PROFILE_AUTHORING_MODEL,
        instructions: buildProfileAuthoringInstructions(),
        input: `Participant: ${participantName}\n\nTranscript:\n${transcript}`,
      }),
    });

    if (!response.ok) {
      logDiagnostic("provider_http_error", response.status);
      sendJson(res, 500, { error: "Profile authoring request failed" });
      return;
    }

    const payload = await response.json().catch(() => null);
    const answer = getAnswer(payload);
    if (!answer) {
      logDiagnostic("provider_response_missing_answer");
      sendJson(res, 500, { error: "Profile authoring request failed" });
      return;
    }

    const parsed = extractFirstJsonObject(answer);
    if (!parsed || typeof parsed !== "object") {
      logDiagnostic("profile_authoring_invalid_json");
      sendJson(res, 500, { error: "Profile authoring returned an unreadable response" });
      return;
    }

    if (participantEmail && retainForDevelopment) {
      saveAuthoredProfileToDisk(participantEmail, participantName, PROFILE_AUTHORING_MODEL, parsed);
    }

    sendJson(res, 200, { model: PROFILE_AUTHORING_MODEL, profile: parsed });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    logDiagnostic("provider_fetch_error", errorName);
    sendJson(res, 500, { error: "Profile authoring request failed" });
  }
}

const server = createServer(async (req, res) => {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `http://${host}`);

  if (req.method === "OPTIONS" && (url.pathname === "/api/model-response" || url.pathname === "/api/profile/author")) {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/profile/author") {
    await authorProfile(req, res);
    return;
  }

  if (req.method !== "POST" || url.pathname !== "/api/model-response") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  let question: string;
  try {
    const body = JSON.parse((await readBody(req)) || "{}");
    if (typeof body?.question !== "string" || !body.question.trim()) {
      sendJson(res, 400, { error: "Invalid request" });
      return;
    }
    question = body.question;
  } catch {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  const responsesUrl = getResponsesUrl();
  if (!OPENAI_API_KEY) {
    logDiagnostic("configuration_error", "missing_OPENAI_API_KEY");
    sendJson(res, 500, { error: "Model request failed" });
    return;
  }
  if (!OPENAI_MODEL) {
    logDiagnostic("configuration_error", "missing_OPENAI_MODEL");
    sendJson(res, 500, { error: "Model request failed" });
    return;
  }
  if (!responsesUrl) {
    logDiagnostic("configuration_error", "invalid_OPENAI_API_BASE");
    sendJson(res, 500, { error: "Model request failed" });
    return;
  }

  try {
    const response = await fetch(responsesUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: question,
      }),
    });

    if (!response.ok) {
      logDiagnostic("provider_http_error", response.status);
      sendJson(res, 500, { error: "Model request failed" });
      return;
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      logDiagnostic("provider_response_invalid_json");
      sendJson(res, 500, { error: "Model request failed" });
      return;
    }

    const answer = getAnswer(payload);
    if (!answer) {
      logDiagnostic("provider_response_missing_answer");
      sendJson(res, 500, { error: "Model request failed" });
      return;
    }

    sendJson(res, 200, { answer });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    logDiagnostic("provider_fetch_error", errorName);
    sendJson(res, 500, { error: "Model request failed" });
  }
});

server.listen(MODEL_API_PORT, () => {
  console.log(
    `Model response endpoint listening on http://localhost:${MODEL_API_PORT}/api/model-response`,
  );
  if (!OPENAI_API_KEY) logDiagnostic("configuration_error", "missing_OPENAI_API_KEY");
  if (!OPENAI_MODEL) logDiagnostic("configuration_error", "missing_OPENAI_MODEL");
  if (!getResponsesUrl()) logDiagnostic("configuration_error", "invalid_OPENAI_API_BASE");
});
