import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { SessionOrchestrator } from "./orchestrator/sessionOrchestrator.js";
import { createAnthropicDiscoveryProvider } from "./providers/anthropic/discovery.js";
import { createAnthropicSynthesisProvider } from "./providers/anthropic/synthesis.js";
import { createMockDiscoveryProvider } from "./providers/mock/discovery.js";
import { createMockSynthesisProvider } from "./providers/mock/synthesis.js";
import { handleApi } from "./routes/api.js";
import { sendJson } from "./security/sanitizeError.js";

const serverDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = existsSync(join(serverDir, "..", "..", "index.html"))
  ? join(serverDir, "..", "..")
  : join(serverDir, "..");

const orchestrator = new SessionOrchestrator(
  env.mockProvider ? createMockDiscoveryProvider() : createAnthropicDiscoveryProvider(),
  env.mockProvider ? createMockSynthesisProvider() : createAnthropicSynthesisProvider()
);

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function staticPath(pathname: string) {
  if (pathname === "/") return join(projectRoot, "index.html");
  const direct = join(projectRoot, pathname);
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  if (!extname(pathname)) return join(projectRoot, "index.html");
  return direct;
}

function serveStatic(pathname: string, res: any) {
  const path = staticPath(pathname);
  if (!path.startsWith(projectRoot) || !existsSync(path) || !statSync(path).isFile()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  res.writeHead(200, { "Content-Type": mimeTypes[extname(path)] || "application/octet-stream" });
  res.end(readFileSync(path));
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
    await handleApi(url.pathname, req, res, orchestrator);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  serveStatic(url.pathname, res);
});

server.listen(env.port, () => {
  const mode = env.mockProvider ? "mock" : "anthropic";
  console.log(`Lighthouse Claude prototype listening on http://localhost:${env.port} (${mode} mode)`);
});
