import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { handleApi, sendJson } from "./routes/api.js";

const serverDir = dirname(fileURLToPath(import.meta.url));
const root = existsSync(join(serverDir, "..", "..", "index.html")) ? join(serverDir, "..", "..") : join(serverDir, "..");
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function serve(pathname: string, res: any) {
  const normalized = pathname.replace(/\\/g, "/");
  const allowed =
    normalized === "/" ||
    normalized === "/index.html" ||
    (normalized.startsWith("/src/") && [".js", ".css"].includes(extname(normalized)));
  if (!allowed) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  const path = normalized === "/" || !extname(normalized) ? join(root, "index.html") : join(root, normalized);
  if (!path.startsWith(root) || !existsSync(path) || !statSync(path).isFile()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  res.writeHead(200, { "Content-Type": mime[extname(path)] || "application/octet-stream" });
  res.end(readFileSync(path));
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `localhost:${env.port}`}`);
  if (url.pathname.startsWith("/api/")) {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    await handleApi(url.pathname, url.searchParams, req, res);
    return;
  }
  serve(url.pathname, res);
}).listen(env.port, () => {
  console.log(`Lighthouse OpenAI vanilla prototype listening on http://localhost:${env.port}`);
});
