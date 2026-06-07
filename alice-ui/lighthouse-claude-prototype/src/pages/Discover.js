import { postJson } from "../services/APIService.js";
import { saveSessionId } from "../services/SessionManager.js";

function turnHtml(turn) {
  const role = turn.role === "assistant" ? "LIGHTHOUSE" : "YOU";
  const cls = turn.role === "assistant" ? "assistant" : "user";
  return `
    <article class="message ${cls}">
      <span class="speaker">${role}</span>
      <div class="bubble">${escapeHtml(turn.text)}</div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function visualProgress(turns) {
  const participantTurns = turns.filter((turn) => turn.role === "user").length;
  return Math.min(100, Math.max(8, participantTurns * 12 + 8));
}

function updateTranscript(app, session) {
  const transcript = app.querySelector("#transcript");
  transcript.innerHTML = session.turns.map(turnHtml).join("");
  transcript.scrollTop = transcript.scrollHeight;
  const progress = visualProgress(session.turns);
  app.querySelector("#progress-fill").style.width = `${progress}%`;
  app.querySelector("#progress-text").textContent = `${progress}%`;
}

function setState(app, label, state = "listening") {
  app.querySelector("#live-label").textContent = label;
  const dot = app.querySelector("#state-dot");
  dot.style.background = state === "speaking" ? "var(--color-accent)" : state === "thinking" ? "var(--color-warning)" : "var(--color-success)";
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function speakAssistant(text, app, onDone) {
  if (!("speechSynthesis" in window) || !text) {
    onDone?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 0.95;
  utterance.volume = 1;
  utterance.onstart = () => setState(app, "Speaking", "speaking");
  utterance.onend = () => {
    setState(app, "Listening");
    onDone?.();
  };
  utterance.onerror = () => {
    setState(app, "Listening");
    onDone?.();
  };
  window.speechSynthesis.speak(utterance);
}

function latestAssistantText(session) {
  return [...session.turns].reverse().find((turn) => turn.role === "assistant")?.text || "";
}

export async function renderDiscover(app, navigate) {
  app.innerHTML = `
    <main class="screen discover">
      <aside class="sidebar">
        <p class="logo">⬡ LIGHTHOUSE</p>
        <div class="nav-item active">Discovery conversation</div>
        <div class="nav-item">Your profile</div>
        <div class="nav-item">Settings</div>
        <section class="progress-panel">
          <label>Session progress</label>
          <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
          <div class="progress-text" id="progress-text">0%</div>
        </section>
      </aside>
      <section class="conversation">
        <header class="conversation-header">
          <h1>Human Clarity Discovery</h1>
          <div class="live-state"><span class="state-dot" id="state-dot"></span><span id="live-label">Starting</span></div>
        </header>
        <section class="transcript" id="transcript" aria-live="polite"></section>
        <section class="input-area">
          <div class="mic-row">
            <button class="mic-button" id="mic" title="Start or stop voice input">Mic</button>
            <div class="voice-panel">
              <span class="hint" id="hint">Click Mic to start voice input. Lighthouse will speak replies aloud.</span>
              <div class="meter" aria-label="Microphone input level">
                <div class="meter-fill" id="meter-fill"></div>
              </div>
              <div class="interim" id="interim"></div>
            </div>
          </div>
          <form class="text-fallback" id="text-form">
            <input id="message" placeholder="Or type your response..." autocomplete="off" />
            <button class="primary-button" type="submit">Send</button>
          </form>
          <div class="session-actions">
            <button class="secondary-button" id="replay">Replay last question</button>
            <button class="secondary-button" id="profile">Generate profile</button>
            <button class="secondary-button" id="new-session">New session</button>
          </div>
        </section>
      </section>
    </main>
  `;

  setState(app, "Thinking", "thinking");
  let session = null;
  let recognition = null;
  let recognizing = false;
  let micStream = null;
  let audioContext = null;
  let analyser = null;
  let meterFrame = 0;
  let pausedForAssistant = false;

  const hint = app.querySelector("#hint");
  const micButton = app.querySelector("#mic");
  const interim = app.querySelector("#interim");
  const meterFill = app.querySelector("#meter-fill");

  function stopMeter() {
    if (meterFrame) window.cancelAnimationFrame(meterFrame);
    meterFrame = 0;
    meterFill.style.width = "var(--progress-empty)";
    if (audioContext) void audioContext.close();
    audioContext = null;
    analyser = null;
    if (micStream) {
      for (const track of micStream.getTracks()) track.stop();
    }
    micStream = null;
  }

  async function startMeter() {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      if (!analyser) return;
      analyser.getByteFrequencyData(samples);
      const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      const level = Math.min(100, Math.round((average / 160) * 100));
      meterFill.style.width = `${level}%`;
      meterFrame = window.requestAnimationFrame(draw);
    };
    draw();
  }

  function stopRecognition() {
    recognizing = false;
    micButton.classList.remove("active");
    try {
      recognition?.stop();
    } catch {
      // no-op: browsers throw if recognition is already stopped
    }
    stopMeter();
  }

  function startRecognition() {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      hint.textContent = "This browser does not expose speech recognition. Use Chrome or type your response below.";
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      hint.textContent = "Microphone access is not available in this browser context.";
      return;
    }
    if (recognizing) {
      stopRecognition();
      hint.textContent = "Voice input stopped. Text fallback is still available.";
      return;
    }

    recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognizing = true;
    micButton.classList.add("active");
    hint.textContent = "Listening. Speak naturally; pauses are okay.";
    setState(app, "Listening");

    void startMeter().catch(() => {
      hint.textContent = "Microphone permission was blocked. Text fallback is still available.";
      stopRecognition();
    });

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const phrase = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += phrase;
        else interimText += phrase;
      }
      interim.textContent = interimText ? `Hearing: ${interimText}` : "";
      if (finalText.trim()) {
        pausedForAssistant = true;
        recognition.stop();
        void submitParticipantText(finalText.trim(), true);
      }
    };

    recognition.onerror = () => {
      hint.textContent = "Voice input hit a browser error. Text fallback is still available.";
      stopRecognition();
    };

    recognition.onend = () => {
      if (!recognizing) return;
      if (pausedForAssistant) return;
      try {
        recognition.start();
      } catch {
        hint.textContent = "Voice input paused. Click Mic to resume.";
        stopRecognition();
      }
    };

    try {
      recognition.start();
    } catch {
      hint.textContent = "Voice input could not start. Text fallback is still available.";
      stopRecognition();
    }
  }

  async function submitParticipantText(text, fromVoice = false) {
    if (!session) return;
    setState(app, "Thinking", "thinking");
    hint.textContent = fromVoice ? "Heard you. Lighthouse is thinking." : "Lighthouse is thinking.";
    interim.textContent = "";
    try {
      const payload = await postJson("/api/conversation/text", { sessionId: session.id, text });
      session = payload.session;
      updateTranscript(app, session);
      speakAssistant(latestAssistantText(session), app, () => {
        pausedForAssistant = false;
        if (recognizing && recognition) {
          hint.textContent = "Listening. Speak naturally; pauses are okay.";
          try {
            recognition.start();
          } catch {
            hint.textContent = "Voice input paused. Click Mic to resume.";
          }
        }
      });
    } catch {
      hint.textContent = "Something went wrong. Please try again.";
      pausedForAssistant = false;
      setState(app, "Listening");
    }
  }

  try {
    const payload = await postJson("/api/sessions", { context: "employment" });
    session = payload.session;
    saveSessionId(session.id);
    updateTranscript(app, session);
    speakAssistant(latestAssistantText(session), app);
  } catch {
    setState(app, "Offline", "thinking");
    hint.textContent = "The Discovery backend is not available.";
  }

  micButton.addEventListener("click", startRecognition);
  app.querySelector("#replay").addEventListener("click", () => {
    if (!session) return;
    speakAssistant(latestAssistantText(session), app);
  });

  app.querySelector("#text-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!session) return;
    const input = app.querySelector("#message");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    await submitParticipantText(text);
  });

  app.querySelector("#profile").addEventListener("click", async () => {
    if (!session) return;
    setState(app, "Generating", "thinking");
    try {
      await postJson("/api/profile/generate", { sessionId: session.id });
      navigate(`/profile/${session.id}`);
    } catch {
      app.querySelector("#hint").textContent = "Profile generation is not available.";
      setState(app, "Listening");
    }
  });

  app.querySelector("#new-session").addEventListener("click", () => navigate("/"));
}
