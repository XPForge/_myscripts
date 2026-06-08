import { postJson } from "../services/APIService.js";
import { saveSession } from "../services/SessionManager.js";

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function turnHtml(turn) {
  const role = turn.role === "assistant" ? "LIGHTHOUSE" : "YOU";
  return `<article class="message ${turn.role}"><span class="speaker">${role}</span><div class="bubble">${escapeHtml(turn.text)}</div></article>`;
}

function updateTranscript(app, session) {
  const transcript = app.querySelector("#transcript");
  transcript.innerHTML = session.turns.map(turnHtml).join("");
  transcript.scrollTop = transcript.scrollHeight;
  const progress = Math.min(100, Math.max(8, session.turns.filter((turn) => turn.role === "user").length * 12 + 8));
  app.querySelector("#progress-fill").style.width = `${progress}%`;
  app.querySelector("#progress-text").textContent = `${progress}%`;
}

function setState(app, text, state = "listening") {
  app.querySelector("#live-label").textContent = text;
  app.querySelector("#state-dot").style.background =
    state === "speaking" ? "var(--color-accent)" : state === "thinking" ? "var(--color-warning)" : "var(--color-success)";
}

async function waitForIce(pc) {
  if (pc.iceGatheringState === "complete") return;
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2500);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}

export async function renderDiscover(app, navigate) {
  app.innerHTML = `
    <main class="screen discover">
      <aside class="sidebar">
        <p class="logo">LIGHTHOUSE</p>
        <div class="nav-item active">Discovery conversation</div>
        <button class="nav-item nav-button disabled" id="profile-nav" disabled>Your profile</button>
        <div class="nav-item">Settings</div>
        <section class="sidebar-actions">
          <button class="sidebar-primary pulse-attention" id="mic">Press to start discovery</button>
        </section>
        <section class="progress-panel">
          <label>Session progress</label>
          <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
          <div class="progress-text" id="progress-text">0%</div>
        </section>
      </aside>
      <section class="conversation">
        <header class="conversation-header">
          <h1>Human Clarity Discovery</h1>
          <div class="live-state"><span class="state-dot" id="state-dot"></span><span id="live-label">Ready</span></div>
        </header>
        <section class="transcript" id="transcript" aria-live="polite"></section>
        <section class="input-area">
          <div class="mic-row">
            <div class="voice-panel">
              <span class="hint" id="hint">Press the start button in the sidebar to begin realtime voice discovery.</span>
              <div class="meter"><div class="meter-fill" id="meter-fill"></div></div>
              <div class="interim" id="interim"></div>
            </div>
          </div>
          <form class="text-fallback" id="text-form">
            <input id="message" placeholder="Or type your response..." autocomplete="off" />
            <button class="primary-button" type="submit">Send</button>
          </form>
        </section>
      </section>
      <section class="busy-overlay hidden" id="profile-busy" aria-live="assertive">
        <div class="busy-panel">
          <div class="busy-spinner"></div>
          <h2>Creating your profile</h2>
          <p>Synthesizing the discovery conversation and preparing email delivery.</p>
        </div>
      </section>
    </main>`;

  let session = null;
  let pc = null;
  let dc = null;
  let stream = null;
  let audioContext = null;
  let analyser = null;
  let meterFrame = 0;
  let assistantBuffer = "";
  let profileReady = false;
  let shutdownAfterFinalResponse = false;
  let shutdownTimer = 0;
  let accessToken = "";
  const participant = JSON.parse(window.sessionStorage.getItem("lighthouse.vanilla.participant") || "{}");
  const mic = app.querySelector("#mic");
  const hint = app.querySelector("#hint");
  const interim = app.querySelector("#interim");
  const meter = app.querySelector("#meter-fill");
  const profileButton = app.querySelector("#profile-nav");
  const profileBusy = app.querySelector("#profile-busy");

  function looksProfileReady(text) {
    return /profile is ready|ready to generate|generate (your|the) profile|would you like.*profile|create your profile|move to your profile/i.test(text);
  }

  function stopMicrophoneInput() {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    stopMeter();
  }

  async function transitionToProfileReady(finalText = "") {
    if (!session || profileReady) return;
    profileReady = true;
    shutdownAfterFinalResponse = true;
    stopMicrophoneInput();
    profileButton.disabled = false;
    profileButton.classList.remove("disabled");
    profileButton.classList.add("pulse-attention");
    if (pc) {
      mic.textContent = "Finishing session";
      mic.disabled = true;
    } else {
      mic.textContent = "Discovery complete";
      mic.disabled = true;
    }
    hint.textContent = "Your profile is available in the sidebar. The microphone will close after the agent finishes.";
    setState(app, "Profile ready", "speaking");
    const estimatedSpeakingTime = Math.min(45000, Math.max(12000, finalText.length * 70));
    shutdownTimer = window.setTimeout(() => {
      if (profileReady && pc) stopRealtime();
    }, estimatedSpeakingTime);
  }

  function finishIfProfileReady() {
    if (!shutdownAfterFinalResponse || !pc) return;
    shutdownAfterFinalResponse = false;
    if (shutdownTimer) clearTimeout(shutdownTimer);
    shutdownTimer = window.setTimeout(() => {
      if (profileReady && pc) stopRealtime();
    }, 12000);
  }

  function stopMeter() {
    if (meterFrame) cancelAnimationFrame(meterFrame);
    meterFrame = 0;
    meter.style.width = "var(--progress-empty)";
    if (audioContext) void audioContext.close();
    audioContext = null;
    analyser = null;
  }

  async function startMeter(mediaStream) {
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(mediaStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      if (!analyser) return;
      analyser.getByteFrequencyData(samples);
      const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      meter.style.width = `${Math.min(100, Math.round((avg / 150) * 100))}%`;
      meterFrame = requestAnimationFrame(draw);
    };
    draw();
  }

  async function storeTurn(role, text) {
    if (!session || !text.trim()) return;
    const payload = await postJson("/api/realtime/turn", { sessionId: session.id, accessToken, role, text: text.trim() });
    session = payload.session;
    updateTranscript(app, session);
  }

  function handleRealtimeEvent(event) {
    if (event.type === "input_audio_buffer.speech_started") {
      setState(app, "Listening", "listening");
      hint.textContent = "I hear you. Take your time.";
    }
    if (event.type === "input_audio_buffer.speech_stopped") {
      setState(app, "Thinking", "thinking");
      hint.textContent = "Thinking.";
    }
    if (event.type === "conversation.item.input_audio_transcription.delta") {
      interim.textContent = event.delta ? `Hearing: ${event.delta}` : "";
    }
    if (event.type === "conversation.item.input_audio_transcription.completed") {
      interim.textContent = "";
      void storeTurn("user", event.transcript || "");
    }
    if (event.type === "response.audio_transcript.delta" || event.type === "response.output_audio_transcript.delta") {
      assistantBuffer += event.delta || "";
      setState(app, "Speaking", "speaking");
    }
    if (event.type === "response.audio_transcript.done" || event.type === "response.output_audio_transcript.done") {
      const text = event.transcript || assistantBuffer;
      assistantBuffer = "";
      void storeTurn("assistant", text).then(() => {
        if (looksProfileReady(text)) void transitionToProfileReady(text);
      });
      if (!profileReady) {
        setState(app, "Listening", "listening");
        hint.textContent = "Listening. Speak naturally.";
      }
    }
    if (event.type === "response.audio.done" || event.type === "response.output_audio.done" || event.type === "response.done") {
      finishIfProfileReady();
    }
    if (event.type === "error") {
      hint.textContent = "Realtime error. Text fallback is available.";
    }
  }

  async function startRealtime() {
    if (pc) return;
    setState(app, "Starting", "thinking");
    hint.textContent = "Starting realtime voice.";
    const payload = await postJson("/api/realtime/session", {
      name: participant.name || "",
      email: participant.email || "",
    });
    session = payload.session;
    accessToken = payload.accessToken || "";
    saveSession(session.id, accessToken);
    updateTranscript(app, session);

    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await startMeter(stream);

    const audio = new Audio();
    audio.autoplay = true;
    pc = new RTCPeerConnection();
    pc.ontrack = (event) => {
      audio.srcObject = event.streams[0];
      void audio.play();
    };
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    dc = pc.createDataChannel("oai-events");
    dc.onopen = () => {
      setState(app, "Listening", "listening");
      hint.textContent = "Live. Speak naturally; short pauses are okay.";
      mic.classList.add("active");
      mic.classList.remove("pulse-attention");
      mic.textContent = "Stop live session";
      dc.send(JSON.stringify({
        type: "response.create",
          response: {
            output_modalities: ["audio"],
          },
      }));
    };
    dc.onmessage = (message) => {
      try {
        handleRealtimeEvent(JSON.parse(message.data));
      } catch {
        // ignore non-json events
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);
    const response = await fetch(payload.realtime.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payload.realtime.token}`,
        "Content-Type": "application/sdp",
        Accept: "application/sdp",
      },
      body: pc.localDescription.sdp,
    });
    if (!response.ok) throw new Error("Realtime connection failed. Please try again.");
    await pc.setRemoteDescription({ type: "answer", sdp: await response.text() });
  }

  function stopRealtime() {
    dc?.close();
    pc?.close();
    stopMicrophoneInput();
    pc = null;
    dc = null;
    mic.classList.remove("active");
    if (shutdownTimer) clearTimeout(shutdownTimer);
    shutdownTimer = 0;
    if (!profileReady) {
      mic.classList.add("pulse-attention");
      mic.textContent = "Press to start discovery";
    } else {
      mic.textContent = "Discovery complete";
      mic.disabled = true;
    }
    setState(app, "Ready");
    hint.textContent = profileReady ? "Your profile is available in the sidebar." : "Realtime stopped. Click Live to restart.";
  }

  mic.addEventListener("click", () => {
    if (pc) stopRealtime();
    else void startRealtime().catch((error) => {
      hint.textContent = error instanceof Error ? error.message : "Realtime failed. Text fallback is available.";
      stopRealtime();
    });
  });

  app.querySelector("#text-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = app.querySelector("#message");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    if (dc?.readyState === "open") {
      dc.send(JSON.stringify({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
      }));
      dc.send(JSON.stringify({ type: "response.create", response: { output_modalities: ["audio"] } }));
      await storeTurn("user", text);
    } else {
      hint.textContent = "Start Live first for realtime voice. Then typed messages will also use the live voice session.";
    }
  });

  profileButton.addEventListener("click", async () => {
    if (!session) return;
    profileButton.disabled = true;
    profileButton.classList.remove("pulse-attention");
    profileButton.classList.add("loading");
    profileButton.textContent = "Creating profile...";
    profileBusy.classList.remove("hidden");
    setState(app, "Creating profile", "thinking");
    hint.textContent = "Creating your profile and preparing email delivery.";
    try {
      if (pc) stopRealtime();
      await postJson("/api/profile/generate", { sessionId: session.id, accessToken });
      navigate(`/profile/${session.id}`);
    } catch (error) {
      profileBusy.classList.add("hidden");
      profileButton.disabled = false;
      profileButton.classList.remove("loading");
      profileButton.classList.add("pulse-attention");
      profileButton.textContent = "Your profile";
      hint.textContent = error instanceof Error ? error.message : "Profile creation failed. Please try again.";
      setState(app, "Profile ready", "speaking");
    }
  });
}
