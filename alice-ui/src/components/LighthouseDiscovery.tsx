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
import { buildDiscoveryPromptAssembly } from "../ai/lighthousePrompt";
import {
  startRealtimeVoiceDiscovery,
  type RealtimeVoiceClient,
} from "../ai/realtimeVoiceDiscoveryClient";
import {
  appendAssistantTranscriptEvent,
  appendParticipantTranscriptEvent,
  clearDiscoverySessionState,
  type DiscoverySessionState,
  type DiscoveryConversationAction,
  loadOrCreateDiscoverySessionState,
  processDiscoveryPerception,
  updateDiscoverySessionState,
} from "../engine/agent/discovery";
import DiscoveryInspector from "./discovery/DiscoveryInspector";

type LighthouseDiscoveryProps = {
  onComplete: () => void;
};

type Step = "capture" | "launching" | "discovering";
const USE_MOCK_REALTIME_DISCOVERY =
  import.meta.env.VITE_MOCK_REALTIME_DISCOVERY === "true";

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
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [discoveryState, setDiscoveryState] = useState<DiscoverySessionState | null>(null);
  const [mockParticipantText, setMockParticipantText] = useState("");
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
    setDiscoveryState(loadOrCreateDiscoverySessionState(storedSession));
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

  const renderMockActionResponse = (
    action: DiscoveryConversationAction,
    promptAssembly: ReturnType<typeof buildDiscoveryPromptAssembly>
  ) => {
    const openQuestion = action.promptContext.selectedOpenQuestion?.question;
    const areaId = action.promptContext.selectedCoverageGap?.areaId;
    const activeRequest = promptAssembly.outputs.supportedBehaviorRequests[0]?.type;

    switch (action.type) {
      case "seekClarification":
        return openQuestion
          ? `I want to stay close to what you mean. ${openQuestion}`
          : "I want to understand that in your own terms. Could you tell me a little more about what that looks like in real life?";
      case "reflectObservation":
        return "I may be hearing an early pattern, but I want to keep it provisional: does that feel accurate, or would you say it differently?";
      case "investigateTension":
        return "There may be a useful tension in what you shared. What feels unresolved or pulled in two directions there?";
      case "validateUnderstanding":
        return "Before I carry that forward, does this emerging understanding fit your experience, or should I adjust it?";
      case "prepareCompletion":
        return "We are not generating a profile yet, but I can start preserving what is emerging. What feels most important not to lose?";
      case "exploreDomain":
        return areaId
          ? `Let's keep building evidence before summarizing. What is one example from your experience that would help me understand ${areaId.replace(/-/g, " ")} better?`
          : activeRequest
            ? `Let's keep this participant-led. What is another example or story that would help me understand the ${activeRequest} direction better?`
            : "Let's keep this participant-led. What is another example or story that would help me understand you better?";
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
    const updatedDiscoveryState = updateDiscoverySessionState(currentSession.sessionId, (state) => {
      const withTranscriptEvent = appendParticipantTranscriptEvent(state, normalized, true);
      return processDiscoveryPerception(withTranscriptEvent);
    });
    if (updatedDiscoveryState) {
      setDiscoveryState(updatedDiscoveryState);
      if (USE_MOCK_REALTIME_DISCOVERY && updatedDiscoveryState.latestConversationAction) {
        const assembly = buildDiscoveryPromptAssembly(currentProfile, updatedDiscoveryState);
        addDiagnosticLog(
          `Decision execution selected action: ${updatedDiscoveryState.latestConversationAction.type}.`
        );
        addDiagnosticLog(
          `Prompt assembly active request: ${assembly.outputs.supportedBehaviorRequests[0]?.type ?? "none"}.`
        );
        appendAssistantText(renderMockActionResponse(updatedDiscoveryState.latestConversationAction, assembly));
      }
    }
    const updatedProfile = updateLighthouseProfile(currentProfile.id, { transcript: nextTranscript });
    if (updatedProfile) {
      profileRef.current = updatedProfile;
      setProfile(updatedProfile);
    }
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
    const updatedDiscoveryState = updateDiscoverySessionState(currentSession.sessionId, (state) =>
      appendAssistantTranscriptEvent(state, normalized)
    );
    if (updatedDiscoveryState) setDiscoveryState(updatedDiscoveryState);
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

  const startDiscovery = async () => {
    setResumeAvailable(false);
    setErrorMessage("");
    setTokenStatus("pending");
    setMicrophoneStatus("pending");
    setAudioStatus("pending");
    setDataChannelStatus("pending");
    setTranscriptCount(0);
    setDiagnosticLogs([]);
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
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    sessionRef.current = newSession;
    setSession(newSession);
    const createdDiscoveryState = loadOrCreateDiscoverySessionState(newSession);
    setDiscoveryState(createdDiscoveryState);
    setStep("launching");
    setStatusMessage("Preparing your realtime voice discovery session...");

    try {
      const realtime = await requestRealtimeDiscoverySession(createdProfile, createdDiscoveryState);
      setTokenStatus("success");
      addDiagnosticLog(
        isMockRealtimeSession(realtime)
          ? "Mock realtime session created. No API token was requested."
          : "Token request succeeded."
      );
      const activatedState = updateDiscoverySessionState(newSession.sessionId, (state) => ({
        ...state,
        instance: {
          ...state.instance,
          status: "active",
          updatedAt: new Date().toISOString(),
        },
      }));
      if (activatedState) setDiscoveryState(activatedState);
      saveSession({
        realtimeSessionId: realtime.sessionId,
        status: "active",
        step: "discovering",
      });
      setStep("discovering");
      setStatusMessage("Connecting your microphone and starting the conversation...");

      const client = await startRealtimeVoiceDiscovery(realtime, {
        onStatus: (message) => {
          setStatusMessage(message);
          addDiagnosticLog(message);
        },
        onTranscript: appendUserTranscript,
        onAssistantText: appendAssistantText,
        onConnectionState: (state) => {
          setConnectionState(state);
          addDiagnosticLog(`Connection state: ${state}`);
        },
        onMicrophoneStatus: setMicrophoneStatus,
        onAudioPlaybackStatus: setAudioStatus,
        onDataChannelStatus: setDataChannelStatus,
        onDiagnosticLog: addDiagnosticLog,
        onError: (error) => {
          setErrorMessage(error.message);
          addDiagnosticLog(`Error: ${error.message}`);
          setStatusMessage("");
        },
      });

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
    addDiagnosticLog("Attempting realtime resume.");

    try {
      const resumedDiscoveryState = loadOrCreateDiscoverySessionState(currentSession);
      setDiscoveryState(resumedDiscoveryState);
      const realtime = await requestRealtimeDiscoverySession(currentProfile, resumedDiscoveryState);
      setTokenStatus("success");
      addDiagnosticLog(
        isMockRealtimeSession(realtime)
          ? "Mock realtime session resumed. No API token was requested."
          : "Token request succeeded for resume."
      );
      const activatedState = updateDiscoverySessionState(currentSession.sessionId, (state) => ({
        ...state,
        instance: {
          ...state.instance,
          status: "active",
          updatedAt: new Date().toISOString(),
        },
      }));
      if (activatedState) setDiscoveryState(activatedState);
      saveSession({
        realtimeSessionId: realtime.sessionId,
        status: "active",
        step: "discovering",
      });
      setStep("discovering");
      setResumeAvailable(false);

      const client = await startRealtimeVoiceDiscovery(realtime, {
        onStatus: (message) => {
          setStatusMessage(message);
          addDiagnosticLog(message);
        },
        onTranscript: appendUserTranscript,
        onAssistantText: appendAssistantText,
        onConnectionState: (state) => {
          setConnectionState(state);
          addDiagnosticLog(`Connection state: ${state}`);
        },
        onMicrophoneStatus: setMicrophoneStatus,
        onAudioPlaybackStatus: setAudioStatus,
        onDataChannelStatus: setDataChannelStatus,
        onDiagnosticLog: addDiagnosticLog,
        onError: (error) => {
          setErrorMessage(error.message);
          addDiagnosticLog(`Error: ${error.message}`);
          setStatusMessage("");
        },
      });

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
      const pausedState = updateDiscoverySessionState(currentSession.sessionId, (state) => ({
        ...state,
        instance: {
          ...state.instance,
          status: "paused",
          updatedAt: new Date().toISOString(),
        },
      }));
      if (pausedState) setDiscoveryState(pausedState);
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

    const currentSession = sessionRef.current;
    if (currentSession) {
      clearDiscoverySessionState(currentSession.sessionId);
    }

    clearLighthouseSession();
    profileRef.current = null;
    sessionRef.current = null;
    setProfile(null);
    setSession(null);
    setDiscoveryState(null);
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
        <div><strong>Microphone State:</strong> {microphoneStatus}</div>
        <div><strong>Realtime Connection:</strong> {connectionState || "pending"}</div>
        <div><strong>Audio Playback:</strong> {audioStatus}</div>
        <div><strong>Data Channel:</strong> {dataChannelStatus}</div>
        <div><strong>Transcript Count:</strong> {transcriptCount}</div>
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
          {(session || discoveryState) && (
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
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px" }}>
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
                  Your Lighthouse discovery session is running. Speak naturally, and the AI will respond with voice in real time.
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
                    lineHeight: 1.7,
                  }}
                >
                  <strong>LP ID:</strong> {profile.lpId}
                  <br />
                  <strong>Session:</strong> {session.status}
                  <br />
                  <strong>Method:</strong> {profile.discoveryMethod}
                  <br />
                  <strong>Realtime connection:</strong> {connectionState || "pending"}
                </div>
                {renderDiagnosticsPanel()}
                <div
                  style={{
                    marginTop: "18px",
                    padding: "18px",
                    borderRadius: "20px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(148,163,184,0.14)",
                    color: "#e2e8f0",
                    minHeight: "260px",
                    whiteSpace: "pre-wrap",
                    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontSize: "0.95rem",
                  }}
                >
                  {session.transcript || "Realtime transcript will appear here as the conversation progresses."}
                </div>
                {USE_MOCK_REALTIME_DISCOVERY && (
                  <div
                    style={{
                      marginTop: "14px",
                      display: "grid",
                      gap: "10px",
                    }}
                  >
                    <textarea
                      value={mockParticipantText}
                      onChange={(event) => setMockParticipantText(event.target.value)}
                      placeholder="Type a mock participant answer to test the Discovery loop"
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
                        onClick={() => {
                          appendUserTranscript(mockParticipantText, true);
                          setMockParticipantText("");
                        }}
                        disabled={!mockParticipantText.trim()}
                        style={{
                          padding: "12px 16px",
                          borderRadius: "14px",
                          border: "1px solid rgba(59,130,246,0.42)",
                          background: mockParticipantText.trim()
                            ? "rgba(59,130,246,0.24)"
                            : "rgba(71,85,105,0.22)",
                          color: "#e0f2fe",
                          fontWeight: 800,
                          cursor: mockParticipantText.trim() ? "pointer" : "not-allowed",
                        }}
                      >
                        Send Mock Answer
                      </button>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: "12px", marginTop: "18px", flexWrap: "wrap" }}>
                  {resumeAvailable && !voiceClient ? (
                    <button
                      type="button"
                      onClick={resumeDiscovery}
                      style={{
                        padding: "14px 18px",
                        borderRadius: "16px",
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
                          padding: "14px 18px",
                          borderRadius: "16px",
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
                          padding: "14px 18px",
                          borderRadius: "16px",
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
                {renderMessage()}
              </div>
            </>
          )}
      {import.meta.env.DEV && (
        <DiscoveryInspector profile={profile} state={discoveryState} />
      )}
      </div>
    </div>
  );
}
