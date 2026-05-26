export type AuthMember = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  lastLogin: string;
  sessionCount: number;
};

const MEMBERS_KEY = "alice.members";
const SESSION_KEY = "alice.authSession";

type AuthSession = {
  userId: string;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return null;
  }
}

function hashPassword(password: string): string {
  if (typeof window === "undefined") return password;
  return window.btoa(`alice:${password}`);
}

function loadStorage<T>(key: string): T | null {
  try {
    return safeParse<T>(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function persistStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

export function loadMembers(): AuthMember[] {
  const raw = loadStorage<AuthMember[]>(MEMBERS_KEY);
  return Array.isArray(raw) ? raw : [];
}

export function persistMembers(members: AuthMember[]): void {
  persistStorage(MEMBERS_KEY, members);
}

export function loadSession(): AuthSession | null {
  return loadStorage<AuthSession>(SESSION_KEY);
}

export function persistSession(session: AuthSession | null): void {
  if (session === null) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  persistStorage(SESSION_KEY, session);
}

export function findMemberByEmail(email: string): AuthMember | undefined {
  const members = loadMembers();
  return members.find((member) => member.email.toLowerCase() === email.toLowerCase());
}

export function createMember(
  email: string,
  name: string,
  password: string
): AuthMember {
  const now = new Date().toISOString();
  const member: AuthMember = {
    id: `alice-member-${now}`,
    email: email.trim().toLowerCase(),
    name: name.trim() || "ALICE Member",
    passwordHash: hashPassword(password.trim()),
    createdAt: now,
    lastLogin: now,
    sessionCount: 1,
  };
  const members = loadMembers();
  persistMembers([...members, member]);
  persistSession({ userId: member.id });
  return member;
}

export function validateCredentials(
  email: string,
  password: string
): AuthMember | null {
  const member = findMemberByEmail(email);
  if (!member) return null;
  if (member.passwordHash !== hashPassword(password.trim())) return null;

  const now = new Date().toISOString();
  const members = loadMembers();
  const updatedMembers = members.map((item) =>
    item.id === member.id
      ? { ...item, lastLogin: now, sessionCount: item.sessionCount + 1 }
      : item
  );
  persistMembers(updatedMembers);
  const updated = updatedMembers.find((item) => item.id === member.id);
  if (updated) {
    persistSession({ userId: updated.id });
  }
  return updated ?? null;
}

export function loadSessionMember(): AuthMember | null {
  const session = loadSession();
  if (!session) return null;
  return loadMembers().find((member) => member.id === session.userId) ?? null;
}

export function clearSession(): void {
  persistSession(null);
}
