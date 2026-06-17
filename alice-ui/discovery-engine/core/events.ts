import type { DiscoveryEvent } from "./types";

export function createDiscoveryEvent(
  input: Omit<DiscoveryEvent, "id" | "createdAt">
): DiscoveryEvent {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

export function appendEvent<T extends { eventLog: DiscoveryEvent[] }>(
  target: T,
  event: DiscoveryEvent
): T {
  return {
    ...target,
    eventLog: [...target.eventLog, event],
  };
}
