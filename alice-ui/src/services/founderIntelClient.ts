export type FounderIntelMode = "landscape" | "moat" | "ats" | "pitch" | "custom";

export type FounderIntelResult =
  | { status: "ok"; text: string }
  | { status: "unauthorized" | "forbidden" | "error" };

export async function getFounderIntel(mode: FounderIntelMode, customPrompt?: string): Promise<FounderIntelResult> {
  try {
    const response = await fetch("/api/founder-intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, customPrompt }),
    });
    if (response.status === 401) return { status: "unauthorized" };
    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };
    const payload = (await response.json()) as { text?: string };
    return { status: "ok", text: payload.text ?? "" };
  } catch {
    return { status: "error" };
  }
}
