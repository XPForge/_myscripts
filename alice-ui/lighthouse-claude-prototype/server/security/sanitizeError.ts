import type { ServerResponse } from "node:http";

export function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://localhost:3200",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

export function sendSafeError(res: ServerResponse, status = 500) {
  sendJson(res, status, { error: "Something went wrong. Please try again." });
}

export function logServerError(label: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${label}] ${message}`);
}
