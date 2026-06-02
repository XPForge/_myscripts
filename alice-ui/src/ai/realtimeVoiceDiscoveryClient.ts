import {
  startRealtimeVoiceSession,
  type RealtimeVoiceClient,
  type RealtimeVoiceHandlers,
} from "../engine/runtime";

export type { RealtimeSessionConfig as RealtimeDiscoverySession } from "../engine/runtime";
export type { RealtimeVoiceClient, RealtimeVoiceHandlers } from "../engine/runtime";

function toDiscoveryStatus(message: string) {
  if (message === "Realtime voice session is active. Speak naturally now.") {
    return "Realtime voice discovery is active. Speak naturally now.";
  }
  if (message === "Realtime voice session stopped.") {
    return "Realtime voice discovery session stopped.";
  }
  return message;
}

export async function startRealtimeVoiceDiscovery(
  realtimeSession: import("../engine/runtime").RealtimeSessionConfig,
  handlers: RealtimeVoiceHandlers
): Promise<RealtimeVoiceClient> {
  return startRealtimeVoiceSession(realtimeSession, {
    ...handlers,
    onStatus: handlers.onStatus
      ? (message) => handlers.onStatus?.(toDiscoveryStatus(message))
      : undefined,
    onDiagnosticLog: handlers.onDiagnosticLog
      ? (message) => handlers.onDiagnosticLog?.(toDiscoveryStatus(message))
      : undefined,
  });
}
