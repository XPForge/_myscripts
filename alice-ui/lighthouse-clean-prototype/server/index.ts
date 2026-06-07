import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { SessionOrchestrator } from "./orchestrator/sessionOrchestrator.js";
import { createOpenAiDiscoveryProvider } from "./providers/openai/discovery.js";
import { createOpenAiSpeechToTextProvider } from "./providers/openai/speechToText.js";
import { createOpenAiSynthesisProvider } from "./providers/openai/synthesis.js";
import { createOpenAiTextToSpeechProvider } from "./providers/openai/textToSpeech.js";
import { handleApi } from "./routes/api.js";
import { sendJson } from "./security/sanitizeError.js";

const serverDir = dirname(fileURLToPath(import.meta.url));
const publicCandidates = [join(serverDir, "..", "public"), join(serverDir, "..", "..", "public")];
const publicDir = publicCandidates.find((candidate) => existsSync(candidate)) || publicCandidates[0];

const orchestrator = new SessionOrchestrator({
  discovery: createOpenAiDiscoveryProvider(),
  synthesis: createOpenAiSynthesisProvider(),
  speechToText: createOpenAiSpeechToTextProvider(),
  textToSpeech: createOpenAiTextToSpeechProvider(),
});

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function serveStatic(pathname: string, res: any) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
  res.end(readFileSync(filePath));
}

const server = createServer(async (req, res) => {
  const host = req.headers.host || `localhost:${env.port}`;
  const url = new URL(req.url || "/", `http://${host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    await handleApi(url.pathname, url.searchParams, req, res, orchestrator);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  serveStatic(url.pathname, res);
});

server.listen(env.port, () => {
  console.log(`Project Lighthouse clean prototype listening on http://localhost:${env.port}`);
});
