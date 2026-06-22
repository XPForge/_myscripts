import { useMemo, useRef, useState } from "react";
import { Download, Mic, Square } from "lucide-react";
import { normalizeRealtimeError } from "../engine/runtime";
import {
  DEFAULT_REALTIME_VOICE,
  REALTIME_VOICE_OPTIONS,
  createRealtimeMarkdownExport,
  getRealtimeClientSecretEndpoint,
  isRealtimeVoiceOption,
  startRealtimeVoiceAgent,
  type RealtimeBackendFetchDiagnostics,
  type RealtimeSessionMetadata,
  type RealtimeTranscriptEvent,
  type RealtimeVoiceConnection,
  type RealtimeVoiceOption,
  type RealtimeVoiceStatus,
} from "../lib/realtimeVoiceAgent";
import "./RealtimeVoicePage.css";

type StoredRealtimeSession = {
  sessionId: string;
  createdAt: string;
  metadata: RealtimeSessionMetadata | null;
  events: RealtimeTranscriptEvent[];
};

function makeId(prefix: string) {
  if ("crypto" in window && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createSession(): StoredRealtimeSession {
  return {
    sessionId: makeId("realtime-voice"),
    createdAt: new Date().toISOString(),
    metadata: null,
    events: [],
  };
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export default function RealtimeVoicePage() {
  const [session, setSession] = useState<StoredRealtimeSession>(() => createSession());
  const [status, setStatus] = useState<RealtimeVoiceStatus>("idle");
  const [error, setError] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<RealtimeVoiceOption>(DEFAULT_REALTIME_VOICE);
  const [backendDiagnostics, setBackendDiagnostics] = useState<RealtimeBackendFetchDiagnostics>({
    endpointUrl: getRealtimeClientSecretEndpoint(),
    backendFetchSucceeded: null,
    httpStatus: null,
    message: "Backend fetch has not been attempted.",
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const connectionRef = useRef<RealtimeVoiceConnection | null>(null);
  const startInProgressRef = useRef(false);

  const exportPayload = useMemo(
    () => ({
      version: "raw-realtime-voice-runtime-001",
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      exportedAt: new Date().toISOString(),
      metadata: session.metadata,
      events: session.events,
    }),
    [session],
  );

  const isRunning =
    status === "requesting microphone" ||
    status === "creating session" ||
    status === "connecting" ||
    status === "connected" ||
    status === "speaking/listening";
  const isStartDisabled = isRunning || startInProgressRef.current;

  async function startSession() {
    if (!audioRef.current || startInProgressRef.current || isRunning) return;
    startInProgressRef.current = true;
    setError("");
    setSession(createSession());

    try {
      const connection = await startRealtimeVoiceAgent(
        audioRef.current,
        {
          onStatus: setStatus,
          onError: setError,
          onBackendFetchDiagnostics: setBackendDiagnostics,
          onTranscriptEvent: (event) => {
            setSession((current) => ({
              ...current,
              events: [...current.events, event],
            }));
          },
        },
        selectedVoice,
      );

      connectionRef.current = connection;
      setSession((current) => ({
        ...current,
        metadata: connection.metadata,
      }));
      setStatus("connected");
    } catch (startError) {
      connectionRef.current?.stop();
      connectionRef.current = null;
      setStatus("failed");
      setError(normalizeRealtimeError(startError, "Realtime voice session could not be started.").message);
    } finally {
      startInProgressRef.current = false;
    }
  }

  function stopSession() {
    connectionRef.current?.stop();
    connectionRef.current = null;
    setStatus("disconnected");
  }

  function exportJson() {
    downloadText(
      `${session.sessionId}.json`,
      JSON.stringify(exportPayload, null, 2),
      "application/json",
    );
  }

  function exportMarkdown() {
    downloadText(
      `${session.sessionId}.md`,
      createRealtimeMarkdownExport(exportPayload),
      "text/markdown",
    );
  }

  function handleVoiceChange(value: string) {
    if (isRealtimeVoiceOption(value)) {
      setSelectedVoice(value);
    }
  }

  return (
    <main className="realtime-page">
      <div className="realtime-shell">
        <header className="realtime-header">
          <div>
            <p className="realtime-kicker">Realtime WebRTC audio pipe</p>
            <h1>Raw Realtime Voice Runtime</h1>
            <p>
              This runtime opens a server-configured realtime voice connection using the
              selected voice.
            </p>
          </div>
          <div className={`status-pill ${status.replace("/", "-").replace(" ", "-")}`}>
            {status}
          </div>
        </header>

        <section className="realtime-controls" aria-label="Realtime session controls">
          <label className="voice-select">
            <span>Voice</span>
            <select
              value={selectedVoice}
              onChange={(event) => handleVoiceChange(event.target.value)}
              disabled={isStartDisabled}
            >
              {REALTIME_VOICE_OPTIONS.map((voice) => (
                <option value={voice} key={voice}>
                  {voice}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="realtime-button"
            onClick={() => void startSession()}
            disabled={isStartDisabled}
          >
            <Mic size={18} aria-hidden="true" />
            Start
          </button>
          <button
            type="button"
            className="realtime-button secondary"
            onClick={stopSession}
            disabled={!isRunning}
          >
            <Square size={17} aria-hidden="true" />
            Stop
          </button>
          <button
            type="button"
            className="realtime-button ghost"
            onClick={exportJson}
            disabled={session.events.length === 0}
          >
            <Download size={17} aria-hidden="true" />
            JSON
          </button>
          <button
            type="button"
            className="realtime-button ghost"
            onClick={exportMarkdown}
            disabled={session.events.length === 0}
          >
            <Download size={17} aria-hidden="true" />
            Markdown
          </button>
          <audio ref={audioRef} className="remote-audio" autoPlay />
        </section>

        {error && (
          <p className="realtime-error" role="alert">
            {error}
          </p>
        )}

        <section className="realtime-session-meta" aria-label="Session metadata">
          <div>
            <span>provider</span>
            <strong>{session.metadata?.provider ?? "openai"}</strong>
          </div>
          <div>
            <span>discovery mode</span>
            <strong>{session.metadata?.discoveryModeId ?? "native-discovery-realtime2-v0.1"}</strong>
          </div>
          <div>
            <span>credential source</span>
            <strong>server-issued temporary credential</strong>
          </div>
          <div>
            <span>secrets exposed</span>
            <strong>no</strong>
          </div>
          <div>
            <span>transcript storage</span>
            <strong>local/user-controlled</strong>
          </div>
          <div>
            <span>error handling</span>
            <strong>redacted</strong>
          </div>
          <div>
            <span>endpoint</span>
            <strong>{backendDiagnostics.endpointUrl}</strong>
          </div>
          <div>
            <span>backend fetch</span>
            <strong>
              {backendDiagnostics.backendFetchSucceeded === null
                ? "not attempted"
                : backendDiagnostics.backendFetchSucceeded
                  ? "succeeded"
                  : "failed before HTTP"}
            </strong>
          </div>
          <div>
            <span>HTTP status</span>
            <strong>{backendDiagnostics.httpStatus ?? "none"}</strong>
          </div>
          <div>
            <span>session</span>
            <strong>{session.metadata?.sessionId ?? session.sessionId}</strong>
          </div>
          <div>
            <span>model</span>
            <strong>{session.metadata?.model ?? "server configured"}</strong>
          </div>
          <div>
            <span>voice</span>
            <strong>{session.metadata?.voice ?? selectedVoice}</strong>
          </div>
          <div>
            <span>events</span>
            <strong>{session.events.length}</strong>
          </div>
        </section>

        <section className="realtime-diagnostics" aria-label="Realtime backend diagnostics">
          <span>backend message</span>
          <strong>{backendDiagnostics.message}</strong>
        </section>

        <section className="realtime-transcript" aria-labelledby="realtime-transcript-title">
          <div className="transcript-title-row">
            <h2 id="realtime-transcript-title">Transcript Events</h2>
            <p>{session.createdAt}</p>
          </div>

          <div className="realtime-event-list" aria-live="polite">
            {session.events.length === 0 ? (
              <p className="empty-realtime-transcript">
                Realtime transcript events will appear here when the session emits user and
                assistant transcript deltas or finals.
              </p>
            ) : (
              session.events.map((event) => (
                <article className={`realtime-event ${event.role}`} key={event.id}>
                  <div className="realtime-event-meta">
                    <span className="role-chip">{event.role}</span>
                    <time dateTime={event.timestamp}>{formatTimestamp(event.timestamp)}</time>
                    <span>{event.isFinal ? "final" : "delta"}</span>
                    <span>{event.eventType}</span>
                  </div>
                  <p>{event.text}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
