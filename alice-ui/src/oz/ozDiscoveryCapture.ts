import type { OzCaptureTurn, OzDiscoveryCapture } from "./ozDiscoveryCaptureTypes";

const OZ_CAPTURE_STORAGE_KEY = "lighthouse.discovery.ozCaptures.v0.1";

export async function captureOzDiscovery(turns: OzCaptureTurn[]): Promise<OzDiscoveryCapture> {
  const response = await fetch("/api/oz-capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turns }),
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

