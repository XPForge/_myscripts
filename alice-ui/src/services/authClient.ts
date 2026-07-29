export type AuthUser = { id: string; name: string; email: string };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof (payload as { error?: string })?.error === "string" ? (payload as { error: string }).error : `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

export async function signUp(name: string, email: string, password: string): Promise<AuthUser> {
  const { user } = await postJson<{ user: AuthUser }>("/api/auth-signup", { name, email, password });
  return user;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { user } = await postJson<{ user: AuthUser }>("/api/auth-login", { email, password });
  return user;
}

export async function signOut(): Promise<void> {
  await postJson<{ status: string }>("/api/auth-session", {});
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch("/api/auth-session");
    if (!response.ok) return null;
    const payload = (await response.json()) as { user: AuthUser | null };
    return payload.user ?? null;
  } catch {
    return null;
  }
}
