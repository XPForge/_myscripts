import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ConversationTurn, DiscoveryContext } from "../providers/types.js";

export type LighthouseSession = {
  id: string;
  context: DiscoveryContext;
  createdAt: string;
  updatedAt: string;
  turns: ConversationTurn[];
  profileMarkdown?: string;
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "sessions");

function ensureStore() {
  mkdirSync(root, { recursive: true });
}

function sessionPath(id: string) {
  return join(root, `${id}.json`);
}

function safeId() {
  return crypto.randomUUID();
}

export function createSession(context: DiscoveryContext): LighthouseSession {
  ensureStore();
  const now = new Date().toISOString();
  const session: LighthouseSession = {
    id: safeId(),
    context,
    createdAt: now,
    updatedAt: now,
    turns: [],
  };
  saveSession(session);
  return session;
}

export function getSession(id: string) {
  ensureStore();
  const path = sessionPath(id);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as LighthouseSession;
}

export function saveSession(session: LighthouseSession) {
  ensureStore();
  session.updatedAt = new Date().toISOString();
  writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2), "utf8");
}

export function appendTurn(
  session: LighthouseSession,
  turn: Omit<ConversationTurn, "id" | "createdAt">
) {
  session.turns.push({
    ...turn,
    id: safeId(),
    createdAt: new Date().toISOString(),
  });
  saveSession(session);
}
