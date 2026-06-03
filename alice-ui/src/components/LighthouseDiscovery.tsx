import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  createLighthouseProfile,
  loadLighthouseProfile,
  persistLighthouseProfile,
  updateLighthouseProfile,
  type AIMessage,
  type LighthouseProfile,
} from "../services/lighthouseProfile";
import {
  loadLighthouseSession,
  persistLighthouseSession,
  clearLighthouseSession,
  type LighthouseSession,
} from "../services/lighthouseSession";
import {
  requestRealtimeDiscoverySession,
  isRealtimeDiscoveryConfigured,
} from "../ai/lighthouseDiscoveryService";
import {
  startRealtimeVoiceDiscovery,
  type RealtimeOutputModality,
  type RealtimeStartupTraceEvent,
  type RealtimeStartupTraceStage,
  type RealtimeVoiceClient,
} from "../ai/realtimeVoiceDiscoveryClient";

type LighthouseDiscoveryProps = {
  onComplete: () => void;
};

type Step = "capture" | "launching" | "discovering";

const STARTUP_TRACE_STAGES: { stage: RealtimeStartupTraceStage; label: string }[] = [
  { stage: "microphone.permission", label: "1. Microphone permission" },
  { stage: "microphone.getUserMedia", label: "2. getUserMedia" },
  { stage: "rtc.peerConnection.created", label: "3. RTCPeerConnection created" },
  { stage: "rtc.dataChannel.created", label: "4. Data channel created" },
  { stage: "rtc.dataChannel.open", label: "5. Data channel open" },
  { stage: "rtc.sdp.offer.sent", label: "6. SDP offer sent" },
  { stage: "rtc.sdp.answer.received", label: "7. SDP answer received" },
  { stage: "rtc.remoteDescription.set", label: "8. setRemoteDescription" },
  { stage: "realtime.session.created", label: "9. session.created received" },
  { stage: "realtime.responseCreate.sent", label: "10. response.create sent" },
  { stage: "realtime.event.received", label: "11. Realtime event received" },
];

function emptyStartupTrace() {
  return Object.fromEntries(
    STARTUP_TRACE_STAGES.map(({ stage }) => [
      stage,
      {
        stage,
        reached: false,
        timestamp: "",
      },
    ])
  ) as Record<RealtimeStartupTraceStage, RealtimeStartupTraceEvent>;
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

export default function LighthouseDiscovery({ onComplete }: LighthouseDiscoveryProps) {
  const [step, setStep] = useState<Step>("capture");
  const [profile, setProfile] = useState<LighthouseProfile | null>(null);
  const [session, setSession] = useState<LighthouseSession | null>(null);
  const [voiceClient, setVoiceClient] = useState<RealtimeVoiceClient | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [connectionState, setConnectionState] = useState("");
  const [tokenStatus, setTokenStatus] = useState("idle");
  const [microphoneStatus, setMicrophoneStatus] = useState("pending");
  const [audioStatus, setAudioStatus] = useState("pending");
  const [dataChannelStatus, setDataChannelStatus] = useState("pending");
  const [transcriptCount, setTranscriptCount] = useState(0);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [startupTrace, setStartupTrace] = useState(emptyStartupTrace);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState<RealtimeOutputModality>("audio");
  const [typedParticipantText, setTypedParticipantText] = useState("");
  const [modeSwitching, setModeSwitching] = useState(false);
  const profileRef = useRef<LighthouseProfile | null>(null);
  const sessionRef = useRef<LighthouseSession | null>(null);

  useEffect(() => {
    const storedSession = loadLighthouseSession();
    if (!storedSession) return;

    const existingProfile = loadLighthouseProfile(storedSession.profileId);
    if (!existingProfile) {
      clearLighthouseSession();
      return;
    }

    setProfile(existingProfile);
    setSession(storedSession);
    setName(storedSession.name);
    setEmail(storedSession.email);
    setDiscoveryMode(storedSession.metadata?.outputModality === "text" ? "text" : "audio");
    const restoredStep = storedSession.step === "discovering" ? "discovering" : "capture";
    setStep(restoredStep);

    if (restoredStep === "discovering") {
      setResumeAvailable(true);
      setStatusMessage(
        "Restored your active discovery session. Click Resume to reconnect the microphone and continue."
      );
    } else {
      setStatusMessage("Restored your saved discovery session.");
    }
  }, []);

  useEffect(() => {
    profileRef.current = profile;
    if (!profile) return;
    persistLighthouseProfile(profile);
  }, [profile]);

  useEffect(() => {
    sessionRef.current = session;
    if (!session) return;
    persistLighthouseSession(session);
  }, [session]);

  useEffect(() => {
    return () => {
      if (voiceClient) {
        void voiceClient.stop();
      }
    };
  }, [voiceClient]);

  const saveSession = (updates: Partial<LighthouseSession>) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return null;
    const next: LighthouseSession = {
      ...currentSession,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    sessionRef.current = next;
    setSession(next);
    return next;
  };

  const addDiagnosticLog = (message: string) => {
    setDiagnosticLogs((prev) => [
      `${new Date().toISOString()} - ${message}`,
      ...prev,
    ].slice(0, 60));
  };

  const recordStartupTrace = (event: RealtimeStartupTraceEvent) => {
    setStartupTrace((prev) => ({
      ...prev,
      [event.stage]: event,
    }));
  };

  const resetStartupTrace = () => {
    setStartupTrace(emptyStartupTrace());
  };

  const checkMicrophoneAccess = async () => {
    setErrorMessage("");
    setStatusMessage("Checking microphone access...");
    setMicrophoneStatus("pending");
    addDiagnosticLog("Checking microphone access without starting Realtime.");

    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "Microphone capture is not supported by this browser.";
      setMicrophoneStatus("unsupported");
      setErrorMessage(message);
      addDiagnosticLog(message);
      return;
    }

    try {
      try {
        const permission = await navigator.permissions?.query?.({ name: "microphone" as PermissionName });
        addDiagnosticLog(`Browser microphone permission state: ${permission?.state ?? "unknown"}.`);
      } catch (error) {
        addDiagnosticLog(`Browser microphone permission query unavailable: ${error instanceof Error ? error.message : String(error)}.`);
      }

      const devicesBefore = await navigator.mediaDevices.enumerateDevices();
      addDiagnosticLog(`Audio input devices before permission: ${devicesBefore.filter((device) => device.kind === "audioinput").length}.`);
      const stream = await withTimeout(
        navigator.mediaDevices.getUserMedia({ audio: true }),
        15000,
        "Microphone request timed out. Check for a hidden browser permission prompt or blocked site permission."
      );
      const tracks = stream.getAudioTracks();
      setMicrophoneStatus("granted");
      addDiagnosticLog(`Microphone preflight succeeded. Audio tracks: ${tracks.length}.`);
      const devicesAfter = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devicesAfter.filter((device) => device.kind === "audioinput");
      addDiagnosticLog(
        `Audio input devices after permission: ${audioInputs.length}. ${audioInputs.map((device) => device.label || "label hidden").join(" | ")}`
      );
      tracks.forEach((track) => track.stop());
      setStatusMessage("Microphone access works. You can start Discovery.");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : "UnknownError";
      const message = error instanceof Error ? error.message : String(error);
      const detail = `Microphone preflight failed: ${name}${message ? ` - ${message}` : ""}`;
      setMicrophoneStatus("failed");
      setErrorMessage(detail);
      addDiagnosticLog(detail);
    }
  };

  const appendUserTranscript = (segment: string, isFinal: boolean) => {
    const currentProfile = profileRef.current;
    const currentSession = sessionRef.current;
    if (!currentProfile || !currentSession || !segment.trim()) return;
    if (!isFinal) {
      setStatusMessage(`Listening: ${segment}`);
      return;
    }
    setTranscriptCount((count) => count + 1);

    const normalized = segment.trim();
    const nextTranscript = `${currentSession.transcript}${currentSession.transcript ? " " : ""}${normalized}`.trim();
    const nextHistory: AIMessage[] = [
      ...currentSession.conversationHistory,
      {
        role: "user",
        content: normalized,
        createdAt: new Date().toISOString(),
      },
    ];

    saveSession({ transcript: nextTranscript, conversationHistory: nextHistory });
    const updatedProfile = updateLighthouseProfile(currentProfile.id, { transcript: nextTranscript });
    if (updatedProfile) {
      profileRef.current = updatedProfile;
      setProfile(updatedProfile);
    }
  };

  const sendTypedParticipantText = () => {
    const normalized = typedParticipantText.trim();
    if (!normalized || !voiceClient) return;
    appendUserTranscript(normalized, true);
    voiceClient.sendText(normalized);
    setTypedParticipantText("");
  };

  const appendAssistantText = (segment: string) => {
    const currentProfile = profileRef.current;
    const currentSession = sessionRef.current;
    if (!currentProfile || !currentSession || !segment.trim()) return;
    const normalized = segment.trim();
    const nextTranscript = `${currentSession.transcript}${currentSession.transcript ? " " : ""}Assistant: ${normalized}`.trim();
    const nextHistory: AIMessage[] = [
      ...currentSession.conversationHistory,
      {
        role: "assistant",
        content: normalized,
        createdAt: new Date().toISOString(),
      },
    ];

    saveSession({ transcript: nextTranscript, conversationHistory: nextHistory });
    const updatedProfile = updateLighthouseProfile(currentProfile.id, { transcript: nextTranscript });
    if (updatedProfile) {
      profileRef.current = updatedProfile;
      setProfile(updatedProfile);
    }
  };

  const getRealtimeFailureMessage = (error: unknown, fallback: string) => {
    if (!(error instanceof Error)) return fallback;
    if (
      error.message.includes("Microphone permission was denied") ||
      error.message.includes("No microphone was found") ||
      error.message.includes("The microphone is already in use")
    ) {
      return error.message;
    }
    return `Realtime session failed: ${error.message}`;
  };

  const isMockRealtimeSession = (realtime: { endpoint?: string }) =>
    realtime.endpoint === "mock://realtime-discovery";

  const createRealtimeHandlers = () => ({
    onStatus: (message: string) => {
      setStatusMessage(message);
      addDiagnosticLog(message);
    },
    onTranscript: appendUserTranscript,
    onAssistantText: appendAssistantText,
    onConnectionState: (state: string) => {
      setConnectionState(state);
      addDiagnosticLog(`Connection state: ${state}`);
    },
    onMicrophoneStatus: setMicrophoneStatus,
    onAudioPlaybackStatus: setAudioStatus,
    onDataChannelStatus: setDataChannelStatus,
    onStartupTrace: recordStartupTrace,
    onDiagnosticLog: addDiagnosticLog,
    onError: (error: Error) => {
      setErrorMessage(error.message);
      addDiagnosticLog(`Error: ${error.message}`);
      setStatusMessage("");
    },
  });

  const switchDiscoveryMode = async (mode: RealtimeOutputModality) => {
    const currentProfile = profileRef.current;
    const currentSession = sessionRef.current;
    if (!currentProfile || !currentSession || modeSwitching) return;
    if (mode === discoveryMode && voiceClient) return;

    setModeSwitching(true);
    setErrorMessage("");
    setStatusMessage(mode === "audio" ? "Switching to voice..." : "Switching to text...");
    setMicrophoneStatus(mode === "audio" ? "pending" : "not required");
    setAudioStatus(mode === "audio" ? "pending" : "text mode");
    setDataChannelStatus("pending");
    setConnectionState("");
    resetStartupTrace();

    try {
      if (voiceClient) {
        await voiceClient.stop();
        setVoiceClient(null);
      }

      setDiscoveryMode(mode);
      const nextSession = saveSession({
        metadata: {
          ...currentSession.metadata,
          outputModality: mode,
        },
      }) ?? currentSession;
      const realtime = await requestRealtimeDiscoverySession(
        currentProfile,
        nextSession.sessionId,
        mode
      );
      addDiagnosticLog(`Token request succeeded for ${mode} mode.`);
      const client = await startRealtimeVoiceDiscovery(realtime, createRealtimeHandlers());
      setVoiceClient(client);
      setStatusMessage(mode === "audio" ? "Voice mode is active." : "Text mode is active.");
    } catch (error) {
      const message = getRealtimeFailureMessage(error, `Unable to switch to ${mode} mode.`);
      setErrorMessage(message);
      addDiagnosticLog(message);
    } finally {
      setModeSwitching(false);
    }
  };

  const startDiscovery = async () => {
    setResumeAvailable(false);
    setErrorMessage("");
    setTokenStatus("pending");
    setMicrophoneStatus("pending");
    setAudioStatus("pending");
    setDataChannelStatus("pending");
    setTranscriptCount(0);
    setDiagnosticLogs([]);
    resetStartupTrace();
    setConnectionState("");
    if (!name.trim() || !email.trim()) {
      setErrorMessage("Please enter your name and email to continue.");
      setTokenStatus("idle");
      return;
    }

    if (!isRealtimeDiscoveryConfigured()) {
      setErrorMessage(
        "Realtime discovery is not configured. Set VITE_OPENAI_REALTIME_TOKEN_ENDPOINT in your environment."
      );
      return;
    }

    const initialMode: RealtimeOutputModality = "audio";
    setDiscoveryMode(initialMode);
    const createdProfile = createLighthouseProfile(name, email);
    profileRef.current = createdProfile;
    setProfile(createdProfile);

    const now = new Date().toISOString();
    const newSession: LighthouseSession = {
      sessionId: `session-${createdProfile.id}`,
      profileId: createdProfile.id,
      lpId: createdProfile.lpId,
      profileType: createdProfile.profileType,
      name: createdProfile.name,
      email: createdProfile.email,
      status: "active",
      discoveryStatus: createdProfile.discoveryStatus,
      discoveryMethod: createdProfile.discoveryMethod,
      conversationHistory: [],
      transcript: "",
      step: "launching",
      metadata: {
        outputModality: initialMode,
      },
      createdAt: now,
      updatedAt: now,
    };

    sessionRef.current = newSession;
    setSession(newSession);
    setStep("launching");
    setStatusMessage("Preparing your realtime voice discovery session...");

    try {
      const realtime = await requestRealtimeDiscoverySession(
        createdProfile,
        newSession.sessionId,
        initialMode
      );
      setTokenStatus("success");
      addDiagnosticLog(
        isMockRealtimeSession(realtime)
          ? "Mock realtime session created. No API token was requested."
          : "Token request succeeded."
      );
      saveSession({
        realtimeSessionId: realtime.sessionId,
        status: "active",
        step: "discovering",
      });
      setStep("discovering");
      setStatusMessage(
        "Connecting your microphone and starting the conversation..."
      );

      const client = await startRealtimeVoiceDiscovery(realtime, createRealtimeHandlers());

      setVoiceClient(client);
    } catch (error) {
      setErrorMessage(getRealtimeFailureMessage(error, "Unable to connect to realtime discovery."));
      setTokenStatus("failed");
      addDiagnosticLog(
        getRealtimeFailureMessage(error, "Unable to connect to realtime discovery.")
      );
      saveSession({ status: "paused", step: "capture" });
      setStep("capture");
      setStatusMessage("");
    }
  };

  const resumeDiscovery = async () => {
    const currentProfile = profileRef.current;
    const currentSession = sessionRef.current;
    if (!currentProfile) {
      setErrorMessage("Unable to resume discovery: missing profile.");
      return;
    }
    if (!currentSession) {
      setErrorMessage("Unable to resume discovery: missing session.");
      return;
    }
    setErrorMessage("");
    setStatusMessage("Reconnecting your realtime voice discovery session...");
    setMicrophoneStatus("pending");
    setAudioStatus("pending");
    setDataChannelStatus("pending");
    resetStartupTrace();
    addDiagnosticLog("Attempting realtime resume.");

    try {
      const mode = currentSession.metadata?.outputModality === "text" ? "text" : discoveryMode;
      setDiscoveryMode(mode);
      const realtime = await requestRealtimeDiscoverySession(
        currentProfile,
        currentSession.sessionId,
        mode
      );
      setTokenStatus("success");
      addDiagnosticLog(
        isMockRealtimeSession(realtime)
          ? "Mock realtime session resumed. No API token was requested."
          : "Token request succeeded for resume."
      );
      saveSession({
        realtimeSessionId: realtime.sessionId,
        status: "active",
        step: "discovering",
      });
      setStep("discovering");
      setResumeAvailable(false);

      const client = await startRealtimeVoiceDiscovery(realtime, createRealtimeHandlers());

      setVoiceClient(client);
      setStatusMessage("Realtime discovery resumed. Speak naturally now.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to resume realtime discovery: ${error.message}`
          : "Unable to reconnect to realtime discovery."
      );
      setTokenStatus("failed");
      addDiagnosticLog(
        error instanceof Error
          ? `Unable to resume realtime discovery: ${error.message}`
          : "Unable to reconnect to realtime discovery."
      );
      setResumeAvailable(true);
      setStatusMessage("Click Resume to try reconnecting again.");
    }
  };

  const stopDiscovery = async () => {
    if (voiceClient) {
      await voiceClient.stop();
      setVoiceClient(null);
    }

    const currentSession = sessionRef.current;
    if (currentSession) {
      saveSession({ status: "paused", step: "capture" });
    }

    setResumeAvailable(false);
    setStep("capture");
    setStatusMessage("Realtime discovery stopped. You can restart when ready.");
  };

  const resetDiscoverySession = async () => {
    if (voiceClient) {
      await voiceClient.stop();
      setVoiceClient(null);
    }

    clearLighthouseSession();
    profileRef.current = null;
    sessionRef.current = null;
    setProfile(null);
    setSession(null);
    setStep("capture");
    setResumeAvailable(false);
    setErrorMessage("");
    setConnectionState("");
    setTokenStatus("idle");
    setMicrophoneStatus("pending");
    setAudioStatus("pending");
    setDataChannelStatus("pending");
    setTranscriptCount(0);
    setDiagnosticLogs([]);
    resetStartupTrace();
    setTypedParticipantText("");
    setModeSwitching(false);
    setDiscoveryMode("audio");
    setStatusMessage("Previous discovery session cleared. Start a new session when ready.");
  };

  const renderCard = (content: ReactNode) => (
    <div
      style={{
        width: "100%",
        maxWidth: "840px",
        margin: "0 auto",
        padding: "26px",
        borderRadius: "28px",
        background: "rgba(10,18,39,0.96)",
        border: "1px solid rgba(84,105,255,0.12)",
        boxShadow: "0 32px 100px rgba(1,10,29,0.32)",
      }}
    >
      {content}
    </div>
  );

  const renderMessage = () =>
    errorMessage ? (
      <div
        style={{
          marginTop: "16px",
          padding: "14px 16px",
          borderRadius: "16px",
          background: "rgba(153,27,27,0.12)",
          border: "1px solid rgba(248,113,113,0.25)",
          color: "#fee2e2",
          lineHeight: 1.6,
        }}
      >
        {errorMessage}
      </div>
    ) : statusMessage ? (
      <div
        style={{
          marginTop: "16px",
          padding: "14px 16px",
          borderRadius: "16px",
          background: "rgba(30,41,59,0.88)",
          border: "1px solid rgba(96,165,250,0.18)",
          color: "#cbd5e1",
          lineHeight: 1.6,
        }}
      >
        {statusMessage}
      </div>
    ) : null;

  const renderDiagnosticsPanel = () => (
    <div
      style={{
        marginTop: "18px",
        padding: "18px",
        borderRadius: "20px",
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(59,130,246,0.18)",
        color: "#cbd5e1",
        fontSize: "0.92rem",
        lineHeight: 1.6,
      }}
    >
      <div style={{ marginBottom: "14px", fontWeight: 700, color: "#eef2ff" }}>
        Voice Validation Panel
      </div>
      <div style={{ display: "grid", gap: "10px" }}>
        <div><strong>Token Status:</strong> {tokenStatus}</div>
        <div><strong>Session Mode:</strong> {discoveryMode}</div>
        <div><strong>Microphone State:</strong> {microphoneStatus}</div>
        <div><strong>Realtime Connection:</strong> {connectionState || "pending"}</div>
        <div><strong>Audio Playback:</strong> {audioStatus}</div>
        <div><strong>Data Channel:</strong> {dataChannelStatus}</div>
        <div><strong>Transcript Count:</strong> {transcriptCount}</div>
        <div>
          <strong>Last Successful Startup Step:</strong>{" "}
          {STARTUP_TRACE_STAGES
            .filter(({ stage }) => startupTrace[stage].reached)
            .at(-1)?.label ?? "none"}
        </div>
      </div>
      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gap: "8px",
        }}
      >
        {STARTUP_TRACE_STAGES.map(({ stage, label }) => {
          const event = startupTrace[stage];
          return (
            <div
              key={stage}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(180px, 1.2fr) minmax(86px, 0.45fr) minmax(190px, 1fr)",
                gap: "10px",
                alignItems: "start",
                padding: "10px 12px",
                borderRadius: "12px",
                background: event.reached ? "rgba(22,101,52,0.16)" : "rgba(51,65,85,0.28)",
                border: event.error
                  ? "1px solid rgba(248,113,113,0.35)"
                  : event.reached
                    ? "1px solid rgba(74,222,128,0.2)"
                    : "1px solid rgba(148,163,184,0.08)",
              }}
            >
              <div>
                <strong>{label}</strong>
                <div style={{ color: "rgba(203,213,225,0.62)", fontSize: "0.8rem" }}>
                  {stage}
                </div>
              </div>
              <div>
                <strong>reached:</strong> {String(event.reached)}
              </div>
              <div>
                <div><strong>timestamp:</strong> {event.timestamp || "not recorded"}</div>
                <div><strong>error:</strong> {event.error || "none"}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: "16px",
          padding: "14px",
          borderRadius: "16px",
          background: "rgba(7,12,20,0.9)",
          border: "1px solid rgba(96,165,250,0.1)",
          maxHeight: "220px",
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {diagnosticLogs.length === 0 ? "Diagnostics will appear here." : diagnosticLogs.join("\n")}
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "calc(100vh - 52px)",
        width: "100%",
        padding: "24px 16px 36px",
        overflowX: "hidden",
        background: "radial-gradient(circle at top, rgba(31,41,55,0.7), transparent 18%), #020617",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1080px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "10px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              fontSize: "clamp(2rem, 3.5vw, 3.8rem)",
              fontWeight: 900,
              color: "#f8fafc",
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
            }}
          >
            Lighthouse Discovery
          </div>
          <div
            style={{
              maxWidth: "760px",
              fontSize: "1rem",
              color: "rgba(226,232,240,0.9)",
              lineHeight: 1.8,
            }}
          >
            Lighthouse Discovery is a voice-first experience. Enter your name and email, then speak naturally once the realtime session launches.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" }}>
          {session && (
            <button
              type="button"
              onClick={resetDiscoverySession}
              style={{
                padding: "16px 20px",
                borderRadius: "18px",
                border: "1px solid rgba(248,113,113,0.35)",
                background: "rgba(127,29,29,0.18)",
                color: "#fecaca",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Reset session
            </button>
          )}
        </div>

        {step === "capture" &&
          renderCard(
            <>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
                Enter your name and email
              </div>
              <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  style={{
                    width: "100%",
                    borderRadius: "16px",
                    border: "1px solid rgba(148,163,184,0.14)",
                    background: "rgba(255,255,255,0.02)",
                    color: "#eef2ff",
                    padding: "14px 16px",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  style={{
                    width: "100%",
                    borderRadius: "16px",
                    border: "1px solid rgba(148,163,184,0.14)",
                    background: "rgba(255,255,255,0.02)",
                    color: "#eef2ff",
                    padding: "14px 16px",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
                <button
                  type="button"
                  onClick={() => void checkMicrophoneAccess()}
                  style={{
                    padding: "14px 20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(148,163,184,0.18)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#e2e8f0",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Check microphone
                </button>
                <button
                  type="button"
                  onClick={startDiscovery}
                  style={{
                    padding: "14px 20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(59,130,246,0.45)",
                    background: "linear-gradient(180deg, rgba(59,130,246,0.22), rgba(14,165,233,0.18))",
                    color: "#eef2ff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Start Your Discovery Session
                </button>
              </div>
              {renderMessage()}
              {renderDiagnosticsPanel()}
            </>
          )}

        {step === "launching" &&
          renderCard(
            <>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
                Launching realtime discovery
              </div>
              <div style={{ color: "rgba(226,232,240,0.9)", lineHeight: 1.8, marginTop: "12px" }}>
                We are creating your profile record and preparing the OpenAI Realtime session.
              </div>
              <div
                style={{
                  marginTop: "18px",
                  padding: "18px",
                  borderRadius: "20px",
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(59,130,246,0.18)",
                  color: "#cbd5e1",
                  fontSize: "0.95rem",
                }}
              >
                {statusMessage || "Preparing your realtime voice session..."}
              </div>
              {renderDiagnosticsPanel()}
              {renderMessage()}
            </>
          )}

        {step === "discovering" && profile && session &&
          renderCard(
            <>
              <div style={{ display: "grid", gap: "14px" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
                  Realtime discovery is active
                </div>
                <div style={{ color: "rgba(226,232,240,0.9)", lineHeight: 1.8 }}>
                  {discoveryMode === "audio"
                    ? "Your Lighthouse discovery session is running. Speak or type naturally; the AI will respond with voice."
                    : "Your Lighthouse discovery session is running. Type naturally; switch back to voice any time."}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  {(["audio", "text"] as RealtimeOutputModality[]).map((mode) => {
                    const active = discoveryMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => void switchDiscoveryMode(mode)}
                        disabled={modeSwitching || active}
                        aria-pressed={active}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "12px",
                          border: active
                            ? "1px solid rgba(96,165,250,0.58)"
                            : "1px solid rgba(148,163,184,0.14)",
                          background: active ? "rgba(59,130,246,0.24)" : "rgba(255,255,255,0.02)",
                          color: active ? "#e0f2fe" : "#cbd5e1",
                          fontWeight: 800,
                          cursor: modeSwitching || active ? "not-allowed" : "pointer",
                        }}
                      >
                        {mode === "audio" ? "Voice response" : "Text response"}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {resumeAvailable && !voiceClient ? (
                    <button
                      type="button"
                      onClick={resumeDiscovery}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "14px",
                        border: "1px solid rgba(59,130,246,0.45)",
                        background: "rgba(59,130,246,0.22)",
                        color: "#eef2ff",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Resume discovery
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={stopDiscovery}
                        style={{
                          padding: "12px 16px",
                          borderRadius: "14px",
                          border: "1px solid rgba(59,130,246,0.45)",
                          background: "rgba(59,130,246,0.22)",
                          color: "#eef2ff",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Stop discovery
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await stopDiscovery();
                          onComplete();
                        }}
                        style={{
                          padding: "12px 16px",
                          borderRadius: "14px",
                          border: "1px solid rgba(148,163,184,0.18)",
                          background: "rgba(255,255,255,0.04)",
                          color: "#e2e8f0",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Finish discovery
                      </button>
                    </>
                  )}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(150px, 0.34fr) minmax(0, 1fr)",
                    gap: "14px",
                    alignItems: "start",
                  }}
                >
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "18px",
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(59,130,246,0.18)",
                    color: "#cbd5e1",
                    fontSize: "0.86rem",
                    lineHeight: 1.55,
                  }}
                >
                  <strong>Name:</strong> {profile.name}
                  <br />
                  <strong>Email:</strong> {profile.email}
                  <br />
                  <strong>LP ID:</strong> {profile.lpId}
                  <br />
                  <strong>Session:</strong> {session.status}
                  <br />
                  <strong>Method:</strong> {profile.discoveryMethod}
                  <br />
                  <strong>Mode:</strong> {discoveryMode}
                  <br />
                  <strong>Realtime connection:</strong> {connectionState || "pending"}
                </div>
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(148,163,184,0.14)",
                    color: "#e2e8f0",
                    minHeight: "320px",
                    maxHeight: "42vh",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontSize: "0.95rem",
                    lineHeight: 1.65,
                  }}
                >
                  {session.transcript || "Realtime transcript will appear here as the conversation progresses."}
                </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                  }}
                >
                  <textarea
                    value={typedParticipantText}
                    onChange={(event) => setTypedParticipantText(event.target.value)}
                    placeholder="Type your response"
                    rows={4}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      borderRadius: "16px",
                      border: "1px solid rgba(148,163,184,0.18)",
                      background: "rgba(255,255,255,0.03)",
                      color: "#eef2ff",
                      padding: "14px 16px",
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={sendTypedParticipantText}
                      disabled={!typedParticipantText.trim() || !voiceClient}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "14px",
                        border: "1px solid rgba(59,130,246,0.42)",
                        background: typedParticipantText.trim() && voiceClient
                          ? "rgba(59,130,246,0.24)"
                          : "rgba(71,85,105,0.22)",
                        color: "#e0f2fe",
                        fontWeight: 800,
                        cursor: typedParticipantText.trim() && voiceClient ? "pointer" : "not-allowed",
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
                {renderMessage()}
                {renderDiagnosticsPanel()}
              </div>
            </>
          )}
      </div>
    </div>
  );
}
