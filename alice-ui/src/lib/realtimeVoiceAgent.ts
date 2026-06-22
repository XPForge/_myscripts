import { RealtimeSafeError, normalizeRealtimeError } from "../engine/runtime";

export type RealtimeVoiceStatus =
  | "idle"
  | "requesting microphone"
  | "creating session"
  | "connecting"
  | "connected"
  | "speaking/listening"
  | "disconnected"
  | "failed";

export type RealtimeTranscriptRole = "user" | "assistant";

export type RealtimeTranscriptEvent = {
  id: string;
  role: RealtimeTranscriptRole;
  text: string;
  timestamp: string;
  source: string;
  eventType: string;
  isFinal: boolean;
};

export type RealtimeSessionMetadata = {
  sessionId: string | null;
  model: string;
  voice: string | null;
  endpoint: string;
  createdAt: string;
};

export type RealtimeClientSecretResponse = {
  clientSecret?: string;
  token?: string;
  sessionId?: string | null;
  model?: string;
  endpoint?: string;
  voice?: string | null;
  error?: string;
  detail?: string;
};

export type RealtimeBackendFetchDiagnostics = {
  endpointUrl: string;
  backendFetchSucceeded: boolean | null;
  httpStatus: number | null;
  message: string;
};

export const REALTIME_VOICE_OPTIONS = ["marin", "cedar", "ballad", "verse", "nova", "coral"] as const;
export type RealtimeVoiceOption = (typeof REALTIME_VOICE_OPTIONS)[number];
export const DEFAULT_REALTIME_VOICE: RealtimeVoiceOption = "marin";

export type RealtimeVoiceConnection = {
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  localStream: MediaStream;
  remoteStream: MediaStream;
  metadata: RealtimeSessionMetadata;
  stop: () => void;
};

export type RealtimeVoiceHandlers = {
  onStatus: (status: RealtimeVoiceStatus) => void;
  onTranscriptEvent: (event: RealtimeTranscriptEvent) => void;
  onError: (message: string) => void;
  onBackendFetchDiagnostics?: (diagnostics: RealtimeBackendFetchDiagnostics) => void;
};

const DEFAULT_CLIENT_SECRET_ENDPOINT = "http://localhost:3000/api/realtime/client-secret";

function getSafeRealtimeFailureMessage(status: number, statusText: string, rawDetail = "") {
  const providerCode = rawDetail.includes("insufficient_quota") ? "insufficient_quota" : undefined;
  const normalized = normalizeRealtimeError(
    new RealtimeSafeError(`Realtime connection failed: ${status} ${statusText || "provider error"}.`, {
      provider: "openai",
      status,
      code: providerCode,
      category: status === 429 || providerCode === "insufficient_quota" ? "quota" : "provider",
    })
  );

  if (normalized.diagnostic.category === "quota") return normalized.message;

  if (status === 401 || status === 403) {
    return "Realtime connection failed because the active API credential was rejected. Check the API key configured for the local backend.";
  }

  return `Realtime connection failed: ${status} ${statusText || "provider error"}.`;
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getRealtimeClientSecretEndpoint() {
  return import.meta.env.VITE_OPENAI_REALTIME_CLIENT_SECRET_ENDPOINT || DEFAULT_CLIENT_SECRET_ENDPOINT;
}

export function isRealtimeVoiceOption(value: string): value is RealtimeVoiceOption {
  return REALTIME_VOICE_OPTIONS.includes(value as RealtimeVoiceOption);
}

function getEventString(event: Record<string, unknown>, key: string) {
  const value = event[key];
  return typeof value === "string" ? value : "";
}

function extractResponseText(event: Record<string, unknown>) {
  const response = event.response;
  if (!response || typeof response !== "object") return "";
  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) return [];
      return content.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const text = (entry as { text?: unknown; transcript?: unknown }).text;
        const transcript = (entry as { text?: unknown; transcript?: unknown }).transcript;
        if (typeof text === "string") return [text];
        if (typeof transcript === "string") return [transcript];
        return [];
      });
    })
    .join("");
}

export function parseRealtimeTranscriptEvent(rawEvent: unknown): RealtimeTranscriptEvent | null {
  if (!rawEvent || typeof rawEvent !== "object") return null;
  const event = rawEvent as Record<string, unknown>;
  const eventType = getEventString(event, "type");
  const delta = getEventString(event, "delta");
  const transcript = getEventString(event, "transcript");
  const text = getEventString(event, "text");
  const responseText = extractResponseText(event);

  if (
    eventType === "conversation.item.input_audio_transcription.delta" ||
    eventType === "input_audio_buffer.speech_started"
  ) {
    if (!delta) return null;
    return {
      id: makeId("rt-user"),
      role: "user",
      text: delta,
      timestamp: new Date().toISOString(),
      source: "openai-realtime",
      eventType,
      isFinal: false,
    };
  }

  if (
    eventType === "conversation.item.input_audio_transcription.completed" ||
    eventType === "conversation.item.input_audio_transcription.done"
  ) {
    const finalText = transcript || text;
    if (!finalText) return null;
    return {
      id: makeId("rt-user"),
      role: "user",
      text: finalText,
      timestamp: new Date().toISOString(),
      source: "openai-realtime",
      eventType,
      isFinal: true,
    };
  }

  if (
    eventType === "response.audio_transcript.delta" ||
    eventType === "response.output_audio_transcript.delta" ||
    eventType === "response.output_text.delta"
  ) {
    if (!delta) return null;
    return {
      id: makeId("rt-assistant"),
      role: "assistant",
      text: delta,
      timestamp: new Date().toISOString(),
      source: "openai-realtime",
      eventType,
      isFinal: false,
    };
  }

  if (
    eventType === "response.audio_transcript.done" ||
    eventType === "response.output_audio_transcript.done" ||
    eventType === "response.output_text.done" ||
    eventType === "response.done" ||
    eventType === "response.completed"
  ) {
    const finalText = transcript || text || responseText;
    if (!finalText) return null;
    return {
      id: makeId("rt-assistant"),
      role: "assistant",
      text: finalText,
      timestamp: new Date().toISOString(),
      source: "openai-realtime",
      eventType,
      isFinal: true,
    };
  }

  return null;
}

async function requestClientSecret(
  voice: RealtimeVoiceOption,
  onDiagnostics?: (diagnostics: RealtimeBackendFetchDiagnostics) => void,
) {
  const endpointUrl = getRealtimeClientSecretEndpoint();
  onDiagnostics?.({
    endpointUrl,
    backendFetchSucceeded: null,
    httpStatus: null,
    message: "Realtime client-secret request has not completed.",
  });

  let response: Response;
  try {
    response = await fetch(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voice }),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Fetch was blocked or unreachable.";
    const message = `Backend unreachable at ${endpointUrl}. Start it with npm run backend:start and verify the route is reachable. ${detail}`;
    onDiagnostics?.({
      endpointUrl,
      backendFetchSucceeded: false,
      httpStatus: null,
      message,
    });
    throw new Error(message);
  }

  const body = (await response.json().catch(() => null)) as RealtimeClientSecretResponse | null;

  const serverMessage = body?.error
    ? body.detail
      ? `${body.error} ${body.detail}`
      : body.error
    : response.ok
      ? "Backend returned a realtime client-secret response."
      : `Backend returned HTTP ${response.status}.`;
  onDiagnostics?.({
    endpointUrl,
    backendFetchSucceeded: true,
    httpStatus: response.status,
    message: serverMessage,
  });

  if (!response.ok) {
    const message = body?.error || `Realtime session request failed: ${response.status}`;
    const isMissingConfig = /Missing server configuration/i.test(message);
    throw new Error(
      body?.detail
        ? `${message} ${body.detail}`
        : isMissingConfig
          ? `${message} Check the backend environment used by npm run backend:start.`
          : message,
    );
  }

  const clientSecret = body?.clientSecret || body?.token;
  if (!clientSecret || !body?.endpoint || !body.model) {
    throw new Error("Realtime session response was missing clientSecret, endpoint, or model.");
  }

  return {
    clientSecret,
    sessionId: body.sessionId ?? null,
    model: body.model,
    endpoint: body.endpoint,
    voice: body.voice ?? null,
  };
}

export async function startRealtimeVoiceAgent(
  audioElement: HTMLAudioElement,
  handlers: RealtimeVoiceHandlers,
  voice: RealtimeVoiceOption = DEFAULT_REALTIME_VOICE,
): Promise<RealtimeVoiceConnection> {
  handlers.onStatus("requesting microphone");
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone capture is not supported in this browser.");
  }

  const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  handlers.onStatus("creating session");
  const session = await requestClientSecret(voice, handlers.onBackendFetchDiagnostics);
  handlers.onStatus("connecting");

  const peerConnection = new RTCPeerConnection();
  const remoteStream = new MediaStream();
  const dataChannel = peerConnection.createDataChannel("oai-events");

  audioElement.autoplay = true;
  audioElement.srcObject = remoteStream;

  peerConnection.ontrack = (event) => {
    event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
    handlers.onStatus("speaking/listening");
    void audioElement.play().catch((error: unknown) => {
      handlers.onError(error instanceof Error ? error.message : "Audio playback was blocked.");
    });
  };

  peerConnection.onconnectionstatechange = () => {
    if (peerConnection.connectionState === "connected") handlers.onStatus("connected");
    if (peerConnection.connectionState === "disconnected") handlers.onStatus("disconnected");
    if (peerConnection.connectionState === "failed") {
      handlers.onStatus("failed");
      handlers.onError("Realtime peer connection failed.");
    }
  };

  dataChannel.onmessage = (messageEvent) => {
    try {
      const parsed = JSON.parse(String(messageEvent.data)) as unknown;
      const transcriptEvent = parseRealtimeTranscriptEvent(parsed);
      if (transcriptEvent) handlers.onTranscriptEvent(transcriptEvent);
    } catch {
      handlers.onError("Received an unreadable realtime data-channel event.");
    }
  };

  dataChannel.onerror = () => {
    handlers.onStatus("failed");
    handlers.onError("Realtime data channel failed.");
  };

  localStream.getAudioTracks().forEach((track) => peerConnection.addTrack(track, localStream));
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  const sdpResponse = await fetch(session.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.clientSecret}`,
      "Content-Type": "application/sdp",
      Accept: "application/sdp",
    },
    body: offer.sdp,
  });

  if (!sdpResponse.ok) {
    const detail = await sdpResponse.text().catch(() => "");
    const message = getSafeRealtimeFailureMessage(sdpResponse.status, sdpResponse.statusText, detail);
    const providerCode = detail.includes("insufficient_quota") ? "insufficient_quota" : undefined;
    const normalized = normalizeRealtimeError(
      new RealtimeSafeError(message, {
        provider: "openai",
        status: sdpResponse.status,
        code: providerCode,
        category: sdpResponse.status === 429 || providerCode === "insufficient_quota" ? "quota" : "provider",
      })
    );
    handlers.onBackendFetchDiagnostics?.({
      endpointUrl: session.endpoint,
      backendFetchSucceeded: true,
      httpStatus: sdpResponse.status,
      message: `Realtime provider request failed.${normalized.diagnosticText ? ` ${normalized.diagnosticText}` : ""}`,
    });
    throw new Error(message);
  }

  await peerConnection.setRemoteDescription({
    type: "answer",
    sdp: await sdpResponse.text(),
  });

  const stop = () => {
    localStream.getTracks().forEach((track) => track.stop());
    remoteStream.getTracks().forEach((track) => track.stop());
    try {
      dataChannel.close();
    } catch {
      // ignore close failures
    }
    peerConnection.close();
    audioElement.pause();
    audioElement.srcObject = null;
  };

  return {
    peerConnection,
    dataChannel,
    localStream,
    remoteStream,
    metadata: {
      sessionId: session.sessionId,
      model: session.model,
      voice: session.voice,
      endpoint: session.endpoint,
      createdAt: new Date().toISOString(),
    },
    stop,
  };
}

export function createRealtimeMarkdownExport(args: {
  sessionId: string;
  createdAt: string;
  exportedAt: string;
  metadata: RealtimeSessionMetadata | null;
  events: RealtimeTranscriptEvent[];
}) {
  const lines = [
    "# Raw Realtime Voice Runtime Transcript",
    "",
    `- Session ID: ${args.sessionId}`,
    `- Created: ${args.createdAt}`,
    `- Exported: ${args.exportedAt}`,
    `- Model: ${args.metadata?.model ?? "unknown"}`,
    `- Voice: ${args.metadata?.voice ?? "unknown"}`,
    "",
    "## Events",
    "",
  ];

  for (const event of args.events) {
    lines.push(`### ${event.role} - ${event.timestamp}`);
    lines.push(`_source=${event.source}; eventType=${event.eventType}; final=${String(event.isFinal)}_`);
    lines.push("", event.text, "");
  }

  return lines.join("\n");
}
