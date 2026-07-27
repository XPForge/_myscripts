import { pickRandomOpeningQuestion } from "../../services/discoveryOpeningQuestions";

export type RealtimeSessionConfig = {
  sessionId: string;
  provider?: string;
  model: string;
  token: string;
  status: "initializing" | "active" | "complete";
  endpoint?: string;
  outputModality: RealtimeOutputModality;
  discoveryModeId?: string;
  credentialIssued?: boolean;
  credentialExpiresAt?: number | string | null;
  createdAt: string;
};

export type RealtimeOutputModality = "audio" | "text";

export type RealtimeStartupTraceStage =
  | "microphone.permission"
  | "microphone.getUserMedia"
  | "rtc.peerConnection.created"
  | "rtc.dataChannel.created"
  | "rtc.dataChannel.open"
  | "rtc.sdp.offer.sent"
  | "rtc.sdp.answer.received"
  | "rtc.remoteDescription.set"
  | "realtime.session.created"
  | "realtime.responseCreate.sent"
  | "realtime.event.received";

export type RealtimeStartupTraceEvent = {
  stage: RealtimeStartupTraceStage;
  reached: boolean;
  timestamp: string;
  error?: string;
};

export type RealtimeErrorDiagnostic = {
  provider?: string;
  status?: number;
  code?: string;
  category?: "quota" | "auth" | "provider" | "network" | "unknown";
};

export const REALTIME_QUOTA_SAFE_MESSAGE =
  "Realtime session could not start because the API project is out of quota or over budget. No live session was started.";

export class RealtimeSafeError extends Error {
  readonly diagnostic: RealtimeErrorDiagnostic;

  constructor(message: string, diagnostic: RealtimeErrorDiagnostic = {}) {
    super(message);
    this.name = "RealtimeSafeError";
    this.diagnostic = diagnostic;
  }
}

export type RealtimeVoiceHandlers = {
  onStatus?: (status: string) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAssistantText?: (text: string) => void;
  onConnectionState?: (state: string) => void;
  onError?: (error: Error) => void;
  onDiagnosticLog?: (message: string) => void;
  onMicrophoneStatus?: (status: string) => void;
  onAudioPlaybackStatus?: (status: string) => void;
  onDataChannelStatus?: (status: string) => void;
  onStartupTrace?: (event: RealtimeStartupTraceEvent) => void;
};

export type RealtimeVoiceClient = {
  stop: () => Promise<void>;
  sendText: (text: string) => void;
  setMicrophoneMuted: (muted: boolean) => void;
  setOutputModality: (modality: RealtimeOutputModality) => void;
  speakScriptedLine: (text: string) => void;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: {
      transcript?: string;
    };
  }>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
  message?: string;
};

function getRealtimeErrorDiagnostic(error: unknown): RealtimeErrorDiagnostic {
  if (error instanceof RealtimeSafeError) {
    return error.diagnostic;
  }
  if (typeof error === "object" && error !== null && "diagnostic" in error) {
    const diagnostic = (error as { diagnostic?: unknown }).diagnostic;
    if (typeof diagnostic === "object" && diagnostic !== null) {
      return diagnostic as RealtimeErrorDiagnostic;
    }
  }
  return {};
}

function formatRealtimeErrorDiagnostic(diagnostic: RealtimeErrorDiagnostic) {
  const parts = [
    diagnostic.provider ? `provider=${diagnostic.provider}` : "",
    diagnostic.status ? `status=${diagnostic.status}` : "",
    diagnostic.code ? `code=${diagnostic.code}` : "",
    diagnostic.category ? `category=${diagnostic.category}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "";
}

function redactSensitiveText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-[redacted]")
    .replace(
      /\b(secret|token|authorization|bearer|api[_-]?key|client[_-]?secret|credential|key)\b\s*[:=]\s*["']?[^"',\s}]+/gi,
      "$1=[redacted]"
    );
}

function isQuotaDiagnostic(diagnostic: RealtimeErrorDiagnostic) {
  return diagnostic.category === "quota" || diagnostic.code === "insufficient_quota";
}

function isQuotaText(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("insufficient_quota") ||
    normalized.includes("insufficient quota") ||
    normalized.includes("exceeded your current quota") ||
    normalized.includes("out of quota") ||
    normalized.includes("over budget")
  );
}

function isRawProviderBodyText(value: string) {
  const trimmed = value.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

function toProviderErrorRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function extractProviderErrorBodyDiagnostic(body: string, provider = "openai"): RealtimeErrorDiagnostic {
  try {
    const parsed = JSON.parse(body) as unknown;
    const record = toProviderErrorRecord(parsed);
    const errorRecord = toProviderErrorRecord(record?.error) ?? record;
    const code = typeof errorRecord?.code === "string" ? errorRecord.code : undefined;
    const message = typeof errorRecord?.message === "string" ? errorRecord.message : body;
    return {
      provider,
      code,
      category: code === "insufficient_quota" || isQuotaText(message) ? "quota" : "provider",
    };
  } catch {
    return {
      provider,
      category: isQuotaText(body) ? "quota" : "provider",
    };
  }
}

export function normalizeRealtimeError(
  error: unknown,
  fallback = "Realtime session could not be started."
) {
  const existingDiagnostic = getRealtimeErrorDiagnostic(error);
  const rawMessage = redactSensitiveText(
    error instanceof Error ? error.message : typeof error === "string" ? error : fallback
  );
  const diagnostic: RealtimeErrorDiagnostic = {
    ...existingDiagnostic,
    category: existingDiagnostic.category ?? (isQuotaText(rawMessage) ? "quota" : undefined),
    code: existingDiagnostic.code ?? (isQuotaText(rawMessage) ? "insufficient_quota" : undefined),
  };

  if (isQuotaDiagnostic(diagnostic)) {
    return {
      message: REALTIME_QUOTA_SAFE_MESSAGE,
      diagnostic,
      diagnosticText: formatRealtimeErrorDiagnostic(diagnostic),
    };
  }

  return {
    message: isRawProviderBodyText(rawMessage) ? fallback : rawMessage || fallback,
    diagnostic,
    diagnosticText: formatRealtimeErrorDiagnostic(diagnostic),
  };
}

function isJsonString(value: unknown): value is string {
  return typeof value === "string";
}

function parseOpenAIRealtimeEvent(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  return payload as Record<string, unknown>;
}

function extractTextFromEvent(event: Record<string, unknown>) {
  if (typeof event.type !== "string") {
    return null;
  }

  const deltaObject = typeof event.delta === "object" && event.delta ? (event.delta as Record<string, unknown>) : null;
  const deltaText = typeof event.delta === "string" ? event.delta : undefined;
  const transcript = typeof event.transcript === "string" ? event.transcript : undefined;
  const text = typeof event.text === "string" ? event.text : undefined;
  const content = deltaObject && typeof deltaObject.content === "string" ? deltaObject.content : deltaText;
  const response = typeof event.response === "object" && event.response ? event.response as Record<string, unknown> : null;
  const output = Array.isArray(response?.output) ? response.output : [];
  const responseOutputText = output.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const contentItems = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as unknown[]
      : [];
    return contentItems.flatMap((contentItem) => {
      if (typeof contentItem !== "object" || contentItem === null) return [];
      const record = contentItem as Record<string, unknown>;
      if (typeof record.text === "string") return [record.text];
      if (typeof record.transcript === "string") return [record.transcript];
      return [];
    });
  }).join("");

  if (
    event.type === "response.delta" ||
    event.type === "response.output_text.delta"
  ) {
    if (content) {
      return { type: "assistant", text: content };
    }
  }

  if (
    event.type === "response.completed" ||
    event.type === "response.done" ||
    event.type === "response.output_text.completed" ||
    event.type === "response.output_text.done"
  ) {
    if (content) {
      return { type: "assistant", text: content, isFinal: true };
    }
    if (text) {
      return { type: "assistant", text, isFinal: true };
    }
    if (responseOutputText) {
      return { type: "assistant", text: responseOutputText, isFinal: true };
    }
  }

  if (
    event.type === "transcript.delta" ||
    event.type === "input_transcript.delta" ||
    event.type === "response.output_audio_transcript.delta" ||
    event.type === "response.audio_transcript.delta"
  ) {
    if (content) {
      return { type: "transcript", text: content, isFinal: false };
    }
  }

  if (
    event.type === "transcript.final" ||
    event.type === "input_transcript" ||
    event.type === "response.output_audio_transcript" ||
    event.type === "response.output_audio_transcript.done" ||
    event.type === "response.audio_transcript.done"
  ) {
    if (transcript) {
      return { type: "transcript", text: transcript, isFinal: true };
    }
    if (content) {
      return { type: "transcript", text: content, isFinal: true };
    }
  }

  return null;
}

function createSpeechRecognition(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: (error: Error) => void
) {
  const speechWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = result[0]?.transcript?.trim();
      if (!transcript) continue;
      if (result.isFinal) {
        finalText += `${transcript} `;
      } else {
        interim += `${transcript} `;
      }
    }

    if (interim.trim()) {
      onTranscript(interim.trim(), false);
    }
    if (finalText.trim()) {
      onTranscript(finalText.trim(), true);
    }
  };

  recognition.onerror = (event) => {
    const message = event.error || event.message || "Speech recognition failed.";
    onError(new Error(String(message)));
  };

  recognition.onend = () => {
    // Keep the speech recognizer running until the session is stopped.
    try {
      recognition.start();
    } catch {
      // ignore restart failures
    }
  };

  try {
    recognition.start();
  } catch (error) {
    onError(error instanceof Error ? error : new Error("Unable to start speech recognition."));
    return null;
  }

  return recognition;
}

function describeMicrophoneError(error: unknown) {
  if (error instanceof DOMException) {
    const detail = error.message ? ` (${error.name}: ${error.message})` : ` (${error.name})`;
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return `Microphone permission was denied${detail}. Allow microphone access for this site in your browser, then restart the discovery session.`;
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return `No microphone was found${detail}. Connect or enable a microphone, then restart the discovery session.`;
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return `The microphone is already in use or cannot be read${detail}. Close other apps using the microphone, then restart the discovery session.`;
    }
    return `Unable to access the microphone${detail}.`;
  }

  return error instanceof Error ? error.message : "Unable to access the microphone.";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

async function describeMicrophoneEnvironment() {
  const parts: string[] = [];
  parts.push(`origin=${window.location.origin}`);
  parts.push(`secureContext=${String(window.isSecureContext)}`);

  try {
    const permission = await navigator.permissions?.query?.({ name: "microphone" as PermissionName });
    if (permission?.state) {
      parts.push(`permission=${permission.state}`);
    }
  } catch (error) {
    parts.push(`permissionQuery=unavailable:${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const devices = await navigator.mediaDevices?.enumerateDevices?.();
    if (devices) {
      const audioInputs = devices.filter((device) => device.kind === "audioinput");
      parts.push(`audioInputs=${audioInputs.length}`);
      const namedInputs = audioInputs
        .map((device, index) => device.label || `audio input ${index + 1} label hidden`)
        .slice(0, 4);
      if (namedInputs.length > 0) {
        parts.push(`audioInputNames=${namedInputs.join(" | ")}`);
      }
    }
  } catch (error) {
    parts.push(`enumerateDevices=failed:${error instanceof Error ? error.message : String(error)}`);
  }

  return parts.join("; ");
}

function sendRealtimeEvent(
  dataChannel: RTCDataChannel,
  event: Record<string, unknown>,
  diagnostic: (message: string) => void
) {
  if (dataChannel.readyState !== "open") {
    diagnostic(`Skipped realtime event ${String(event.type)} because data channel is ${dataChannel.readyState}.`);
    return false;
  }

  dataChannel.send(JSON.stringify(event));
  diagnostic(`Sent realtime event: ${String(event.type)}.`);
  return true;
}

function createResponseEvent(outputModality: RealtimeOutputModality, instructions?: string) {
  return {
    event_id: `response_${Date.now()}`,
    type: "response.create",
    response: {
      output_modalities: [outputModality],
      ...(instructions ? { instructions } : {}),
    },
  };
}

// Caps a single assistant turn (audio output is billed per token and was
// otherwise unbounded, letting one rambling response run up cost with no ceiling).
const REALTIME_MAX_RESPONSE_OUTPUT_TOKENS = 800;

const REALTIME_DISCOVERY_STARTUP_GUIDANCE =
  "Conduct Discovery naturally. Ask one question at a time. Let each answer shape the next question. Preserve participant authority: the participant may correct, reject, refine, or redirect. Do not score, rank, diagnose, assess, classify, or treat profile readiness as the end of Discovery. Keep the tone human, curious, non-clinical, and non-corporate.";

// Covered in Alice's own natural words at the start of every session — not read
// verbatim — so participants know who she is, what this is, and what to expect
// before she asks anything.
const REALTIME_DISCOVERY_SELF_INTRODUCTION =
  "Introduce yourself as Alice. Explain that this is Project Lighthouse Discovery, and that you're here to help understand how the participant thinks, learns, solves problems, communicates, creates, adapts, and what kinds of environments help them thrive. Make clear this is not a test, evaluation, diagnosis, personality assessment, score, or job interview. Explain the participant's role: answer naturally, think out loud, and correct or redirect you whenever something doesn't fit — there's no need for perfect wording. Explain the process: you'll ask one question at a time and let each answer shape where the conversation goes next, and you may reflect observations along the way but won't treat them as confirmed unless the participant confirms them. Explain the end result: later, once enough meaningful understanding has been gathered, Lighthouse can help create a Human Clarity Profile-style draft that represents what traditional resumes and profiles often miss. Keep this warm, brief, and conversational — not a long recitation.";

function createStartupResponseEvent(outputModality: RealtimeOutputModality, skipIntro: boolean) {
  const openingQuestion = pickRandomOpeningQuestion();
  if (skipIntro) {
    return createResponseEvent(
      outputModality,
      `${REALTIME_DISCOVERY_STARTUP_GUIDANCE} Skip any self-introduction. Begin the conversation by asking exactly this question, word for word, and nothing else: "${openingQuestion}"`
    );
  }
  return createResponseEvent(
    outputModality,
    `${REALTIME_DISCOVERY_STARTUP_GUIDANCE} ${REALTIME_DISCOVERY_SELF_INTRODUCTION} After that introduction, ask exactly this question, word for word, and nothing else: "${openingQuestion}"`
  );
}

// Used for fixed, pre-scripted announcements (e.g. the finish/continue
// checkpoint) that must come from the application, not the model's own
// judgment — the text is dictated verbatim rather than generated.
function createScriptedResponseEvent(outputModality: RealtimeOutputModality, text: string) {
  return createResponseEvent(outputModality, `Say exactly this and nothing else: "${text}"`);
}

async function waitForIceGatheringComplete(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", onStateChange);
      resolve();
    }, 5000);

    const onStateChange = () => {
      if (pc.iceGatheringState === "complete") {
        window.clearTimeout(timeoutId);
        pc.removeEventListener("icegatheringstatechange", onStateChange);
        resolve();
      }
    };

    pc.addEventListener("icegatheringstatechange", onStateChange);
  });
}

export type RealtimeVoiceSessionOptions = {
  // Debug-only: skips Alice's spoken self-introduction and goes straight to
  // the opening question. Never gate this to end users.
  skipIntro?: boolean;
};

export async function startRealtimeVoiceSession(
  realtimeSession: RealtimeSessionConfig,
  handlers: RealtimeVoiceHandlers,
  options: RealtimeVoiceSessionOptions = {}
): Promise<RealtimeVoiceClient> {
  const outputModality = realtimeSession.outputModality ?? "audio";
  const isAudioMode = outputModality === "audio";
  let currentOutputModality: RealtimeOutputModality = outputModality;

  if (isAudioMode && !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone capture is not supported by this browser.");
  }

  if (!realtimeSession.token) {
    throw new Error("Realtime session token is missing.");
  }

  const status = (message: string) => {
    handlers.onStatus?.(message);
    handlers.onDiagnosticLog?.(`STATUS: ${message}`);
  };
  const errorHandler = (error: Error) => {
    const normalized = normalizeRealtimeError(error);
    handlers.onError?.(new RealtimeSafeError(normalized.message, normalized.diagnostic));
    handlers.onDiagnosticLog?.(
      `ERROR: ${normalized.message}${normalized.diagnosticText ? ` (${normalized.diagnosticText})` : ""}`
    );
  };
  const diagnostic = (message: string) => {
    handlers.onDiagnosticLog?.(`DEBUG: ${message}`);
  };
  const trace = (
    stage: RealtimeStartupTraceStage,
    reached: boolean,
    error?: unknown
  ) => {
    const normalized = error ? normalizeRealtimeError(error) : null;
    const message = normalized?.diagnosticText || normalized?.message;
    handlers.onStartupTrace?.({
      stage,
      reached,
      timestamp: new Date().toISOString(),
      error: message,
    });
    handlers.onDiagnosticLog?.(
      `TRACE ${stage}: reached=${String(reached)}${message ? ` error=${message}` : ""}`
    );
  };
  const initializeTrace = () => {
    const timestamp = new Date().toISOString();
    const stages: RealtimeStartupTraceStage[] = [
      "microphone.permission",
      "microphone.getUserMedia",
      "rtc.peerConnection.created",
      "rtc.dataChannel.created",
      "rtc.dataChannel.open",
      "rtc.sdp.offer.sent",
      "rtc.sdp.answer.received",
      "rtc.remoteDescription.set",
      "realtime.session.created",
      "realtime.responseCreate.sent",
      "realtime.event.received",
    ];
    stages.forEach((stage) => {
      handlers.onStartupTrace?.({ stage, reached: false, timestamp });
    });
  };

  initializeTrace();
  let localStream: MediaStream | null = null;
  if (isAudioMode) {
    status("Requesting microphone access...");
    handlers.onMicrophoneStatus?.("pending");
    diagnostic(`Microphone environment before getUserMedia: ${await describeMicrophoneEnvironment()}`);
    try {
      localStream = await withTimeout(
        navigator.mediaDevices.getUserMedia({ audio: true }),
        15000,
        "Microphone request timed out. Check whether the browser permission prompt is hidden, blocked, or waiting behind another window."
      );
      diagnostic(`Microphone environment after getUserMedia: ${await describeMicrophoneEnvironment()}`);
      trace("microphone.permission", true);
      trace("microphone.getUserMedia", true);
    } catch (error) {
      handlers.onMicrophoneStatus?.("denied");
      trace("microphone.permission", false, describeMicrophoneError(error));
      trace("microphone.getUserMedia", false, describeMicrophoneError(error));
      throw new Error(describeMicrophoneError(error));
    }
  } else {
    handlers.onMicrophoneStatus?.("not required");
    handlers.onAudioPlaybackStatus?.("text mode");
    trace("microphone.permission", true);
    trace("microphone.getUserMedia", true);
    status("Starting text discovery session...");
  }

  const audioElement = isAudioMode ? new Audio() : null;
  if (audioElement) {
    audioElement.autoplay = true;
    audioElement.muted = false;
    audioElement.onplaying = () => {
      handlers.onAudioPlaybackStatus?.("playing");
      diagnostic("Assistant audio playback started.");
      status("Assistant audio is playing.");
    };
    audioElement.onpause = () => {
      handlers.onAudioPlaybackStatus?.("paused");
      diagnostic("Assistant audio playback paused.");
    };
    audioElement.onerror = () => {
      handlers.onAudioPlaybackStatus?.("error");
      diagnostic("Assistant audio playback error detected.");
    };
  }

  let pc: RTCPeerConnection;
  try {
    pc = new RTCPeerConnection();
    trace("rtc.peerConnection.created", true);
  } catch (error) {
    trace("rtc.peerConnection.created", false, error);
    throw error;
  }
  let dataChannel: RTCDataChannel | null = null;
  let dataChannelOpened = false;
  let remoteDescriptionSet = false;
  let sessionCreated = false;
  let startupResponseSent = false;
  let startupRetryTimer: number | null = null;
  let sessionConfigSent = false;
  const trySendSessionConfig = (source: string) => {
    if (sessionConfigSent) return;
    if (!dataChannel || dataChannel.readyState !== "open") {
      diagnostic(`session.update waiting for open data channel from ${source}.`);
      return;
    }
    const sent = sendRealtimeEvent(
      dataChannel,
      {
        event_id: `session_update_${Date.now()}`,
        type: "session.update",
        session: { max_response_output_tokens: REALTIME_MAX_RESPONSE_OUTPUT_TOKENS },
      },
      diagnostic
    );
    sessionConfigSent = sent;
  };
  const trySendStartupResponse = (source: string) => {
    if (startupResponseSent) {
      diagnostic(`Startup response.create already sent; skipped ${source}.`);
      return;
    }
    if (!dataChannel || dataChannel.readyState !== "open") {
      diagnostic(`Startup response.create waiting for open data channel from ${source}.`);
      return;
    }
    if (!remoteDescriptionSet) {
      diagnostic(`Startup response.create waiting for remote description from ${source}.`);
      return;
    }
    if (!sessionCreated) {
      diagnostic(`Startup response.create waiting for session.created from ${source}.`);
      return;
    }

    const event = createStartupResponseEvent(outputModality, Boolean(options.skipIntro));
    diagnostic("Startup response.create payload prepared.");
    const sent = sendRealtimeEvent(dataChannel, event, diagnostic);
    startupResponseSent = sent;
    trace(
      "realtime.responseCreate.sent",
      sent,
      sent ? undefined : `Data channel state was ${dataChannel.readyState}.`
    );
  };
  const scheduleStartupRetry = (source: string) => {
    if (startupRetryTimer !== null || startupResponseSent) return;
    startupRetryTimer = window.setTimeout(() => {
      startupRetryTimer = null;
      diagnostic(`Retrying startup response.create after ${source}.`);
      trySendStartupResponse(`retry:${source}`);
    }, 600);
  };

  pc.ontrack = (event) => {
    diagnostic("Received remote audio track from realtime peer connection.");
    if (audioElement && event.streams && event.streams[0]) {
      audioElement.srcObject = event.streams[0];
      audioElement.play().catch((error) => {
        diagnostic(`Audio playback prevented: ${error instanceof Error ? error.message : String(error)}`);
      });
      status("Assistant audio received.");
    }
  };

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    handlers.onConnectionState?.(state);
    status(`Realtime connection state: ${state}`);
    diagnostic(`RTCPeerConnection state changed to ${state}.`);
    if (state === "failed" || state === "disconnected") {
      errorHandler(new Error(`Realtime connection state changed to ${state}.`));
    }
  };

  pc.oniceconnectionstatechange = () => {
    diagnostic(`ICE connection state: ${pc.iceConnectionState}.`);
  };

  pc.onicecandidate = (event) => {
    diagnostic(`ICE candidate event: ${event.candidate?.candidate ?? "<null>"}`);
  };

  try {
    dataChannel = pc.createDataChannel("oai-events");
    trace("rtc.dataChannel.created", true);
  } catch (error) {
    trace("rtc.dataChannel.created", false, error);
    throw error;
  }

  dataChannel.onopen = () => {
    dataChannelOpened = true;
    handlers.onDataChannelStatus?.("open");
    status("Realtime data channel is open.");
    diagnostic("Realtime data channel opened.");
    trace("rtc.dataChannel.open", true);
    trySendSessionConfig("dataChannel.onopen");
    trySendStartupResponse("dataChannel.onopen");
  };

  dataChannel.onclose = () => {
    handlers.onDataChannelStatus?.("closed");
    if (!dataChannelOpened) {
      trace("rtc.dataChannel.open", false, "Realtime data channel closed before opening.");
    }
    status("Realtime data channel closed.");
    diagnostic("Realtime data channel closed.");
  };

  dataChannel.onerror = (event) => {
    handlers.onDataChannelStatus?.("error");
    trace("rtc.dataChannel.open", false, "Realtime data channel error.");
    errorHandler(new Error("Realtime data channel error."));
    diagnostic(`Realtime data channel error event: ${event?.toString?.() ?? "unknown"}`);
  };

  dataChannel.onmessage = (event) => {
    trace("realtime.event.received", true);
    diagnostic("Realtime data channel message received.");
    const raw = event.data;
    let parsed: Record<string, unknown> | null = null;

    if (isJsonString(raw)) {
      try {
        parsed = parseOpenAIRealtimeEvent(JSON.parse(raw));
      } catch (parseError) {
        diagnostic(`Unable to parse data channel message: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        return;
      }
    } else if (typeof raw === "object" && raw !== null) {
      parsed = parseOpenAIRealtimeEvent(raw);
    }

    if (!parsed) {
      diagnostic("Realtime event could not be parsed into an object.");
      return;
    }
    const eventType = typeof parsed.type === "string" ? parsed.type : "unknown";
    diagnostic(`Realtime event type: ${eventType}.`);
    if (eventType === "session.created") {
      sessionCreated = true;
      trace("realtime.session.created", true);
      trySendSessionConfig("session.created");
      trySendStartupResponse("session.created");
      scheduleStartupRetry("session.created");
    }
    if (eventType === "session.updated") {
      sessionCreated = true;
      trace("realtime.session.created", true);
      trySendSessionConfig("session.updated");
      trySendStartupResponse("session.updated");
      scheduleStartupRetry("session.updated");
    }
    if (eventType === "error" || eventType === "invalid_request_error") {
      diagnostic(`Realtime error event received: ${eventType}.`);
      const errorRecord = toProviderErrorRecord(parsed.error) ?? parsed;
      const code = typeof errorRecord.code === "string" ? errorRecord.code : undefined;
      const providerMessage =
        typeof errorRecord.message === "string"
          ? errorRecord.message
          : "Realtime server emitted an error event.";
      const errorDiagnostic: RealtimeErrorDiagnostic = {
        provider: realtimeSession.provider ?? "openai",
        code,
        category: code === "insufficient_quota" || isQuotaText(providerMessage) ? "quota" : "provider",
      };
      const normalized = normalizeRealtimeError(
        new RealtimeSafeError("Realtime server emitted an error event.", errorDiagnostic)
      );
      errorHandler(new RealtimeSafeError(normalized.message, normalized.diagnostic));
    }
    if (eventType === "response.done" || eventType === "response.completed") {
      const responseRecord = toProviderErrorRecord(parsed.response);
      const usage = responseRecord?.usage;
      if (usage && typeof usage === "object") {
        diagnostic(`Realtime turn usage: ${JSON.stringify(usage)}`);
      }
    }

    const extracted = extractTextFromEvent(parsed);
    if (!extracted) {
      return;
    }

    if (extracted.type === "transcript") {
      handlers.onTranscript?.(extracted.text, Boolean(extracted.isFinal));
      diagnostic(`Transcript event received. final=${Boolean(extracted.isFinal)}.`);
    } else if (extracted.type === "assistant") {
      handlers.onAssistantText?.(extracted.text);
      diagnostic("Assistant text event received.");
    }
  };

  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    handlers.onMicrophoneStatus?.("granted");
    status("Microphone access granted.");
    diagnostic("Added local audio tracks to RTCPeerConnection.");
  }

  status("Creating realtime peer connection offer...");
  diagnostic("Starting SDP offer creation.");
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  diagnostic("SDP offer created and local description set.");

  status("Gathering ICE candidates...");
  await waitForIceGatheringComplete(pc);
  const localSdp = pc.localDescription?.sdp;
  if (!localSdp) {
    throw new Error("Failed to generate local SDP after ICE gathering.");
  }

  const endpoint = realtimeSession.endpoint?.trim() || `https://api.openai.com/v1/realtime?model=${encodeURIComponent(realtimeSession.model)}`;
  trace("rtc.sdp.offer.sent", true);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${realtimeSession.token}`,
        "Content-Type": "application/sdp",
        Accept: "application/sdp",
      },
      body: localSdp,
    });
  } catch (error) {
    trace("rtc.sdp.answer.received", false, error);
    throw error;
  }

  if (!response.ok) {
    const providerErrorBody = await response.text().catch(() => "");
    const providerDiagnostic = {
      ...extractProviderErrorBodyDiagnostic(providerErrorBody, realtimeSession.provider ?? "openai"),
      status: response.status,
    };
    const normalized = normalizeRealtimeError(
      new RealtimeSafeError(`Realtime endpoint request failed: ${response.status} ${response.statusText}`, providerDiagnostic)
    );
    diagnostic(`Realtime offer request failed with status ${response.status}.`);
    trace("rtc.sdp.answer.received", false, new RealtimeSafeError(normalized.message, normalized.diagnostic));
    throw new RealtimeSafeError(normalized.message, normalized.diagnostic);
  }

  const answerSdp = await response.text();
  trace("rtc.sdp.answer.received", true);
  diagnostic("Received SDP answer from realtime endpoint.");
  try {
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    remoteDescriptionSet = true;
    trace("rtc.remoteDescription.set", true);
    trySendSessionConfig("setRemoteDescription");
    trySendStartupResponse("setRemoteDescription");
    scheduleStartupRetry("setRemoteDescription");
  } catch (error) {
    trace("rtc.remoteDescription.set", false, error);
    throw error;
  }
  status("Realtime peer connection established.");
  handlers.onConnectionState?.(pc.connectionState);

  let speechRecognitionMuted = false;
  const speechRecognition = isAudioMode
    ? createSpeechRecognition(
        (text, isFinal) => {
          handlers.onTranscript?.(text, isFinal);
        },
        errorHandler
      )
    : null;

  if (speechRecognition) {
    speechRecognition.onend = () => {
      if (speechRecognitionMuted) return;
      try {
        speechRecognition.start();
      } catch {
        // ignore restart failures
      }
    };
  }

  status(
    isAudioMode
      ? "Realtime voice session is active. Speak naturally now."
      : "Realtime text discovery is active. Type naturally now."
  );

  const sendText = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return;
    if (!dataChannel || dataChannel.readyState !== "open") {
      errorHandler(new Error("Realtime data channel is not open."));
      return;
    }

    sendRealtimeEvent(
      dataChannel,
      {
        event_id: `user_text_${Date.now()}`,
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: normalized,
            },
          ],
        },
      },
      diagnostic
    );
    sendRealtimeEvent(dataChannel, createResponseEvent(currentOutputModality), diagnostic);
  };

  const setOutputModality = (modality: RealtimeOutputModality) => {
    currentOutputModality = modality;
    diagnostic(`Output modality set to ${modality}.`);
  };

  const speakScriptedLine = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return;
    if (!dataChannel || dataChannel.readyState !== "open") {
      diagnostic("Skipped scripted line: data channel is not open.");
      return;
    }
    sendRealtimeEvent(dataChannel, createScriptedResponseEvent(currentOutputModality, normalized), diagnostic);
  };

  const setMicrophoneMuted = (muted: boolean) => {
    speechRecognitionMuted = muted;
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    pc.getSenders().forEach((sender) => {
      if (sender.track?.kind === "audio") {
        sender.track.enabled = !muted;
      }
    });

    if (speechRecognition) {
      try {
        if (muted) {
          speechRecognition.abort();
        } else {
          speechRecognition.start();
        }
      } catch {
        // ignore recognition state errors
      }
    }

    handlers.onMicrophoneStatus?.(muted ? "muted" : "granted");
    status(muted ? "Microphone muted." : "Microphone unmuted.");
    diagnostic(`Microphone muted=${String(muted)}.`);
  };

  const stop = async () => {
    if (speechRecognition) {
      try {
        speechRecognition.abort();
      } catch {
        // ignore
      }
    }

    localStream?.getTracks().forEach((track) => track.stop());
    pc.getSenders().forEach((sender) => {
      try {
        sender.track?.stop();
      } catch {
        // ignore
      }
    });

    try {
      pc.close();
    } catch {
      // ignore
    }

    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
    }
    status("Realtime voice session stopped.");
  };

  return { stop, sendText, setMicrophoneMuted, setOutputModality, speakScriptedLine };
}
