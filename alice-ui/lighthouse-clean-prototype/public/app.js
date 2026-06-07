const state = {
  sessionId: "",
  recorder: null,
  chunks: [],
  profileMarkdown: "",
};

const el = {
  context: document.querySelector("#context"),
  start: document.querySelector("#start"),
  record: document.querySelector("#record"),
  profile: document.querySelector("#profile"),
  download: document.querySelector("#download"),
  status: document.querySelector("#status"),
  transcript: document.querySelector("#transcript"),
  form: document.querySelector("#text-form"),
  message: document.querySelector("#message"),
  send: document.querySelector("#send"),
  profileOutput: document.querySelector("#profile-output"),
};

function setStatus(text) {
  el.status.textContent = text;
}

function setActive(active) {
  el.record.disabled = !active;
  el.profile.disabled = !active;
  el.message.disabled = !active;
  el.send.disabled = !active;
}

function renderTurns(turns) {
  el.transcript.innerHTML = "";
  for (const turn of turns) {
    const node = document.createElement("article");
    node.className = `turn ${turn.role}`;

    const role = document.createElement("span");
    role.className = "role";
    role.textContent = turn.role === "assistant" ? "Lighthouse" : "You";

    const text = document.createElement("div");
    text.textContent = turn.text;

    node.append(role, text);
    el.transcript.append(node);
  }
  el.transcript.scrollTop = el.transcript.scrollHeight;
}

async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

function playAudio(base64, mimeType) {
  if (!base64 || !mimeType) return;
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  void audio.play();
}

async function startSession() {
  setStatus("Starting");
  el.start.disabled = true;
  try {
    const payload = await postJson("/api/sessions", { context: el.context.value });
    state.sessionId = payload.session.id;
    renderTurns(payload.session.turns);
    setActive(true);
    setStatus("Listening");
  } catch {
    el.start.disabled = false;
    setStatus("Unable to start");
  }
}

async function sendText(text) {
  if (!state.sessionId || !text.trim()) return;
  setStatus("Thinking");
  try {
    const payload = await postJson("/api/conversation/text", {
      sessionId: state.sessionId,
      text,
      includeAudio: false,
    });
    renderTurns(payload.session.turns);
    setStatus("Listening");
  } catch {
    setStatus("Unable to send");
  }
}

async function startRecording() {
  if (!state.sessionId || state.recorder) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  state.chunks = [];
  state.recorder = new MediaRecorder(stream);
  state.recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) state.chunks.push(event.data);
  });
  state.recorder.addEventListener("stop", async () => {
    for (const track of stream.getTracks()) track.stop();
    const blob = new Blob(state.chunks, { type: state.recorder.mimeType || "audio/webm" });
    state.recorder = null;
    state.chunks = [];
    el.record.classList.remove("recording");
    el.record.textContent = "Hold To Speak";
    await sendAudio(blob);
  });
  state.recorder.start();
  el.record.classList.add("recording");
  el.record.textContent = "Release To Send";
  setStatus("Still listening");
}

function stopRecording() {
  if (state.recorder && state.recorder.state !== "inactive") {
    state.recorder.stop();
  }
}

async function sendAudio(blob) {
  setStatus("Transcribing");
  try {
    const response = await fetch(`/api/conversation/audio?sessionId=${encodeURIComponent(state.sessionId)}`, {
      method: "POST",
      headers: { "Content-Type": blob.type || "audio/webm" },
      body: blob,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Audio request failed.");
    renderTurns(payload.session.turns);
    playAudio(payload.audioBase64, payload.audioMimeType);
    setStatus("Listening");
  } catch {
    setStatus("Unable to process audio");
  }
}

async function generateProfile() {
  if (!state.sessionId) return;
  setStatus("Generating");
  try {
    const payload = await postJson("/api/profile/generate", { sessionId: state.sessionId });
    state.profileMarkdown = payload.profileMarkdown || "";
    el.profileOutput.hidden = false;
    el.profileOutput.textContent = state.profileMarkdown;
    el.download.disabled = !state.profileMarkdown;
    setStatus("Profile ready");
  } catch {
    setStatus("Unable to generate");
  }
}

function downloadProfile() {
  if (!state.profileMarkdown) return;
  const url = URL.createObjectURL(new Blob([state.profileMarkdown], { type: "text/markdown" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `lighthouse-profile-${state.sessionId}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

el.start.addEventListener("click", () => void startSession());
el.record.addEventListener("pointerdown", () => void startRecording());
el.record.addEventListener("pointerup", stopRecording);
el.record.addEventListener("pointerleave", stopRecording);
el.profile.addEventListener("click", () => void generateProfile());
el.download.addEventListener("click", downloadProfile);
el.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = el.message.value;
  el.message.value = "";
  void sendText(text);
});
