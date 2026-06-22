import {
  startRealtimeVoiceSession,
  type RealtimeVoiceClient,
  type RealtimeVoiceHandlers,
} from "../engine/runtime";

export type { RealtimeSessionConfig as RealtimeDiscoverySession } from "../engine/runtime";
export { normalizeRealtimeError } from "../engine/runtime";
export type {
  RealtimeOutputModality,
  RealtimeStartupTraceEvent,
  RealtimeStartupTraceStage,
  RealtimeVoiceClient,
  RealtimeVoiceHandlers,
} from "../engine/runtime";

function isMockRealtimeSession(
  realtimeSession: import("../engine/runtime").RealtimeSessionConfig
) {
  return realtimeSession.endpoint === "mock://realtime-discovery";
}

function startMockRealtimeVoiceDiscovery(
  handlers: RealtimeVoiceHandlers
): RealtimeVoiceClient {
  const timers: number[] = [];
  let stopped = false;

  const schedule = (delay: number, action: () => void) => {
    const timerId = window.setTimeout(() => {
      if (!stopped) action();
    }, delay);
    timers.push(timerId);
  };

  handlers.onStatus?.("Mock realtime discovery session started.");
  handlers.onDiagnosticLog?.("STATUS: Mock realtime discovery session started.");
  handlers.onMicrophoneStatus?.("mocked");
  handlers.onAudioPlaybackStatus?.("mocked");
  handlers.onConnectionState?.("connected");

  schedule(250, () => {
    handlers.onDataChannelStatus?.("open");
    handlers.onDiagnosticLog?.("DEBUG: Mock realtime data channel opened.");
  });

  return {
    sendText: (text: string) => {
      const normalized = text.trim();
      if (!normalized) return;
      handlers.onTranscript?.(normalized, true);
      handlers.onDiagnosticLog?.("DEBUG: Mock realtime text message accepted.");
    },
    setMicrophoneMuted: (muted: boolean) => {
      handlers.onMicrophoneStatus?.(muted ? "muted" : "mocked");
      handlers.onStatus?.(muted ? "Mock microphone muted." : "Mock microphone unmuted.");
      handlers.onDiagnosticLog?.(`DEBUG: Mock microphone muted=${String(muted)}.`);
    },
    stop: async () => {
      stopped = true;
      timers.forEach((timerId) => window.clearTimeout(timerId));
      handlers.onConnectionState?.("closed");
      handlers.onDataChannelStatus?.("closed");
      handlers.onStatus?.("Mock realtime discovery session stopped.");
      handlers.onDiagnosticLog?.("STATUS: Mock realtime discovery session stopped.");
    },
  };
}

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
  if (isMockRealtimeSession(realtimeSession)) {
    return startMockRealtimeVoiceDiscovery(handlers);
  }

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
