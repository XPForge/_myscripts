import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Eraser,
  Mic,
  MicOff,
  Send,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  createNativeBenchmarkExport,
  serializeNativeBenchmarkMarkdown,
  type NativeBenchmarkSessionType,
  type NativeBenchmarkTurn,
} from "./nativeBenchmarkExport";
import "./NativeBenchmarkPage.css";

const MODEL_API_URL = "http://localhost:3001/api/model-response";
const STORAGE_KEY = "lighthouse-native-benchmark-v0.1";
const MODEL_PROVIDER_LABEL = "server-configured model endpoint";
const BENCHMARK_INSTRUCTION =
  "You are participating in a Lighthouse native discovery benchmark. Converse naturally with the participant. Ask grounded follow-up questions when useful. Do not score, rank, match, evaluate fit, or generate a profile during the conversation. Preserve the participant's meaning and avoid forcing a questionnaire.";

const QUESTION_SETS = {
  "fixed-a": {
    id: "A",
    label: "Fixed Question Set A",
    description: "Three baseline prompts about undervalued work, unusual problem solving, and work environment.",
    questions: [
      "Tell me about work you have done that people often misunderstand or undervalue.",
      "Tell me about a time you solved a problem that did not fit neatly inside your job title.",
      "What kind of environment helps you do your best work?",
    ],
  },
  "fixed-b": {
    id: "B",
    label: "Fixed Question Set B",
    description: "Three baseline prompts about meaningful work, natural strengths, and quick summaries.",
    questions: [
      "Tell me about something you built, fixed, improved, or figured out that mattered.",
      "What patterns show up across the things you are naturally good at?",
      "What do people usually miss when they try to summarize you quickly?",
    ],
  },
} as const;

type StoredSession = {
  sessionId: string;
  sessionType: NativeBenchmarkSessionType;
  createdAt: string;
  turns: NativeBenchmarkTurn[];
  fixedQuestionIndex: number;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor() {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function makeId(prefix: string) {
  if ("crypto" in window && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createSession(sessionType: NativeBenchmarkSessionType): StoredSession {
  return {
    sessionId: makeId("native-benchmark"),
    sessionType,
    createdAt: new Date().toISOString(),
    turns: [],
    fixedQuestionIndex: 0,
  };
}

function getInitialSession(): StoredSession {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return createSession("fixed-a");
    const parsed = JSON.parse(stored) as Partial<StoredSession>;
    if (
      typeof parsed.sessionId === "string" &&
      typeof parsed.createdAt === "string" &&
      (parsed.sessionType === "fixed-a" ||
        parsed.sessionType === "fixed-b" ||
        parsed.sessionType === "free-form") &&
      Array.isArray(parsed.turns) &&
      typeof parsed.fixedQuestionIndex === "number"
    ) {
      return {
        sessionId: parsed.sessionId,
        sessionType: parsed.sessionType,
        createdAt: parsed.createdAt,
        turns: parsed.turns,
        fixedQuestionIndex: parsed.fixedQuestionIndex,
      };
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return createSession("fixed-a");
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
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

function buildModelQuestion(turns: NativeBenchmarkTurn[], userText: string) {
  const recentTranscript = turns
    .slice(-8)
    .map((turn) => `${turn.role}: ${turn.text}`)
    .join("\n");

  return [
    BENCHMARK_INSTRUCTION,
    recentTranscript ? `Recent transcript:\n${recentTranscript}` : "",
    `Participant: ${userText}`,
    "Alice:",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function NativeBenchmarkPage() {
  const [session, setSession] = useState<StoredSession>(() => getInitialSession());
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [spokenResponseEnabled, setSpokenResponseEnabled] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const voiceInputSupported = Boolean(getSpeechRecognitionConstructor());
  const speechSynthesisSupported = "speechSynthesis" in window;

  const activeQuestionSet =
    session.sessionType === "fixed-a" || session.sessionType === "fixed-b"
      ? QUESTION_SETS[session.sessionType]
      : null;
  const activeQuestion = activeQuestionSet?.questions[session.fixedQuestionIndex] ?? null;

  const exportPayload = useMemo(
    () =>
      createNativeBenchmarkExport({
        sessionId: session.sessionId,
        sessionType: session.sessionType,
        createdAt: session.createdAt,
        modelProviderLabel: MODEL_PROVIDER_LABEL,
        turns: session.turns,
      }),
    [session],
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  }, [session.turns.length]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (speechSynthesisSupported) window.speechSynthesis.cancel();
    };
  }, [speechSynthesisSupported]);

  function switchSessionType(sessionType: NativeBenchmarkSessionType) {
    if (sessionType === session.sessionType) return;
    if (speechSynthesisSupported) window.speechSynthesis.cancel();
    setError("");
    setDraft("");
    setSession(createSession(sessionType));
  }

  function resetSession() {
    if (speechSynthesisSupported) window.speechSynthesis.cancel();
    setError("");
    setDraft("");
    setSession(createSession(session.sessionType));
  }

  function addTurn(turn: Omit<NativeBenchmarkTurn, "id" | "timestamp">) {
    const nextTurn: NativeBenchmarkTurn = {
      ...turn,
      id: makeId("turn"),
      timestamp: new Date().toISOString(),
    };
    setSession((current) => ({ ...current, turns: [...current.turns, nextTurn] }));
    return nextTurn;
  }

  function advanceFixedQuestion() {
    if (!activeQuestionSet) return;
    setSession((current) => ({
      ...current,
      fixedQuestionIndex: Math.min(
        current.fixedQuestionIndex + 1,
        activeQuestionSet.questions.length - 1,
      ),
    }));
  }

  function useCurrentPrompt() {
    if (!activeQuestion) return;
    setDraft(activeQuestion);
  }

  function speak(text: string) {
    if (!speechSynthesisSupported || !spokenResponseEnabled) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  async function sendTurn(inputSource: "typed" | "spoken" = "typed") {
    const userText = draft.trim();
    if (!userText) {
      setError("Type or speak a message before sending.");
      return;
    }

    setIsLoading(true);
    setError("");
    setDraft("");

    const fixedQuestionIndex =
      activeQuestion && userText === activeQuestion ? session.fixedQuestionIndex : undefined;
    const priorTurns = session.turns;

    addTurn({
      role: "user",
      text: userText,
      mode: inputSource,
      source: inputSource === "spoken" ? "browser-speech-recognition" : "keyboard",
      fixedQuestionIndex,
    });

    try {
      const response = await fetch(MODEL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: buildModelQuestion(priorTurns, userText) }),
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const serverError =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : "Model request failed";
        throw new Error(
          `${serverError}. Check that the model API is running and OPENAI_API_KEY / OPENAI_MODEL are configured on the server.`,
        );
      }
      if (!body || typeof body !== "object" || !("answer" in body)) {
        throw new Error("The model API returned an invalid response.");
      }

      const assistantText = (body as { answer: unknown }).answer;
      if (typeof assistantText !== "string" || !assistantText.trim()) {
        throw new Error("The model API returned an empty answer.");
      }

      addTurn({
        role: "assistant",
        text: assistantText,
        mode: "model",
        source: MODEL_PROVIDER_LABEL,
      });
      speak(assistantText);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not reach the model API at http://localhost:3001/api/model-response.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function startVoiceInput() {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setError("Voice input is not supported in this browser. Type into the text box instead.");
      return;
    }

    setError("");
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      setError(
        event.error === "not-allowed"
          ? "Microphone access was denied. Allow access or type your response."
          : "Voice input failed. Type your response or try the microphone again.",
      );
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setDraft(transcript);
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError("Voice input could not start. Type your response or try again.");
    }
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
      serializeNativeBenchmarkMarkdown(exportPayload),
      "text/markdown",
    );
  }

  return (
    <main className="benchmark-page">
      <div className="benchmark-shell">
        <header className="benchmark-header">
          <div>
            <p className="benchmark-kicker">Benchmark prototype</p>
            <h1>Lighthouse Native Verbal Benchmark</h1>
            <p>
              Baseline conversational agent for measuring native model behavior before Discovery
              constraints are added. This is not the final Lighthouse Discovery module.
            </p>
          </div>
          <button type="button" className="benchmark-button ghost" onClick={resetSession}>
            <Eraser size={17} aria-hidden="true" />
            Reset
          </button>
        </header>

        <div className="benchmark-grid">
          <section className="benchmark-panel" aria-labelledby="session-title">
            <h2 className="panel-title" id="session-title">
              Session
            </h2>
            <div className="session-options">
              {(
                [
                  ["fixed-a", QUESTION_SETS["fixed-a"].label, QUESTION_SETS["fixed-a"].description],
                  ["fixed-b", QUESTION_SETS["fixed-b"].label, QUESTION_SETS["fixed-b"].description],
                  ["free-form", "Free Form", "Open conversation without fixed prompts."],
                ] as const
              ).map(([value, label, description]) => (
                <label className="session-option" key={value}>
                  <input
                    type="radio"
                    name="session-type"
                    checked={session.sessionType === value}
                    onChange={() => switchSessionType(value)}
                  />
                  <span>
                    <strong>{label}</strong>
                    <span>{description}</span>
                  </span>
                </label>
              ))}
            </div>

            {activeQuestionSet && (
              <section className="fixed-prompt" aria-labelledby="fixed-prompt-title">
                <h2 className="panel-title" id="fixed-prompt-title">
                  {activeQuestionSet.label}
                </h2>
                <p className="status-line">
                  Prompt {session.fixedQuestionIndex + 1} of {activeQuestionSet.questions.length}
                </p>
                <blockquote>{activeQuestion}</blockquote>
                <div className="button-row">
                  <button
                    type="button"
                    className="benchmark-button secondary"
                    onClick={useCurrentPrompt}
                  >
                    Use prompt
                  </button>
                  <button
                    type="button"
                    className="benchmark-button ghost"
                    onClick={advanceFixedQuestion}
                    disabled={session.fixedQuestionIndex >= activeQuestionSet.questions.length - 1}
                  >
                    <SkipForward size={17} aria-hidden="true" />
                    Next
                  </button>
                </div>
              </section>
            )}

            <section className="composer-panel" aria-labelledby="composer-title">
              <h2 className="panel-title" id="composer-title">
                Talk to Alice
              </h2>
              <label htmlFor="benchmark-message">Message</label>
              <textarea
                id="benchmark-message"
                value={draft}
                disabled={isLoading}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void sendTurn();
                }}
                placeholder="Type your response, or use the microphone if your browser supports it."
              />
              <div className="button-row">
                <button
                  type="button"
                  className="benchmark-button"
                  onClick={() => void sendTurn()}
                  disabled={isLoading}
                >
                  <Send size={17} aria-hidden="true" />
                  {isLoading ? "Sending" : "Send"}
                </button>
                <button
                  type="button"
                  className="benchmark-button secondary"
                  onClick={startVoiceInput}
                  disabled={isLoading || isListening || !voiceInputSupported}
                >
                  {isListening ? (
                    <MicOff size={17} aria-hidden="true" />
                  ) : (
                    <Mic size={17} aria-hidden="true" />
                  )}
                  {isListening ? "Listening" : "Speak"}
                </button>
                <button
                  type="button"
                  className="benchmark-button ghost"
                  onClick={() => setSpokenResponseEnabled((enabled) => !enabled)}
                  disabled={!speechSynthesisSupported}
                  aria-pressed={spokenResponseEnabled}
                >
                  {spokenResponseEnabled ? (
                    <Volume2 size={17} aria-hidden="true" />
                  ) : (
                    <VolumeX size={17} aria-hidden="true" />
                  )}
                  Voice out
                </button>
              </div>
              <p className="status-line">
                {voiceInputSupported
                  ? "Voice input available. Text input always remains available."
                  : "Voice input unavailable in this browser; text input is available."}
                {!speechSynthesisSupported ? " Spoken output is unavailable in this browser." : ""}
              </p>
              {error && (
                <p className="error-line" role="alert">
                  {error}
                </p>
              )}
            </section>

            <section className="export-panel" aria-labelledby="export-title">
              <h2 className="panel-title" id="export-title">
                Export
              </h2>
              <div className="button-row">
                <button
                  type="button"
                  className="benchmark-button secondary"
                  onClick={exportJson}
                  disabled={session.turns.length === 0}
                >
                  <Download size={17} aria-hidden="true" />
                  JSON
                </button>
                <button
                  type="button"
                  className="benchmark-button secondary"
                  onClick={exportMarkdown}
                  disabled={session.turns.length === 0}
                >
                  <Download size={17} aria-hidden="true" />
                  Markdown
                </button>
              </div>
            </section>
          </section>

          <section className="transcript-panel" aria-labelledby="transcript-title">
            <div className="transcript-head">
              <div>
                <h2 id="transcript-title">Transcript</h2>
                <p>
                  {session.turns.length} turns · {session.sessionId}
                </p>
              </div>
            </div>
            <div className="transcript-list" aria-live="polite">
              {session.turns.length === 0 ? (
                <p className="empty-transcript">
                  Transcript turns will appear here with role, timestamp, text, and source metadata.
                </p>
              ) : (
                session.turns.map((turn) => (
                  <article className={`turn ${turn.role}`} key={turn.id}>
                    <div className="turn-meta">
                      <span className="role-chip">{turn.role}</span>
                      <time dateTime={turn.timestamp}>{formatTimestamp(turn.timestamp)}</time>
                      {turn.mode && <span>mode: {turn.mode}</span>}
                      {turn.source && <span>source: {turn.source}</span>}
                      {turn.fixedQuestionIndex !== undefined && (
                        <span>fixed prompt: {turn.fixedQuestionIndex + 1}</span>
                      )}
                    </div>
                    <p className="turn-text">{turn.text}</p>
                  </article>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
