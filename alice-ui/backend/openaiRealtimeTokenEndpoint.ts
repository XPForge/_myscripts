import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

function loadEnvFile() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [join(currentDir, ".env"), join(currentDir, "..", ".env")];

  for (const envPath of candidatePaths) {
    if (!existsSync(envPath)) continue;

    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    break;
  }
}

loadEnvFile();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com";
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "";
const AI_PROVIDER = process.env.AI_PROVIDER || "openai";
const PORT = Number(process.env.PORT || 3000);
const ENDPOINT_SECRET = process.env.REALTIME_TOKEN_ENDPOINT_SECRET || "";
const DEFAULT_REALTIME_VOICE = "marin";
const REALTIME_DISCOVERY_MODE_ID = "native-discovery-realtime2-v0.1";
const REALTIME_DISCOVERY_INSTRUCTIONS =
  "You are participating in a Lighthouse native discovery session. Converse naturally with the participant. Ask one clear question at a time. When useful, briefly reflect the meaning or pattern you understood before asking the next question. Do not recommend jobs, roles, career paths, rankings, matching, fit judgments, or final profiles during discovery unless the participant explicitly asks for that output or reaches an explicit checkpoint. If the participant redirects the session, follow their direction.";
const SUPPORTED_REALTIME_VOICES = [
  "marin",
  "cedar",
  "ballad",
  "verse",
  "nova",
  "coral",
] as const;
const SUPPORTED_REALTIME_VOICE_SET = new Set<string>(SUPPORTED_REALTIME_VOICES);
const OPENAI_REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE || DEFAULT_REALTIME_VOICE;

type RealtimeClientSecretRequest = {
  voice?: unknown;
};

type NormalizedRealtimeSession = {
  provider: string;
  sessionId: string | null;
  clientSecret: string;
  token: string;
  model: string;
  endpoint: string;
  voice: string;
  expiresAt: number | string | null;
  transport: "webrtc-sdp";
  discoveryModeId: string;
};

type RealtimeProviderAdapter = {
  id: string;
  createClientSecret: (
    request: RealtimeClientSecretRequest
  ) => Promise<NormalizedRealtimeSession>;
};

function sendJson(res: any, status: number, payload: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

function getConfigDiagnostics() {
  return {
    ok: Boolean(OPENAI_API_KEY && OPENAI_REALTIME_MODEL),
    route: "/api/realtime/client-secret",
    accepts: ["GET", "POST", "OPTIONS"],
    missing: {
      OPENAI_API_KEY: !OPENAI_API_KEY,
      OPENAI_REALTIME_MODEL: !OPENAI_REALTIME_MODEL,
    },
    provider: AI_PROVIDER,
    modelConfigured: Boolean(OPENAI_REALTIME_MODEL),
    voiceConfigured: Boolean(OPENAI_REALTIME_VOICE),
    defaultVoice: DEFAULT_REALTIME_VOICE,
    supportedVoices: SUPPORTED_REALTIME_VOICES,
    discoveryModeId: REALTIME_DISCOVERY_MODE_ID,
  };
}

async function readBody(req: any) {
  return new Promise<string>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function resolveRealtimeVoice(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : OPENAI_REALTIME_VOICE;
  if (SUPPORTED_REALTIME_VOICE_SET.has(normalized)) {
    return { ok: true as const, voice: normalized };
  }
  return {
    ok: false as const,
    error: `Unsupported realtime voice "${String(value)}".`,
    supportedVoices: SUPPORTED_REALTIME_VOICES,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createOpenAIRealtimeAdapter(): RealtimeProviderAdapter {
  return {
    id: "openai",
    async createClientSecret(request) {
      if (!OPENAI_API_KEY) {
        throw new ProviderConfigurationError("Missing server configuration: OPENAI_API_KEY is required.");
      }

      if (!OPENAI_REALTIME_MODEL) {
        throw new ProviderConfigurationError("Missing server configuration: OPENAI_REALTIME_MODEL is required.");
      }

      const realtimeVoice = resolveRealtimeVoice(request.voice);
      if (!realtimeVoice.ok) {
        throw new ProviderRequestError(
          400,
          realtimeVoice.error,
          { supportedVoices: realtimeVoice.supportedVoices }
        );
      }

      const sessionConfig: Record<string, unknown> = {
        type: "realtime",
        model: OPENAI_REALTIME_MODEL,
        instructions: REALTIME_DISCOVERY_INSTRUCTIONS,
        output_modalities: ["audio"],
        audio: {
          output: {
            voice: realtimeVoice.voice,
          },
        },
      };

      const providerPayload = {
        expires_after: {
          anchor: "created_at",
          seconds: 600,
        },
        session: sessionConfig,
      };

      const response = await fetch(`${OPENAI_API_BASE}/v1/realtime/client_secrets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(providerPayload),
      });

      if (!response.ok) {
        throw new ProviderRequestError(
          response.status,
          "Realtime client secret request failed.",
          { providerStatus: response.status }
        );
      }

      const data = await response.json();
      const token = data?.value;
      if (!token) {
        throw new ProviderRequestError(
          502,
          "Realtime client secret response did not include a usable credential."
        );
      }

      const returnedModel = data?.session?.model || OPENAI_REALTIME_MODEL;
      return {
        provider: this.id,
        sessionId: data?.session?.id || null,
        clientSecret: token,
        token,
        model: returnedModel,
        endpoint: `${OPENAI_API_BASE}/v1/realtime/calls`,
        voice: realtimeVoice.voice,
        expiresAt: data?.expires_at || null,
        transport: "webrtc-sdp",
        discoveryModeId: REALTIME_DISCOVERY_MODE_ID,
      };
    },
  };
}

class ProviderConfigurationError extends Error {
  status = 503;
}

class ProviderRequestError extends Error {
  status: number;
  metadata?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    metadata?: Record<string, unknown>
  ) {
    super(message);
    this.status = status;
    this.metadata = metadata;
  }
}

function getRealtimeProviderAdapter(): RealtimeProviderAdapter {
  if (AI_PROVIDER === "openai") {
    return createOpenAIRealtimeAdapter();
  }

  throw new ProviderConfigurationError(`Unsupported AI_PROVIDER "${AI_PROVIDER}".`);
}

const server = createServer(async (req, res) => {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `http://${host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const isRealtimeEndpoint =
    url.pathname === "/api/realtime/client-secret" || url.pathname === "/api/realtime-token";
  if (!isRealtimeEndpoint) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, getConfigDiagnostics());
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, {
      error: "Method not allowed. Use POST to create a realtime client secret.",
      diagnostics: getConfigDiagnostics(),
    });
    return;
  }

  if (ENDPOINT_SECRET) {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== ENDPOINT_SECRET) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
  }

  try {
    const rawBody = await readBody(req);
    let body: unknown;
    try {
      body = JSON.parse(rawBody || "{}");
    } catch {
      sendJson(res, 400, { error: "Malformed request: expected a JSON object body." });
      return;
    }

    if (!isRecord(body)) {
      sendJson(res, 400, { error: "Malformed request: expected a JSON object body." });
      return;
    }

    const adapter = getRealtimeProviderAdapter();
    const normalizedSession = await adapter.createClientSecret({ voice: body.voice });
    sendJson(res, 200, normalizedSession);
  } catch (error) {
    if (error instanceof ProviderConfigurationError) {
      sendJson(res, error.status, {
        error: error.message,
        diagnostics: getConfigDiagnostics(),
      });
      return;
    }

    if (error instanceof ProviderRequestError) {
      sendJson(res, error.status, {
        error: error.message,
        ...(error.metadata ?? {}),
      });
      return;
    }

    sendJson(res, 500, {
      error: "Realtime client secret request failed.",
      detail: error instanceof Error ? error.message : "Unexpected failure",
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `Realtime client-secret endpoint listening on http://localhost:${PORT}/api/realtime/client-secret`
  );
});
