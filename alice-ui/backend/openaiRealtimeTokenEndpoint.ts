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
const PORT = Number(process.env.PORT || 3000);
const ENDPOINT_SECRET = process.env.REALTIME_TOKEN_ENDPOINT_SECRET || "";

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required.");
}

function sendJson(res: any, status: number, payload: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, OpenAI-Beta",
  });
  res.end(JSON.stringify(payload));
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

const server = createServer(async (req, res) => {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `http://${host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== "POST" || url.pathname !== "/api/realtime-token") {
    sendJson(res, 404, { error: "Not found" });
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
    const body = JSON.parse(rawBody || "{}");

    const model = body.model || "gpt-realtime";
    const systemPrompt = body.systemPrompt;
    const profileMetadata = body.profileMetadata || {};
    const discoveryPrinciplesVersion = body.discoveryPrinciplesVersion;

    const openAiPayload = {
      expires_after: {
        anchor: "created_at",
        seconds: 600,
      },
      session: {
        type: "realtime",
        model,
        instructions: systemPrompt,
        audio: {
          output: {
            voice: "alloy",
            format: {
              type: "audio/pcm",
              rate: 24000,
            },
          },
        },
      },
    };

    const response = await fetch(`${OPENAI_API_BASE}/v1/realtime/client_secrets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify(openAiPayload),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      sendJson(res, response.status, { error: bodyText });
      return;
    }

    const data = await response.json();
    const token = data?.value;
    if (!token) {
      sendJson(res, 500, { error: "Realtime client secret response did not include value." });
      return;
    }

    const returnedModel = data?.session?.model || model;
    sendJson(res, 200, {
      sessionId: data?.session?.id || null,
      token,
      model: returnedModel,
      endpoint: `${OPENAI_API_BASE}/v1/realtime?model=${encodeURIComponent(returnedModel)}`,
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unexpected failure",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Realtime token endpoint listening on http://localhost:${PORT}/api/realtime-token`);
});
