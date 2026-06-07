import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Turn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

export type Session = {
  id: string;
  name?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  turns: Turn[];
  profileMarkdown?: string;
  profileEmailStatus?: "not_configured" | "queued";
  profileEmailMessage?: string;
  profileEmailPreparedAt?: string;
};

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "sessions");

function ensure() {
  mkdirSync(dir, { recursive: true });
}

function pathFor(id: string) {
  return join(dir, `${id}.json`);
}

export function createSession(metadata: { name?: string; email?: string } = {}): Session {
  ensure();
  const now = new Date().toISOString();
  const session = {
    id: crypto.randomUUID(),
    name: metadata.name,
    email: metadata.email,
    createdAt: now,
    updatedAt: now,
    turns: [],
  };
  saveSession(session);
  return session;
}

export function getSession(id: string) {
  ensure();
  const path = pathFor(id);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Session;
}

export function saveSession(session: Session) {
  ensure();
  session.updatedAt = new Date().toISOString();
  writeFileSync(pathFor(session.id), JSON.stringify(session, null, 2), "utf8");
}

export function addTurn(session: Session, role: "user" | "assistant", text: string) {
  session.turns.push({ id: crypto.randomUUID(), role, text, createdAt: new Date().toISOString() });
  saveSession(session);
}
