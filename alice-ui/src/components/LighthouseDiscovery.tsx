import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createLighthouseProfile,
  deleteLighthouseProfile,
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
  REALTIME_VOICE_OPTIONS,
  requestRealtimeDiscoverySession,
  isRealtimeDiscoveryConfigured,
  type RealtimeVoiceId,
} from "../ai/lighthouseDiscoveryService";
import {
  startRealtimeVoiceDiscovery,
  normalizeRealtimeError,
  type RealtimeOutputModality,
  type RealtimeStartupTraceEvent,
  type RealtimeStartupTraceStage,
  type RealtimeVoiceClient,
} from "../ai/realtimeVoiceDiscoveryClient";
import {
  computeSchemaCoverage,
  type SchemaCoverageReport,
} from "../services/legacyKeywordSchemaCoverage";
import { DISCOVERY_FIELD_LABELS } from "../services/discoverySchemaTracker";
import { authorLighthouseProfile, type AuthorProfileResult } from "../services/profileAuthoringClient";
import { useAuth } from "../context/AuthContext";
import { ConcentricProgressRings } from "./shared/ConcentricProgressRings";

// Debug tooling below is gated to this single account and must never be
// exposed to participants.
const DEBUG_TOOLS_ACCOUNT_EMAIL = "humancapabilityprofile@gmail.com";

const SAMPLE_TEST_TRANSCRIPT =
  "Assistant: What motivates you in your work? You: What motivates me most is solving something nobody else has cracked yet — I'm deeply motivated when I can see the impact of what I built. On the other hand, I get frustrated by unclear priorities, and it frustrates me when decisions keep changing. I learn best by building something small and breaking it, that's my learning style. When I hit a hard bug I try to figure out the smallest reproduction, then troubleshoot from there. I try to explain things simply to others, and I make sure I listen before I respond. I've had to lead a small team before, and I mentor a couple of junior engineers now. I do my best work as a team, and I love how collaborative a good sprint can feel. I thrive when the goals are clear and I'm energized by fast feedback loops. I struggle when I'm micromanaged, and I get drained by constant context switching. I adapt fairly fast when things change, even when a project pivots halfway through. Under pressure, especially near a deadline, I get very focused. There's an opportunity I'd like to explore in more technical leadership. One thing that's often overlooked about me is how much of the groundwork I do that nobody sees — it's a bit of a hidden strength. For example, last quarter I quietly rebuilt our deploy pipeline; for instance, that cut release time in half. Somewhere in this conversation I realized I care more about enabling others than I first said, and I noticed that pattern repeating.";

const debugButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: "10px",
  border: "1px solid rgba(251,191,36,0.28)",
  background: "rgba(120,53,15,0.22)",
  color: "#fde68a",
  fontWeight: 700,
  fontSize: "0.8rem",
  cursor: "pointer",
};

type LighthouseDiscoveryProps = {
  onComplete: () => void;
};

type Step = "capture" | "launching" | "discovering" | "reviewing";
type ReviewPhase = "decide" | "authoring" | "authored" | "error";
type ExportFormat = "pdf" | "docx" | "text" | "other";

const CHECKPOINT_ANNOUNCEMENT_TEXT =
  "We've covered a lot of good ground so far. You're welcome to keep going if there's more you'd like to share, or we can wrap up here whenever you're ready — that's entirely your call.";

const VOICE_STORAGE_KEY = "alice.lighthouse.realtimeVoice";
const DEFAULT_REALTIME_VOICE: RealtimeVoiceId = "cedar";

function loadSavedRealtimeVoice(): RealtimeVoiceId {
  try {
    const saved = localStorage.getItem(VOICE_STORAGE_KEY);
    return REALTIME_VOICE_OPTIONS.some((voice) => voice.id === saved)
      ? (saved as RealtimeVoiceId)
      : DEFAULT_REALTIME_VOICE;
  } catch {
    return DEFAULT_REALTIME_VOICE;
  }
}

function persistRealtimeVoice(voice: RealtimeVoiceId) {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, voice);
  } catch {
    // ignore storage failure
  }
}

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

const PARTICIPANT_RESPONSE_GUIDANCE = [
  {
    title: "Concrete Example Prompt",
    prompt: "Pick one real example. What happened?",
  },
  {
    title: "Outcome Prompt",
    prompt: "What changed because of what you did?",
  },
  {
    title: "Observation Prompt",
    prompt: "What did you notice first that others may have missed?",
  },
  {
    title: "Action Prompt",
    prompt: "What did you actually change, build, fix, redesign, explain, or test?",
  },
  {
    title: "Thinking Pattern Prompt",
    prompt: "What does this example reveal about how you think or solve problems?",
  },
  {
    title: "Team / Influence Prompt",
    prompt: "How did you help other people understand, follow, trust, or use the change?",
  },
  {
    title: "Friction Prompt",
    prompt: "What made the situation difficult, messy, unclear, or misunderstood?",
  },
  {
    title: "Evidence Prompt",
    prompt: "What proof, number, reaction, result, or before/after difference shows that it mattered?",
  },
] as const;

const SECURITY_STATUS_ITEMS = [
  ["Credential source", "server-issued temporary credential"],
  ["Secrets exposed", "no"],
  ["Transcript storage", "local/user-controlled"],
  ["Error handling", "redacted"],
] as const;

function redactSensitiveDiagnostic(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-[redacted]")
    .replace(
      /\b(secret|token|authorization|bearer|api[_-]?key|client[_-]?secret|credential|key)\b\s*[:=]\s*["']?[^"',\s}]+/gi,
      "$1=[redacted]"
    );
}

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

function CollapsiblePanel({
  title,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        padding: "14px",
        borderRadius: "18px",
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(59,130,246,0.18)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          color: "#e2e8f0",
          fontSize: "0.86rem",
          fontWeight: 800,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span>{title}</span>
        <span style={{ color: "#94a3b8", fontSize: "1rem" }}>{collapsed ? "+" : "−"}</span>
      </button>
      {!collapsed && <div style={{ marginTop: "12px" }}>{children}</div>}
    </div>
  );
}

export default function LighthouseDiscovery({ onComplete }: LighthouseDiscoveryProps) {
  const auth = useAuth();
  const isDebugAccount = auth.user?.email === DEBUG_TOOLS_ACCOUNT_EMAIL;
  const [debugBypassIntro, setDebugBypassIntro] = useState(false);
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
  const [securityStatus, setSecurityStatus] = useState({
    provider: "openai",
    discoveryModeId: "native-discovery-realtime2-v0.1",
    credentialIssued: false,
    credentialExpiresAt: null as number | string | null,
  });
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState<RealtimeOutputModality>("audio");
  const [realtimeVoice, setRealtimeVoice] = useState<RealtimeVoiceId>(() => loadSavedRealtimeVoice());
  const [typedParticipantText, setTypedParticipantText] = useState("");
  const [modeSwitching, setModeSwitching] = useState(false);
  const [startInProgress, setStartInProgress] = useState(false);
  const [microphoneMuted, setMicrophoneMuted] = useState(false);
  const [checkpointAnnounced, setCheckpointAnnounced] = useState(false);
  const [reviewPhase, setReviewPhase] = useState<ReviewPhase>("decide");
  const [authoredProfile, setAuthoredProfile] = useState<AuthorProfileResult | null>(null);
  const [authoringError, setAuthoringError] = useState("");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("text");
  const [otherFormatDescription, setOtherFormatDescription] = useState("");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [deliveryRequested, setDeliveryRequested] = useState(false);
  const [allowDevelopmentCopy, setAllowDevelopmentCopy] = useState(false);
  const [progressPanelCollapsed, setProgressPanelCollapsed] = useState(false);
  const [sessionInfoPanelCollapsed, setSessionInfoPanelCollapsed] = useState(false);
  const [quickActionsPanelCollapsed, setQuickActionsPanelCollapsed] = useState(false);
  const profileRef = useRef<LighthouseProfile | null>(null);
  const sessionRef = useRef<LighthouseSession | null>(null);
  const startInProgressRef = useRef(false);

  const participantTurnCount = session?.conversationHistory.filter((message) => message.role === "user").length ?? 0;
  const schemaCoverage: SchemaCoverageReport = useMemo(
    () => computeSchemaCoverage(session?.transcript ?? "", participantTurnCount),
    [session?.transcript, participantTurnCount]
  );

  useEffect(() => {
    if (!voiceClient || discoveryMode !== "audio") return;
    if (checkpointAnnounced) return;
    if (schemaCoverage.profileReadinessPercentage < 100) return;
    voiceClient.speakScriptedLine(CHECKPOINT_ANNOUNCEMENT_TEXT);
    setCheckpointAnnounced(true);
    addDiagnosticLog("Checkpoint announcement spoken: schema readiness reached 100%.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceClient, discoveryMode, checkpointAnnounced, schemaCoverage.profileReadinessPercentage]);

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
    if (typeof storedSession.metadata?.realtimeVoice === "string") {
      const storedVoice = storedSession.metadata.realtimeVoice;
      if (REALTIME_VOICE_OPTIONS.some((voice) => voice.id === storedVoice)) {
        setRealtimeVoice(storedVoice as RealtimeVoiceId);
        persistRealtimeVoice(storedVoice as RealtimeVoiceId);
      }
    }
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
    const safeMessage = redactSensitiveDiagnostic(message);
    setDiagnosticLogs((prev) => [
      `${new Date().toISOString()} - ${safeMessage}`,
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

  const handleRealtimeVoiceChange = (voice: RealtimeVoiceId) => {
    setRealtimeVoice(voice);
    persistRealtimeVoice(voice);
    saveSession({
      metadata: {
        ...(sessionRef.current?.metadata ?? {}),
        realtimeVoice: voice,
      },
    });
    setStatusMessage("Voice selection saved. Restart or resume Discovery to use it.");
  };

  const toggleMicrophoneMuted = () => {
    const nextMuted = !microphoneMuted;
    voiceClient?.setMicrophoneMuted(nextMuted);
    setMicrophoneMuted(nextMuted);
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
    return normalizeRealtimeError(error, fallback).message;
  };

  const addRealtimeErrorDiagnostic = (error: unknown) => {
    const normalized = normalizeRealtimeError(error);
    if (normalized.diagnosticText) {
      addDiagnosticLog(`Realtime error diagnostic: ${normalized.diagnosticText}`);
    }
  };

  const isMockRealtimeSession = (realtime: { endpoint?: string }) =>
    realtime.endpoint === "mock://realtime-discovery";

  const recordCredentialStatus = (realtime: {
    provider?: string;
    discoveryModeId?: string;
    credentialIssued?: boolean;
    credentialExpiresAt?: number | string | null;
  }) => {
    setSecurityStatus({
      provider: realtime.provider ?? "openai",
      discoveryModeId: realtime.discoveryModeId ?? "native-discovery-realtime2-v0.1",
      credentialIssued: realtime.credentialIssued === true,
      credentialExpiresAt: realtime.credentialExpiresAt ?? null,
    });
  };

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
      const normalized = normalizeRealtimeError(error);
      setErrorMessage(normalized.message);
      addDiagnosticLog(`Error: ${normalized.message}`);
      if (normalized.diagnosticText) {
        addDiagnosticLog(`Realtime error diagnostic: ${normalized.diagnosticText}`);
      }
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

    try {
      if (voiceClient) {
        // Reuse the live realtime connection instead of tearing it down and
        // reconnecting: a fresh session pays full, uncached audio-context
        // cost again and throws away everything the conversation built up.
        voiceClient.setOutputModality(mode);
        voiceClient.setMicrophoneMuted(mode === "text");
        setMicrophoneMuted(mode === "text");
        setMicrophoneStatus(mode === "audio" ? "granted" : "not required");
        setAudioStatus(mode === "audio" ? "pending" : "text mode");
        setDiscoveryMode(mode);
        saveSession({
          metadata: {
            ...currentSession.metadata,
            outputModality: mode,
            realtimeVoice,
          },
        });
        setStatusMessage(mode === "audio" ? "Voice mode is active." : "Text mode is active.");
      } else {
        setMicrophoneStatus(mode === "audio" ? "pending" : "not required");
        setAudioStatus(mode === "audio" ? "pending" : "text mode");
        setDataChannelStatus("pending");
        setConnectionState("");
        resetStartupTrace();
        setMicrophoneMuted(false);

        setDiscoveryMode(mode);
        const nextSession = saveSession({
          metadata: {
            ...currentSession.metadata,
            outputModality: mode,
            realtimeVoice,
          },
        }) ?? currentSession;
        const realtime = await requestRealtimeDiscoverySession(
          currentProfile,
          nextSession.sessionId,
          mode,
          realtimeVoice
        );
        recordCredentialStatus(realtime);
        addDiagnosticLog(`Token request succeeded for ${mode} mode.`);
        const client = await startRealtimeVoiceDiscovery(realtime, createRealtimeHandlers(), {
        skipIntro: isDebugAccount && debugBypassIntro,
      });
        setVoiceClient(client);
        setMicrophoneMuted(false);
        setStatusMessage(mode === "audio" ? "Voice mode is active." : "Text mode is active.");
      }
    } catch (error) {
      const message = getRealtimeFailureMessage(error, `Unable to switch to ${mode} mode.`);
      setErrorMessage(message);
      addDiagnosticLog(message);
      addRealtimeErrorDiagnostic(error);
    } finally {
      setModeSwitching(false);
    }
  };

  const startDiscovery = async () => {
    if (startInProgressRef.current) return;
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
        "Realtime discovery is not configured. Set VITE_REALTIME_TOKEN_ENDPOINT in your environment."
      );
      return;
    }

    startInProgressRef.current = true;
    setStartInProgress(true);
    setCheckpointAnnounced(false);
    setReviewPhase("decide");
    setAuthoredProfile(null);
    setAuthoringError("");
    setDeliveryRequested(false);
    setAllowDevelopmentCopy(false);
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
        realtimeVoice,
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
        initialMode,
        realtimeVoice
      );
      recordCredentialStatus(realtime);
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

      const client = await startRealtimeVoiceDiscovery(realtime, createRealtimeHandlers(), {
        skipIntro: isDebugAccount && debugBypassIntro,
      });

      setVoiceClient(client);
      setMicrophoneMuted(false);
    } catch (error) {
      const message = getRealtimeFailureMessage(error, "Unable to connect to realtime discovery.");
      setErrorMessage(message);
      setTokenStatus("failed");
      addDiagnosticLog(message);
      addRealtimeErrorDiagnostic(error);
      saveSession({ status: "paused", step: "capture" });
      setStep("capture");
      setStatusMessage("");
    } finally {
      startInProgressRef.current = false;
      setStartInProgress(false);
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
        mode,
        realtimeVoice
      );
      recordCredentialStatus(realtime);
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

      const client = await startRealtimeVoiceDiscovery(realtime, createRealtimeHandlers(), {
        skipIntro: isDebugAccount && debugBypassIntro,
      });

      setVoiceClient(client);
      setMicrophoneMuted(false);
      setStatusMessage("Realtime discovery resumed. Speak naturally now.");
    } catch (error) {
      const message = getRealtimeFailureMessage(error, "Unable to reconnect to realtime discovery.");
      setErrorMessage(message);
      setTokenStatus("failed");
      addDiagnosticLog(message);
      addRealtimeErrorDiagnostic(error);
      setResumeAvailable(true);
      setStatusMessage("Click Resume to try reconnecting again.");
    }
  };

  const stopDiscovery = async () => {
    if (voiceClient) {
      await voiceClient.stop();
      setVoiceClient(null);
    }
    setMicrophoneMuted(false);

    const currentSession = sessionRef.current;
    if (currentSession) {
      saveSession({ status: "paused", step: "capture" });
    }

    setResumeAvailable(false);
    setStep("capture");
    setStatusMessage("Realtime discovery stopped. You can restart when ready.");
  };

  const openReviewScreen = () => {
    setReviewPhase("decide");
    setAuthoringError("");
    setStep("reviewing");
  };

  const continueDiscoveryFromReview = () => {
    setStep("discovering");
  };

  const generateProfileFromReview = async () => {
    const currentProfile = profileRef.current;
    const currentSession = sessionRef.current;
    if (!currentProfile || !currentSession) return;

    setReviewPhase("authoring");
    setAuthoringError("");

    try {
      const result = await authorLighthouseProfile(currentSession.transcript, currentProfile.name, currentProfile.email, allowDevelopmentCopy);
      setAuthoredProfile(result);
      const updatedProfile = updateLighthouseProfile(currentProfile.id, {
        ...result.fields,
        generatedProfile: result.fields.generatedProfile,
      });
      if (updatedProfile) {
        profileRef.current = updatedProfile;
        setProfile(updatedProfile);
      }
      setDeliveryEmail(currentProfile.email);
      setReviewPhase("authored");
      addDiagnosticLog(`Profile authored by flagship model: ${result.model}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate the profile.";
      setAuthoringError(message);
      setReviewPhase("error");
      addDiagnosticLog(`Profile authoring failed: ${message}`);
    }
  };

  const downloadPlainTextProfile = () => {
    const text = authoredProfile?.fields.generatedProfile;
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${profileRef.current?.lpId ?? "lighthouse-profile"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const requestProfileDelivery = () => {
    const currentProfile = profileRef.current;
    if (!currentProfile) return;
    const formatNote =
      exportFormat === "other" ? otherFormatDescription.trim() || "unspecified format" : exportFormat;
    const updatedProfile = updateLighthouseProfile(currentProfile.id, {
      requestedDeliveryFormat: formatNote,
      requestedDeliveryNote: `Requested delivery to ${deliveryEmail || currentProfile.email} — email delivery is not yet connected; this request has been recorded.`,
    });
    if (updatedProfile) {
      profileRef.current = updatedProfile;
      setProfile(updatedProfile);
    }
    setDeliveryRequested(true);
    addDiagnosticLog(`Delivery requested: format=${formatNote}, email=${deliveryEmail || currentProfile.email} (stubbed — not actually sent).`);
  };

  const debugFillSampleTranscript = () => {
    if (!isDebugAccount) return;
    saveSession({ transcript: SAMPLE_TEST_TRANSCRIPT });
    addDiagnosticLog("DEBUG: sample transcript injected to preview schema coverage states.");
  };

  const resetDiscoverySession = async () => {
    if (voiceClient) {
      await voiceClient.stop();
      setVoiceClient(null);
    }
    setMicrophoneMuted(false);

    if (profileRef.current) {
      deleteLighthouseProfile(profileRef.current.id);
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
    setSecurityStatus({
      provider: "openai",
      discoveryModeId: "native-discovery-realtime2-v0.1",
      credentialIssued: false,
      credentialExpiresAt: null,
    });
    setTypedParticipantText("");
    setModeSwitching(false);
    setDiscoveryMode("audio");
    setCheckpointAnnounced(false);
    setReviewPhase("decide");
    setAuthoredProfile(null);
    setAuthoringError("");
    setExportFormat("text");
    setOtherFormatDescription("");
    setDeliveryEmail("");
    setDeliveryRequested(false);
    setAllowDevelopmentCopy(false);
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
        <div><strong>Assistant Voice:</strong> {realtimeVoice}</div>
        <div><strong>Microphone Muted:</strong> {String(microphoneMuted)}</div>
        <div><strong>Microphone State:</strong> {microphoneStatus}</div>
        <div><strong>Realtime Connection:</strong> {connectionState || "pending"}</div>
        <div><strong>Audio Playback:</strong> {audioStatus}</div>
        <div><strong>Data Channel:</strong> {dataChannelStatus}</div>
        <div><strong>Transcript Count:</strong> {transcriptCount}</div>
        <div><strong>Provider:</strong> {securityStatus.provider}</div>
        <div><strong>Discovery mode:</strong> {securityStatus.discoveryModeId}</div>
        <div><strong>Credential issued:</strong> {String(securityStatus.credentialIssued)}</div>
        <div><strong>Credential expires:</strong> {securityStatus.credentialExpiresAt ?? "not stored"}</div>
        {SECURITY_STATUS_ITEMS.map(([label, value]) => (
          <div key={label}><strong>{label}:</strong> {value}</div>
        ))}
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

        {isDebugAccount &&
          renderCard(
            <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ fontWeight: 800, color: "#fbbf24" }}>
                Developer Tools (visible only to this account)
              </div>
              <label style={{ display: "flex", gap: "8px", alignItems: "center", color: "#cbd5e1", fontSize: "0.86rem" }}>
                <input
                  type="checkbox"
                  checked={debugBypassIntro}
                  onChange={(event) => setDebugBypassIntro(event.target.checked)}
                />
                Bypass Alice's intro on next start (goes straight to the opening question)
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button type="button" onClick={() => void resetDiscoverySession()} style={debugButtonStyle}>
                  Reset Discovery
                </button>
                <button
                  type="button"
                  onClick={debugFillSampleTranscript}
                  disabled={!session}
                  style={{ ...debugButtonStyle, opacity: session ? 1 : 0.5 }}
                >
                  Fill Sample Transcript
                </button>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Jump to step:</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(["capture", "launching", "discovering", "reviewing"] as Step[]).map((debugStep) => (
                  <button
                    key={debugStep}
                    type="button"
                    onClick={() => setStep(debugStep)}
                    disabled={debugStep !== "capture" && (!profile || !session)}
                    aria-pressed={step === debugStep}
                    style={{
                      ...debugButtonStyle,
                      opacity: debugStep !== "capture" && (!profile || !session) ? 0.5 : 1,
                      border: step === debugStep ? "1px solid rgba(251,191,36,0.6)" : debugButtonStyle.border,
                    }}
                  >
                    {debugStep}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Jump to review phase:</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(["decide", "authoring", "authored", "error"] as ReviewPhase[]).map((debugPhase) => (
                  <button
                    key={debugPhase}
                    type="button"
                    onClick={() => {
                      setReviewPhase(debugPhase);
                      setStep("reviewing");
                    }}
                    aria-pressed={reviewPhase === debugPhase && step === "reviewing"}
                    style={{
                      ...debugButtonStyle,
                      border:
                        reviewPhase === debugPhase && step === "reviewing"
                          ? "1px solid rgba(251,191,36,0.6)"
                          : debugButtonStyle.border,
                    }}
                  >
                    {debugPhase}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                <label
                  style={{
                    display: "grid",
                    gap: "8px",
                    color: "#cbd5e1",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                  }}
                >
                  Assistant voice
                  <select
                    value={realtimeVoice}
                    onChange={(event) => handleRealtimeVoiceChange(event.target.value as RealtimeVoiceId)}
                    style={{
                      width: "100%",
                      borderRadius: "16px",
                      border: "1px solid rgba(148,163,184,0.14)",
                      background: "#0f172a",
                      color: "#eef2ff",
                      padding: "14px 16px",
                      fontSize: "1rem",
                      outline: "none",
                    }}
                  >
                    {REALTIME_VOICE_OPTIONS.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.label}
                      </option>
                    ))}
                  </select>
                </label>
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
                  disabled={startInProgress}
                  style={{
                    padding: "14px 20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(59,130,246,0.45)",
                    background: startInProgress
                      ? "rgba(71,85,105,0.22)"
                      : "linear-gradient(180deg, rgba(59,130,246,0.22), rgba(14,165,233,0.18))",
                    color: "#eef2ff",
                    fontWeight: 800,
                    cursor: startInProgress ? "not-allowed" : "pointer",
                  }}
                >
                  Start Your Discovery Session
                </button>
              </div>
              {renderMessage()}
              {isDebugAccount && renderDiagnosticsPanel()}
            </>
          )}

        {step === "launching" &&
          renderCard(
            <>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
                Launching realtime discovery
              </div>
              <div style={{ color: "rgba(226,232,240,0.9)", lineHeight: 1.8, marginTop: "12px" }}>
                We are creating your profile record and preparing the realtime provider session.
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
              {isDebugAccount && renderDiagnosticsPanel()}
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
                  <select
                    value={realtimeVoice}
                    onChange={(event) => handleRealtimeVoiceChange(event.target.value as RealtimeVoiceId)}
                    aria-label="Assistant voice"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(148,163,184,0.14)",
                      background: "#0f172a",
                      color: "#cbd5e1",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {REALTIME_VOICE_OPTIONS.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        Voice: {voice.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 0.4fr) minmax(0, 1fr)",
                    gap: "14px",
                    alignItems: "start",
                  }}
                >
                <div style={{ display: "grid", gap: "12px" }}>
                  <CollapsiblePanel
                    title="Discovery Progress"
                    collapsed={progressPanelCollapsed}
                    onToggle={() => setProgressPanelCollapsed((value) => !value)}
                  >
                    <div style={{ display: "grid", justifyItems: "center", gap: "10px" }}>
                      <ConcentricProgressRings
                        outerPercentage={schemaCoverage.coveragePercentage}
                        innerPercentage={schemaCoverage.profileReadinessPercentage}
                      />
                      <div style={{ display: "grid", gap: "4px", justifyItems: "center", fontSize: "0.78rem", color: "#94a3b8" }}>
                        <span><span style={{ color: "#38bdf8" }}>●</span> Outer: schema coverage</span>
                        <span><span style={{ color: "#a78bfa" }}>●</span> Inner: ready to build profile</span>
                      </div>
                    </div>
                  </CollapsiblePanel>
                  <CollapsiblePanel
                    title="Session Info"
                    collapsed={sessionInfoPanelCollapsed}
                    onToggle={() => setSessionInfoPanelCollapsed((value) => !value)}
                  >
                    <div style={{ color: "#cbd5e1", fontSize: "0.86rem", lineHeight: 1.55 }}>
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
                      <strong>Voice:</strong> {realtimeVoice}
                      <br />
                      <strong>Mic:</strong> {microphoneMuted ? "muted" : "live"}
                      <br />
                      <strong>Realtime connection:</strong> {connectionState || "pending"}
                    </div>
                  </CollapsiblePanel>
                  <CollapsiblePanel
                    title="Quick Actions"
                    collapsed={quickActionsPanelCollapsed}
                    onToggle={() => setQuickActionsPanelCollapsed((value) => !value)}
                  >
                    <div style={{ display: "grid", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={toggleMicrophoneMuted}
                        disabled={!voiceClient || discoveryMode !== "audio"}
                        aria-pressed={microphoneMuted}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "12px",
                          border: microphoneMuted
                            ? "1px solid rgba(248,113,113,0.45)"
                            : "1px solid rgba(148,163,184,0.24)",
                          background: microphoneMuted ? "rgba(127,29,29,0.24)" : "rgba(30,41,59,0.55)",
                          color: microphoneMuted ? "#fecaca" : "#dbeafe",
                          fontWeight: 800,
                          cursor: !voiceClient || discoveryMode !== "audio" ? "not-allowed" : "pointer",
                          opacity: !voiceClient || discoveryMode !== "audio" ? 0.55 : 1,
                        }}
                      >
                        {microphoneMuted ? "Unmute microphone" : "Mute microphone"}
                      </button>
                      <button
                        type="button"
                        onClick={openReviewScreen}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "12px",
                          border: "1px solid rgba(167,139,250,0.5)",
                          background: "rgba(124,58,237,0.22)",
                          color: "#ede9fe",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Review &amp; Generate Profile
                      </button>
                      {resumeAvailable && !voiceClient ? (
                        <button
                          type="button"
                          onClick={resumeDiscovery}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "12px",
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
                              padding: "10px 14px",
                              borderRadius: "12px",
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
                              padding: "10px 14px",
                              borderRadius: "12px",
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
                  </CollapsiblePanel>
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
                  <section
                    aria-label="Optional response guidance for participant."
                    style={{
                      display: "grid",
                      gap: "10px",
                      padding: "14px",
                      borderRadius: "16px",
                      background: "rgba(15,23,42,0.72)",
                      border: "1px solid rgba(148,163,184,0.14)",
                    }}
                  >
                    <div style={{ color: "#e2e8f0", fontSize: "0.95rem", fontWeight: 800 }}>
                      Optional response guidance for participant.
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                        gap: "8px",
                      }}
                    >
                      {PARTICIPANT_RESPONSE_GUIDANCE.map((item) => (
                        <div
                          key={item.title}
                          style={{
                            display: "grid",
                            gap: "5px",
                            padding: "10px 12px",
                            borderRadius: "12px",
                            background: "rgba(255,255,255,0.025)",
                            border: "1px solid rgba(148,163,184,0.1)",
                          }}
                        >
                          <strong style={{ color: "#cbd5e1", fontSize: "0.82rem" }}>
                            {item.title}
                          </strong>
                          <span style={{ color: "rgba(226,232,240,0.84)", fontSize: "0.86rem", lineHeight: 1.45 }}>
                            {item.prompt}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
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
                {isDebugAccount && renderDiagnosticsPanel()}
              </div>
            </>
          )}

        {step === "reviewing" && profile && session &&
          renderCard(
            <>
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
                  Review Discovery before generating a profile
                </div>
                <div style={{ color: "rgba(226,232,240,0.9)", lineHeight: 1.8 }}>
                  This is your call. You can keep talking with Alice, or generate a profile now from what's
                  been discovered so far. The diagram below shows how much of the schema each area of the
                  conversation has touched — it's a rough guide, not a requirement.
                </div>

                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
                  <ConcentricProgressRings
                    outerPercentage={schemaCoverage.coveragePercentage}
                    innerPercentage={schemaCoverage.profileReadinessPercentage}
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "8px",
                      flex: 1,
                      minWidth: "260px",
                    }}
                  >
                    {schemaCoverage.fields.map((entry) => (
                      <div
                        key={entry.field}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid rgba(148,163,184,0.1)",
                          fontSize: "0.82rem",
                        }}
                      >
                        <span style={{ color: "#cbd5e1" }}>{DISCOVERY_FIELD_LABELS[entry.field]}</span>
                        <span
                          style={{
                            color:
                              entry.status === "filled" ? "#4ade80" : entry.status === "touched" ? "#facc15" : "#64748b",
                            fontWeight: 800,
                          }}
                        >
                          {entry.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {reviewPhase === "decide" && (
                  <div style={{ display: "grid", gap: "14px" }}>
                    <div
                      style={{
                        display: "grid",
                        gap: "8px",
                        padding: "14px",
                        borderRadius: "14px",
                        border: "1px solid rgba(250,204,21,0.4)",
                        background: "rgba(250,204,21,0.1)",
                      }}
                    >
                      <strong style={{ fontSize: "0.8rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "#facc15" }}>
                        🛡 Participant Authority
                      </strong>
                      <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "0.88rem", lineHeight: 1.5, color: "#cbd5e1" }}>
                        <input
                          type="checkbox"
                          checked={allowDevelopmentCopy}
                          onChange={(event) => setAllowDevelopmentCopy(event.target.checked)}
                          style={{ marginTop: "3px" }}
                        />
                        <span>
                          May Lighthouse keep a copy of this generated profile for development purposes? It will be
                          removed once that work is done. This is entirely optional — declining does not affect
                          your profile, your session, or anything else.
                        </span>
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={continueDiscoveryFromReview}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "14px",
                        border: "1px solid rgba(148,163,184,0.24)",
                        background: "rgba(255,255,255,0.04)",
                        color: "#e2e8f0",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Continue Discovery
                    </button>
                    <button
                      type="button"
                      onClick={() => void generateProfileFromReview()}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "14px",
                        border: "1px solid rgba(167,139,250,0.5)",
                        background: "rgba(124,58,237,0.24)",
                        color: "#ede9fe",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Finish &amp; Generate Profile
                    </button>
                    </div>
                  </div>
                )}

                {reviewPhase === "authoring" && (
                  <div style={{ color: "#cbd5e1" }}>Authoring your profile with the flagship model…</div>
                )}

                {reviewPhase === "error" && (
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: "16px",
                      background: "rgba(153,27,27,0.12)",
                      border: "1px solid rgba(248,113,113,0.25)",
                      color: "#fee2e2",
                    }}
                  >
                    {authoringError}
                    <div style={{ marginTop: "10px" }}>
                      <button
                        type="button"
                        onClick={() => void generateProfileFromReview()}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "12px",
                          border: "1px solid rgba(248,113,113,0.35)",
                          background: "rgba(127,29,29,0.24)",
                          color: "#fecaca",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                )}

                {reviewPhase === "authored" && authoredProfile && (
                  <div style={{ display: "grid", gap: "14px" }}>
                    <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                      Authored by <strong style={{ color: "#e2e8f0" }}>{authoredProfile.model}</strong> (flagship
                      text model — never the realtime voice model).
                    </div>
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(148,163,184,0.14)",
                        color: "#e2e8f0",
                        maxHeight: "34vh",
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                        fontSize: "0.92rem",
                        lineHeight: 1.6,
                      }}
                    >
                      {authoredProfile.fields.generatedProfile}
                    </div>

                    <div
                      style={{
                        padding: "14px",
                        borderRadius: "14px",
                        border: "1px solid rgba(59,130,246,0.3)",
                        background: "rgba(59,130,246,0.1)",
                        color: "#dbeafe",
                        fontSize: "0.85rem",
                        lineHeight: 1.55,
                      }}
                    >
                      📬 When Lighthouse officially launches, we'll notify you by email. When you return, all you'll
                      need to do is upload this profile artifact to have your permanent professional profile filled
                      in automatically from today's session — no need to start over.
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: "12px",
                        padding: "14px",
                        borderRadius: "16px",
                        background: "rgba(15,23,42,0.72)",
                        border: "1px solid rgba(148,163,184,0.14)",
                      }}
                    >
                      <div style={{ fontWeight: 800, color: "#e2e8f0" }}>Choose a format for your emailed document</div>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {(["pdf", "docx", "text", "other"] as ExportFormat[]).map((format) => (
                          <button
                            key={format}
                            type="button"
                            onClick={() => setExportFormat(format)}
                            aria-pressed={exportFormat === format}
                            style={{
                              padding: "8px 14px",
                              borderRadius: "10px",
                              border: exportFormat === format
                                ? "1px solid rgba(167,139,250,0.6)"
                                : "1px solid rgba(148,163,184,0.18)",
                              background: exportFormat === format ? "rgba(124,58,237,0.28)" : "rgba(255,255,255,0.03)",
                              color: exportFormat === format ? "#ede9fe" : "#cbd5e1",
                              fontWeight: 700,
                              cursor: "pointer",
                              textTransform: "uppercase",
                              fontSize: "0.78rem",
                            }}
                          >
                            {format === "pdf" ? "PDF" : format === "docx" ? "Word (.docx)" : format === "text" ? "Plain text" : "Other"}
                          </button>
                        ))}
                      </div>
                      {exportFormat === "other" && (
                        <input
                          value={otherFormatDescription}
                          onChange={(event) => setOtherFormatDescription(event.target.value)}
                          placeholder="Describe the format you'd like"
                          style={{
                            padding: "10px 12px",
                            borderRadius: "10px",
                            border: "1px solid rgba(148,163,184,0.18)",
                            background: "rgba(255,255,255,0.03)",
                            color: "#eef2ff",
                          }}
                        />
                      )}
                      {(exportFormat === "pdf" || exportFormat === "docx") && (
                        <div style={{ fontSize: "0.78rem", color: "#facc15" }}>
                          {exportFormat === "pdf" ? "PDF" : "Word (.docx)"} generation isn't built yet — your request
                          will be recorded, and plain text is available to download right now.
                        </div>
                      )}
                      <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", color: "#cbd5e1" }}>
                        Email address to send the finished profile to
                        <input
                          type="email"
                          value={deliveryEmail}
                          onChange={(event) => setDeliveryEmail(event.target.value)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "10px",
                            border: "1px solid rgba(148,163,184,0.18)",
                            background: "rgba(255,255,255,0.03)",
                            color: "#eef2ff",
                          }}
                        />
                      </label>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={downloadPlainTextProfile}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "12px",
                            border: "1px solid rgba(148,163,184,0.24)",
                            background: "rgba(255,255,255,0.04)",
                            color: "#e2e8f0",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Download plain text now
                        </button>
                        <button
                          type="button"
                          onClick={requestProfileDelivery}
                          disabled={!deliveryEmail.trim()}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "12px",
                            border: "1px solid rgba(167,139,250,0.5)",
                            background: "rgba(124,58,237,0.24)",
                            color: "#ede9fe",
                            fontWeight: 800,
                            cursor: deliveryEmail.trim() ? "pointer" : "not-allowed",
                            opacity: deliveryEmail.trim() ? 1 : 0.55,
                          }}
                        >
                          Request email delivery
                        </button>
                      </div>
                      {deliveryRequested && (
                        <div style={{ fontSize: "0.85rem", color: "#4ade80" }}>
                          Request recorded. Email sending isn't connected yet, so nothing has actually been sent —
                          use the download button above to get your document now.
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={continueDiscoveryFromReview}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "12px",
                          border: "1px solid rgba(148,163,184,0.24)",
                          background: "rgba(255,255,255,0.04)",
                          color: "#e2e8f0",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Back to conversation
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
      </div>
    </div>
  );
}
