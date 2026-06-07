import { ServerResponse } from "node:http";

export function clientErrorMessage() {
  return "Something went wrong. Please try again.";
}

export function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://localhost:3100",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
  });
  res.end(JSON.stringify(payload));
}

export function sendClientError(res: ServerResponse, status = 500) {
  sendJson(res, status, { error: clientErrorMessage() });
}

export function logServerError(label: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${label}] ${message}`);
}
