import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

function cleanEnvValue(value: string) {
  let cleaned = value.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function loadEnvFile() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [join(currentDir, ".env"), join(currentDir, "..", ".env")];
  const loadedEnv: Record<string, string> = {};

  for (const envPath of candidatePaths) {
    if (!existsSync(envPath)) continue;

    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      const value = cleanEnvValue(trimmed.slice(eqIndex + 1));

      loadedEnv[key] = value;
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    break;
  }

  return loadedEnv;
}

const envFile = loadEnvFile();

function getEnvValue(name: string) {
  return envFile[name] ?? cleanEnvValue(process.env[name] ?? "");
}

const OPENAI_API_KEY = getEnvValue("OPENAI_API_KEY");
const OPENAI_API_BASE = (getEnvValue("OPENAI_API_BASE") || "https://api.openai.com").replace(
  /\/+$/,
  ""
);
const OPENAI_REALTIME_MODEL = getEnvValue("OPENAI_REALTIME_MODEL") || "gpt-realtime-2";
const AI_PROVIDER = getEnvValue("AI_PROVIDER") || "openai";
const PORT = Number(getEnvValue("PORT") || 3000);
const ENDPOINT_SECRET = getEnvValue("REALTIME_TOKEN_ENDPOINT_SECRET");
const REALTIME_TOKEN_RATE_LIMIT_WINDOW_MS = Number(
  getEnvValue("REALTIME_TOKEN_RATE_LIMIT_WINDOW_MS") || 60_000
);
const REALTIME_TOKEN_RATE_LIMIT_MAX = Number(
  getEnvValue("REALTIME_TOKEN_RATE_LIMIT_MAX") || 6
);
const REALTIME_ALLOWED_ORIGINS = (
  getEnvValue("REALTIME_ALLOWED_ORIGINS") ||
  "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
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
const OPENAI_REALTIME_VOICE = getEnvValue("OPENAI_REALTIME_VOICE") || DEFAULT_REALTIME_VOICE;

type RealtimeClientSecretRequest = {
  voice?: unknown;
};

type NormalizedRealtimeSession = {
  provider: string;
  sessionId: string | null;
  token: string;
  model: string;
  endpoint: string;
  voice: string;
  expiresAt: number | string | null;
  transport: "webrtc-sdp";
  discoveryModeId: string;
  credentialIssued: true;
};

type SanitizedUpstreamDiagnostic = {
  upstreamHttpStatus: number | null;
  upstreamErrorType: string | null;
  upstreamErrorCode: string | null;
  upstreamErrorCategory: string;
  responseJsonParsed: boolean;
  expectedClientSecretMissing: boolean | null;
  modelUsed: string;
  modelIsGptRealtime2: boolean;
  endpointUrlLookedCorrect: boolean;
  endpointTarget: string;
  likelyFailureCause: string;
};

type RealtimeProviderAdapter = {
  id: string;
  createClientSecret: (
    request: RealtimeClientSecretRequest
  ) => Promise<NormalizedRealtimeSession>;
};

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function isLocalHost(host: string) {
  const hostname = host.split(":")[0].toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isAllowedOrigin(origin: string | undefined, host: string) {
  if (!origin) {
    return isLocalHost(host);
  }

  if (REALTIME_ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return isLocalHost(host) && isLocalHost(parsed.hostname);
  } catch {
    return false;
  }
}

function getCorsOrigin(origin: string | undefined, host: string) {
  if (origin && isAllowedOrigin(origin, host)) {
    return origin;
  }
  if (!origin && isLocalHost(host)) {
    return `http://${host}`;
  }
  return "";
}

function getClientKey(req: any) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]?.trim()
      : "";
  const remoteIp = req.socket?.remoteAddress || "unknown";
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "no-origin";
  return `${origin}:${forwardedIp || remoteIp}`;
}

function isRateLimited(req: any) {
  const now = Date.now();
  const key = getClientKey(req);
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + REALTIME_TOKEN_RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  current.count += 1;
  if (current.count > REALTIME_TOKEN_RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

function sendJson(
  req: any,
  res: any,
  status: number,
  payload: unknown,
  headers: Record<string, string> = {}
) {
  const host = req.headers.host || "localhost";
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const corsOrigin = getCorsOrigin(origin, host);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    ...(corsOrigin ? { "Access-Control-Allow-Origin": corsOrigin, Vary: "Origin" } : {}),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function getConfigDiagnostics() {
  return {
    ok: Boolean(OPENAI_API_KEY && OPENAI_REALTIME_MODEL),
    route: "/api/realtime/client-secret",
    accepts: ["GET", "POST", "OPTIONS"],
    missing: {
      serverCredential: !OPENAI_API_KEY,
      realtimeModel: !OPENAI_REALTIME_MODEL,
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

function asSafeDiagnosticString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^[A-Za-z0-9_.:-]{1,96}$/.test(trimmed) ? trimmed : "[redacted]";
}

async function parseUpstreamJson(response: Response) {
  try {
    return { parsed: true, body: await response.json() };
  } catch {
    return { parsed: false, body: null };
  }
}

function getOpenAIErrorFields(body: unknown) {
  const error = isRecord(body) && isRecord(body.error) ? body.error : {};
  return {
    type: asSafeDiagnosticString(error.type),
    code: asSafeDiagnosticString(error.code),
  };
}

function getUpstreamErrorCategory(status: number | null, type: string | null, code: string | null) {
  if (code === "insufficient_quota") return "billing_or_quota";
  if (status === 401) return "auth";
  if (status === 403) return "project_or_permission";
  if (status === 404) return "endpoint_or_model";
  if (status === 429) return "rate_limit_or_quota";
  if (status !== null && status >= 500) return "upstream_server";
  if (type === "invalid_request_error" || status === 400) return "request_or_model";
  if (status === null) return "network_or_fetch";
  return "upstream_error";
}

function getLikelyFailureCause(
  status: number | null,
  category: string,
  expectedClientSecretMissing: boolean | null
) {
  if (expectedClientSecretMissing) return "upstream_response_shape_changed_or_missing_client_secret";
  if (category === "network_or_fetch") return "node_fetch_network_failure_or_sandbox_egress";
  if (category === "auth") return "server_api_key_rejected_by_upstream";
  if (category === "project_or_permission") return "project_or_model_permission";
  if (category === "endpoint_or_model") return "endpoint_base_url_or_model_name";
  if (category === "billing_or_quota" || category === "rate_limit_or_quota") return "quota_rate_limit_or_billing";
  if (category === "request_or_model") return "request_payload_or_model";
  if (status !== null && status >= 500) return "upstream_service_failure";
  return "upstream_rejected_request";
}

function createUpstreamDiagnostic(
  status: number | null,
  body: unknown,
  responseJsonParsed: boolean,
  expectedClientSecretMissing: boolean | null,
  endpointTarget: string
): SanitizedUpstreamDiagnostic {
  const { type, code } = getOpenAIErrorFields(body);
  const expectedUrl = "https://api.openai.com/v1/realtime/client_secrets";
  const upstreamErrorCategory = getUpstreamErrorCategory(status, type, code);
  return {
    upstreamHttpStatus: status,
    upstreamErrorType: type,
    upstreamErrorCode: code,
    upstreamErrorCategory,
    responseJsonParsed,
    expectedClientSecretMissing,
    modelUsed: OPENAI_REALTIME_MODEL,
    modelIsGptRealtime2: OPENAI_REALTIME_MODEL === "gpt-realtime-2",
    endpointUrlLookedCorrect: endpointTarget === expectedUrl,
    endpointTarget,
    likelyFailureCause: getLikelyFailureCause(status, upstreamErrorCategory, expectedClientSecretMissing),
  };
}

function logSanitizedUpstreamDiagnostic(diagnostic: SanitizedUpstreamDiagnostic) {
  console.error("[realtime-client-secret] sanitized upstream diagnostic", diagnostic);
}

function createOpenAIRealtimeAdapter(): RealtimeProviderAdapter {
  return {
    id: "openai",
    async createClientSecret(request) {
      if (!OPENAI_API_KEY) {
        throw new ProviderConfigurationError("Realtime discovery is not configured on the server.");
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
      };

      const providerPayload = {
        session: sessionConfig,
      };

      const endpointTarget = `${OPENAI_API_BASE}/v1/realtime/client_secrets`;
      let upstreamStatus: number | null;
      let upstreamJson: { parsed: boolean; body: unknown };
      try {
        const response = await fetch(endpointTarget, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(providerPayload),
        });
        upstreamStatus = response.status;
        upstreamJson = await parseUpstreamJson(response);
      } catch {
        upstreamStatus = null;
        upstreamJson = { parsed: false, body: null };
      }

      if (upstreamStatus === null || upstreamStatus < 200 || upstreamStatus >= 300) {
        const diagnostic = createUpstreamDiagnostic(
          upstreamStatus,
          upstreamJson.body,
          upstreamJson.parsed,
          null,
          endpointTarget
        );
        logSanitizedUpstreamDiagnostic(diagnostic);
        throw new ProviderRequestError(
          upstreamStatus ?? 500,
          "Realtime client secret request failed.",
          { diagnostics: diagnostic }
        );
      }

      if (!upstreamJson.parsed) {
        const diagnostic = createUpstreamDiagnostic(
          upstreamStatus,
          null,
          false,
          null,
          endpointTarget
        );
        logSanitizedUpstreamDiagnostic(diagnostic);
        throw new ProviderRequestError(
          502,
          "Realtime client secret response did not include a usable credential.",
          { diagnostics: diagnostic }
        );
      }

      const data = upstreamJson.body;
      const clientSecret = isRecord(data) && isRecord(data.client_secret) ? data.client_secret : null;
      const token =
        isRecord(data) && typeof data.value === "string"
          ? data.value
          : clientSecret && typeof clientSecret.value === "string"
            ? clientSecret.value
            : "";
      if (!token) {
        const diagnostic = createUpstreamDiagnostic(
          upstreamStatus,
          data,
          true,
          !clientSecret || typeof clientSecret.value !== "string",
          endpointTarget
        );
        logSanitizedUpstreamDiagnostic(diagnostic);
        throw new ProviderRequestError(
          502,
          "Realtime client secret response did not include a usable credential.",
          { diagnostics: diagnostic }
        );
      }

      const session = isRecord(data) && isRecord(data.session) ? data.session : {};
      const returnedModel = typeof session.model === "string" ? session.model : OPENAI_REALTIME_MODEL;
      return {
        provider: this.id,
        sessionId: typeof session.id === "string" ? session.id : null,
        token,
        model: returnedModel,
        endpoint: `${OPENAI_API_BASE}/v1/realtime/calls`,
        voice: realtimeVoice.voice,
        expiresAt:
          isRecord(data) && (typeof data.expires_at === "number" || typeof data.expires_at === "string")
            ? data.expires_at
            : clientSecret &&
                (typeof clientSecret.expires_at === "number" || typeof clientSecret.expires_at === "string")
              ? clientSecret.expires_at
              : null,
        transport: "webrtc-sdp",
        discoveryModeId: REALTIME_DISCOVERY_MODE_ID,
        credentialIssued: true,
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

function redactSensitiveValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveValue);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        isSensitiveFieldName(key)
          ? "[redacted]"
          : redactSensitiveValue(entry),
      ])
    );
  }

  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
      .replace(/sk-[A-Za-z0-9_-]+/g, "sk-[redacted]");
  }

  return value;
}

function isSensitiveFieldName(key: string) {
  const normalized = key.toLowerCase().replace(/[-_\s]/g, "");
  return [
    "authorization",
    "apikey",
    "bearer",
    "clientsecret",
    "credential",
    "key",
    "secret",
    "token",
  ].includes(normalized);
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
    if (!isAllowedOrigin(typeof req.headers.origin === "string" ? req.headers.origin : undefined, host)) {
      sendJson(req, res, 403, { error: "Realtime session requests are not allowed from this origin." });
      return;
    }
    sendJson(req, res, 204, {});
    return;
  }

  const isDiagnosticsEndpoint = url.pathname === "/api/realtime/diagnostics";
  const isTokenEndpoint =
    url.pathname === "/api/realtime/client-secret" || url.pathname === "/api/realtime-token";
  if (!isDiagnosticsEndpoint && !isTokenEndpoint) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }

  if (!isAllowedOrigin(typeof req.headers.origin === "string" ? req.headers.origin : undefined, host)) {
    sendJson(req, res, 403, { error: "Realtime session requests are not allowed from this origin." });
    return;
  }

  if (isDiagnosticsEndpoint) {
    if (req.method !== "GET") {
      sendJson(req, res, 405, { error: "Method not allowed. Use GET for realtime diagnostics." });
      return;
    }

    sendJson(req, res, 200, getConfigDiagnostics());
    return;
  }

  if (req.method === "GET") {
    sendJson(req, res, 200, getConfigDiagnostics());
    return;
  }

  if (req.method !== "POST") {
    sendJson(req, res, 405, {
      error: "Method not allowed. Use POST to create a realtime client secret.",
      diagnostics: getConfigDiagnostics(),
    });
    return;
  }

  if (ENDPOINT_SECRET) {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== ENDPOINT_SECRET) {
      sendJson(req, res, 401, { error: "Unauthorized" });
      return;
    }
  }

  if (isRateLimited(req)) {
    sendJson(req, res, 429, {
      error: "Realtime session requests are temporarily limited. Please wait a moment and try again.",
    });
    return;
  }

  try {
    const rawBody = await readBody(req);
    let body: unknown;
    try {
      body = JSON.parse(rawBody || "{}");
    } catch {
      sendJson(req, res, 400, { error: "Malformed request: expected a JSON object body." });
      return;
    }

    if (!isRecord(body)) {
      sendJson(req, res, 400, { error: "Malformed request: expected a JSON object body." });
      return;
    }

    const adapter = getRealtimeProviderAdapter();
    const normalizedSession = await adapter.createClientSecret({ voice: body.voice });
    sendJson(req, res, 200, normalizedSession);
  } catch (error) {
    if (error instanceof ProviderConfigurationError) {
      sendJson(req, res, error.status, {
        error: error.message,
        diagnostics: getConfigDiagnostics(),
      });
      return;
    }

    if (error instanceof ProviderRequestError) {
      sendJson(req, res, error.status, {
        error: error.message,
        ...(redactSensitiveValue(error.metadata ?? {}) as Record<string, unknown>),
      });
      return;
    }

    sendJson(req, res, 500, {
      error: "Realtime client secret request failed.",
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `Realtime client-secret endpoint listening on http://localhost:${PORT}/api/realtime/client-secret`
  );
});
