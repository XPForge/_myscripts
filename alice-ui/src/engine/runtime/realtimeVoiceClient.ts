export type RealtimeSessionConfig = {
  sessionId: string;
  model: string;
  token: string;
  status: "initializing" | "active" | "complete";
  endpoint?: string;
  createdAt: string;
};

export type RealtimeStartupTraceStage =
  | "microphone.permission"
  | "microphone.getUserMedia"
  | "rtc.peerConnection.created"
  | "rtc.dataChannel.created"
  | "rtc.dataChannel.open"
  | "rtc.sdp.offer.sent"
  | "rtc.sdp.answer.received"
  | "rtc.remoteDescription.set"
  | "realtime.responseCreate.sent"
  | "realtime.event.received";

export type RealtimeStartupTraceEvent = {
  stage: RealtimeStartupTraceStage;
  reached: boolean;
  timestamp: string;
  error?: string;
};

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

  const delta = typeof event.delta === "object" && event.delta ? (event.delta as Record<string, unknown>) : null;
  const transcript = typeof event.transcript === "string" ? event.transcript : undefined;
  const text = typeof event.text === "string" ? event.text : undefined;
  const content = delta && typeof delta.content === "string" ? delta.content : undefined;

  if (
    event.type === "response.delta" ||
    event.type === "response.output_text.delta"
  ) {
    if (content) {
      return { type: "assistant", text: content };
    }
  }

  if (event.type === "response.completed" || event.type === "response.output_text.completed") {
    if (content) {
      return { type: "assistant", text: content, isFinal: true };
    }
    if (text) {
      return { type: "assistant", text, isFinal: true };
    }
  }

  if (
    event.type === "transcript.delta" ||
    event.type === "input_transcript.delta" ||
    event.type === "response.output_audio_transcript.delta"
  ) {
    if (content) {
      return { type: "transcript", text: content, isFinal: false };
    }
  }

  if (
    event.type === "transcript.final" ||
    event.type === "input_transcript" ||
    event.type === "response.output_audio_transcript"
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
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Microphone permission was denied. Allow microphone access for this site in your browser, then restart the discovery session.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No microphone was found. Connect or enable a microphone, then restart the discovery session.";
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "The microphone is already in use or cannot be read. Close other apps using the microphone, then restart the discovery session.";
    }
  }

  return error instanceof Error ? error.message : "Unable to access the microphone.";
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

function createStartupResponseEvent() {
  return {
    type: "response.create",
    response: {
      modalities: ["audio", "text"],
      instructions:
        "Begin the Lighthouse Discovery session now using the session instructions. Open with the configured opening behavior and one broad, human-centered question. Do not wait for participant input.",
    },
  };
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

export async function startRealtimeVoiceSession(
  realtimeSession: RealtimeSessionConfig,
  handlers: RealtimeVoiceHandlers
): Promise<RealtimeVoiceClient> {
  if (!navigator.mediaDevices?.getUserMedia) {
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
    handlers.onError?.(error);
    handlers.onDiagnosticLog?.(`ERROR: ${error.message}`);
  };
  const diagnostic = (message: string) => {
    handlers.onDiagnosticLog?.(`DEBUG: ${message}`);
  };
  const trace = (
    stage: RealtimeStartupTraceStage,
    reached: boolean,
    error?: unknown
  ) => {
    const message = error instanceof Error ? error.message : error ? String(error) : undefined;
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
      "realtime.responseCreate.sent",
      "realtime.event.received",
    ];
    stages.forEach((stage) => {
      handlers.onStartupTrace?.({ stage, reached: false, timestamp });
    });
  };

  initializeTrace();
  status("Requesting microphone access...");
  handlers.onMicrophoneStatus?.("pending");
  let localStream: MediaStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    trace("microphone.permission", true);
    trace("microphone.getUserMedia", true);
  } catch (error) {
    handlers.onMicrophoneStatus?.("denied");
    trace("microphone.permission", false, describeMicrophoneError(error));
    trace("microphone.getUserMedia", false, describeMicrophoneError(error));
    throw new Error(describeMicrophoneError(error));
  }

  const audioElement = new Audio();
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
  let startupResponseSent = false;
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

    const event = createStartupResponseEvent();
    diagnostic(`Startup response.create payload: ${JSON.stringify(event)}`);
    const sent = sendRealtimeEvent(dataChannel, event, diagnostic);
    startupResponseSent = sent;
    trace(
      "realtime.responseCreate.sent",
      sent,
      sent ? undefined : `Data channel state was ${dataChannel.readyState}.`
    );
  };

  pc.ontrack = (event) => {
    diagnostic("Received remote audio track from realtime peer connection.");
    if (event.streams && event.streams[0]) {
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
      return;
    }

    const extracted = extractTextFromEvent(parsed);
    if (!extracted) {
      return;
    }

    if (extracted.type === "transcript") {
      handlers.onTranscript?.(extracted.text, Boolean(extracted.isFinal));
      diagnostic(`Transcript event: ${extracted.text} (final=${Boolean(extracted.isFinal)})`);
    } else if (extracted.type === "assistant") {
      handlers.onAssistantText?.(extracted.text);
      diagnostic(`Assistant event: ${extracted.text}`);
    }
  };

  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  handlers.onMicrophoneStatus?.("granted");
  status("Microphone access granted.");
  diagnostic("Added local audio tracks to RTCPeerConnection.");

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
    const responseText = await response.text();
    diagnostic(`Realtime offer request failed with status ${response.status}.`);
    trace("rtc.sdp.answer.received", false, `${response.status} ${response.statusText} ${responseText}`);
    throw new Error(`Realtime endpoint request failed: ${response.status} ${response.statusText} ${responseText}`);
  }

  const answerSdp = await response.text();
  trace("rtc.sdp.answer.received", true);
  diagnostic("Received SDP answer from realtime endpoint.");
  try {
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    remoteDescriptionSet = true;
    trace("rtc.remoteDescription.set", true);
    trySendStartupResponse("setRemoteDescription");
  } catch (error) {
    trace("rtc.remoteDescription.set", false, error);
    throw error;
  }
  status("Realtime peer connection established.");
  handlers.onConnectionState?.(pc.connectionState);

  const speechRecognition = createSpeechRecognition(
    (text, isFinal) => {
      handlers.onTranscript?.(text, isFinal);
    },
    errorHandler
  );

  status("Realtime voice session is active. Speak naturally now.");

  const stop = async () => {
    if (speechRecognition) {
      try {
        speechRecognition.abort();
      } catch {
        // ignore
      }
    }

    localStream.getTracks().forEach((track) => track.stop());
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

    audioElement.pause();
    audioElement.srcObject = null;
    status("Realtime voice session stopped.");
  };

  return { stop };
}
