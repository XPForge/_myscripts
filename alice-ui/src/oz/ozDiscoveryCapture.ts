import type { OzCaptureTurn, OzDiscoveryCapture } from "./ozDiscoveryCaptureTypes";

const OZ_CAPTURE_STORAGE_KEY = "lighthouse.discovery.ozCaptures.v0.1";

export async function captureOzDiscovery(turns: OzCaptureTurn[], sessionId?: string, previousCapture?: OzDiscoveryCapture | null): Promise<OzDiscoveryCapture> {
  const response = await fetch("/api/oz-capture", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(sessionId ? { "X-Lighthouse-Session-Id": sessionId } : {}) },
    // previousCapture lets the server ask the model for only what's new
    // since last time instead of re-deriving the whole transcript's worth
    // of evidence/themes every turn -- see api/oz-capture.js for why.
    body: JSON.stringify({ turns, previousCapture: previousCapture ?? undefined }),
  });

  if (!response.ok) throw new Error("Oz capture request failed");
  const capture = await response.json() as OzDiscoveryCapture;
  persistOzDiscoveryCapture(capture);
  return capture;
}

export function loadOzDiscoveryCaptures(): OzDiscoveryCapture[] {
  try {
    const stored = localStorage.getItem(OZ_CAPTURE_STORAGE_KEY);
    return stored ? JSON.parse(stored) as OzDiscoveryCapture[] : [];
  } catch {
    return [];
  }
}

export function persistOzDiscoveryCapture(capture: OzDiscoveryCapture): void {
  try {
    const captures = loadOzDiscoveryCaptures();
    const withoutSameTurn = captures.filter(item => item.transcriptThroughTurnId !== capture.transcriptThroughTurnId);
    localStorage.setItem(OZ_CAPTURE_STORAGE_KEY, JSON.stringify([...withoutSameTurn, capture]));
  } catch {
    // Oz capture is observational and must never interrupt the live conversation.
  }
}

export function clearOzDiscoveryCaptures(): void {
  localStorage.removeItem(OZ_CAPTURE_STORAGE_KEY);
}

