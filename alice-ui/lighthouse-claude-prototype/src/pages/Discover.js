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
            <button class="mic-button" id="mic" title="Voice capture is mocked until voice providers are enabled">Mic</button>
            <span class="hint" id="hint">Mock mode is ready. Type a response to test the full flow.</span>
          </div>
          <form class="text-fallback" id="text-form">
            <input id="message" placeholder="Or type your response..." autocomplete="off" />
            <button class="primary-button" type="submit">Send</button>
          </form>
          <div class="session-actions">
            <button class="secondary-button" id="profile">Generate profile</button>
            <button class="secondary-button" id="new-session">New session</button>
          </div>
        </section>
      </section>
    </main>
  `;

  setState(app, "Thinking", "thinking");
  let session = null;
  try {
    const payload = await postJson("/api/sessions", { context: "employment" });
    session = payload.session;
    saveSessionId(session.id);
    updateTranscript(app, session);
    setState(app, "Listening");
  } catch {
    setState(app, "Offline", "thinking");
    app.querySelector("#hint").textContent = "The mock backend is not available.";
  }

  app.querySelector("#mic").addEventListener("click", () => {
    app.querySelector("#hint").textContent = "Voice capture is reserved for the optional voice layer. Text mode exercises the same transcript and Discovery pipeline.";
  });

  app.querySelector("#text-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!session) return;
    const input = app.querySelector("#message");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    setState(app, "Thinking", "thinking");
    try {
      const payload = await postJson("/api/conversation/text", { sessionId: session.id, text });
      session = payload.session;
      updateTranscript(app, session);
      setState(app, "Listening");
    } catch {
      app.querySelector("#hint").textContent = "Something went wrong. Please try again.";
      setState(app, "Listening");
    }
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
