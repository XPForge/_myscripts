import { useEffect, useRef, useState } from "react";
import "./ModelInterfacePage.css";

const MODEL_API_URL = "http://localhost:3001/api/model-response";

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

export default function ModelInterfacePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceInputSupported = Boolean(getSpeechRecognitionConstructor());
  const speechSynthesisSupported = "speechSynthesis" in window;

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (speechSynthesisSupported) window.speechSynthesis.cancel();
    };
  }, [speechSynthesisSupported]);

  async function askQuestion() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError("Enter or speak a question first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setAnswer("");

    try {
      const response = await fetch(MODEL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        throw new Error("The model could not answer. Please try again.");
      }
      if (!body || typeof body !== "object" || !("answer" in body)) {
        throw new Error("The server returned an invalid response.");
      }

      const responseAnswer = (body as { answer: unknown }).answer;
      if (typeof responseAnswer !== "string" || !responseAnswer.trim()) {
        throw new Error("The server returned an empty answer.");
      }
      setAnswer(responseAnswer);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not reach the model API at localhost:3001.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function startVoiceInput() {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setError("Voice input is not supported in this browser.");
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
          ? "Microphone access was denied. Allow access and try again."
          : "Voice input failed. Please try again or type your question.",
      );
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setQuestion(transcript);
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError("Voice input could not start. Please try again.");
    }
  }

  function speakAnswer() {
    if (!answer || !speechSynthesisSupported) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer));
  }

  return (
    <main className="model-page">
      <section className="model-panel" aria-labelledby="model-title">
        <header>
          <p className="model-kicker">Model interface</p>
          <h1 id="model-title">Ask a question</h1>
          <p>Type a question or use your microphone.</p>
        </header>

        <label htmlFor="model-question">Question</label>
        <textarea
          id="model-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void askQuestion();
          }}
          placeholder="What would you like to know?"
          rows={5}
          disabled={isLoading}
        />

        <div className="model-actions">
          <button type="button" onClick={() => void askQuestion()} disabled={isLoading}>
            {isLoading ? "Asking…" : "Ask"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={startVoiceInput}
            disabled={isLoading || isListening || !voiceInputSupported}
            aria-label="Speak a question"
          >
            {isListening ? "Listening…" : "Use microphone"}
          </button>
        </div>

        {!voiceInputSupported && (
          <p className="support-message">Voice input is not supported in this browser.</p>
        )}
        {error && <p className="error-message" role="alert">{error}</p>}

        <section className="answer-panel" aria-live="polite" aria-busy={isLoading}>
          <div className="answer-heading">
            <h2>Answer</h2>
            <button
              type="button"
              className="text-button"
              onClick={speakAnswer}
              disabled={!answer || !speechSynthesisSupported}
            >
              Speak answer
            </button>
          </div>
          {isLoading ? <p>Waiting for a response…</p> : <p>{answer || "Your answer will appear here."}</p>}
          {!speechSynthesisSupported && (
            <p className="support-message">Spoken answers are not supported in this browser.</p>
          )}
        </section>
      </section>
    </main>
  );
}
