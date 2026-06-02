import { useEffect, useState, type ReactNode } from "react";
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
  type RealtimeVoiceClient,
} from "../ai/realtimeVoiceDiscoveryClient";
import {
  appendAssistantTranscriptEvent,
  appendParticipantTranscriptEvent,
  type DiscoverySessionState,
  loadOrCreateDiscoverySessionState,
  processDiscoveryPerception,
  updateDiscoverySessionState,
} from "../engine/agent/discovery";
import DiscoveryInspector from "./discovery/DiscoveryInspector";

type LighthouseDiscoveryProps = {
  onComplete: () => void;
};

type Step = "capture" | "launching" | "discovering";

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
    if (!profile) return;
    persistLighthouseProfile(profile);
  }, [profile]);

  useEffect(() => {
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
    if (!session) return;
    const next: LighthouseSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setSession(next);
  };

  const addDiagnosticLog = (message: string) => {
    setDiagnosticLogs((prev) => [
      `${new Date().toISOString()} - ${message}`,
      ...prev,
    ].slice(0, 60));
  };

  const appendUserTranscript = (segment: string, isFinal: boolean) => {
    if (!profile || !session || !segment.trim()) return;
    if (!isFinal) {
      setStatusMessage(`Listening: ${segment}`);
      return;
    }
    setTranscriptCount((count) => count + 1);

    const normalized = segment.trim();
    const nextTranscript = `${session.transcript}${session.transcript ? " " : ""}${normalized}`.trim();
    const nextHistory: AIMessage[] = [
      ...session.conversationHistory,
      {
        role: "user",
        content: normalized,
        createdAt: new Date().toISOString(),
      },
    ];

    saveSession({ transcript: nextTranscript, conversationHistory: nextHistory });
    const updatedDiscoveryState = updateDiscoverySessionState(session.sessionId, (state) => {
      const withTranscriptEvent = appendParticipantTranscriptEvent(state, normalized, true);
      return processDiscoveryPerception(withTranscriptEvent);
    });
    if (updatedDiscoveryState) setDiscoveryState(updatedDiscoveryState);
    const updatedProfile = updateLighthouseProfile(profile.id, { transcript: nextTranscript });
    if (updatedProfile) {
      setProfile(updatedProfile);
    }
  };

  const appendAssistantText = (segment: string) => {
    if (!profile || !session || !segment.trim()) return;
    const normalized = segment.trim();
    const nextTranscript = `${session.transcript}${session.transcript ? " " : ""}Assistant: ${normalized}`.trim();
    const nextHistory: AIMessage[] = [
      ...session.conversationHistory,
      {
        role: "assistant",
        content: normalized,
        createdAt: new Date().toISOString(),
      },
    ];

    saveSession({ transcript: nextTranscript, conversationHistory: nextHistory });
    const updatedDiscoveryState = updateDiscoverySessionState(session.sessionId, (state) =>
      appendAssistantTranscriptEvent(state, normalized)
    );
    if (updatedDiscoveryState) setDiscoveryState(updatedDiscoveryState);
    const updatedProfile = updateLighthouseProfile(profile.id, { transcript: nextTranscript });
    if (updatedProfile) {
      setProfile(updatedProfile);
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

    setSession(newSession);
    const createdDiscoveryState = loadOrCreateDiscoverySessionState(newSession);
    setDiscoveryState(createdDiscoveryState);
    setStep("launching");
    setStatusMessage("Preparing your realtime voice discovery session...");

    try {
      const realtime = await requestRealtimeDiscoverySession(createdProfile, createdDiscoveryState);
      setTokenStatus("success");
      addDiagnosticLog("Token request succeeded.");
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
      setErrorMessage(
        error instanceof Error
          ? `Realtime session failed: ${error.message}`
          : "Unable to connect to realtime discovery."
      );
      setTokenStatus("failed");
      addDiagnosticLog(
        error instanceof Error ? `Realtime session failed: ${error.message}` : "Unable to connect to realtime discovery."
      );
      saveSession({ status: "paused", step: "capture" });
      setStep("capture");
      setStatusMessage("");
    }
  };

  const resumeDiscovery = async () => {
    if (!profile) {
      setErrorMessage("Unable to resume discovery: missing profile.");
      return;
    }
    setErrorMessage("");
    setStatusMessage("Reconnecting your realtime voice discovery session...");
    setMicrophoneStatus("pending");
    setAudioStatus("pending");
    setDataChannelStatus("pending");
    addDiagnosticLog("Attempting realtime resume.");

    try {
      const resumedDiscoveryState = session ? loadOrCreateDiscoverySessionState(session) : undefined;
      if (resumedDiscoveryState) setDiscoveryState(resumedDiscoveryState);
      const realtime = await requestRealtimeDiscoverySession(profile, resumedDiscoveryState);
      setTokenStatus("success");
      addDiagnosticLog("Token request succeeded for resume.");
      if (session) {
        const activatedState = updateDiscoverySessionState(session.sessionId, (state) => ({
          ...state,
          instance: {
            ...state.instance,
            status: "active",
            updatedAt: new Date().toISOString(),
          },
        }));
        if (activatedState) setDiscoveryState(activatedState);
      }
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

    if (session) {
      saveSession({ status: "paused", step: "capture" });
      const pausedState = updateDiscoverySessionState(session.sessionId, (state) => ({
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

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setStep("capture")}
            style={{
              padding: "16px 24px",
              borderRadius: "18px",
              border: "1px solid rgba(59,130,246,0.45)",
              background: "linear-gradient(180deg, rgba(59,130,246,0.22), rgba(14,165,233,0.18))",
              color: "#eef2ff",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 18px 40px rgba(14,165,233,0.2)",
            }}
          >
            Start Lighthouse Discovery
          </button>
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
                  Continue
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
                {import.meta.env.DEV && (
                  <DiscoveryInspector profile={profile} state={discoveryState} />
                )}
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
      </div>
    </div>
  );
}
