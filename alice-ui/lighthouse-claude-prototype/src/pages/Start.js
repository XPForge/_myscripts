export function renderStart(app, navigate) {
  app.innerHTML = `
    <main class="screen start-screen gold-bar">
      <section class="start-panel">
        <div class="step">STEP 1 OF 2 - BEFORE WE BEGIN</div>
        <h1>A few things to know</h1>
        <p>This conversation is judgment-free. There are no right or wrong answers. Lighthouse is here to understand you - not evaluate you. Everything you share is used only to build your Human Clarity Profile.</p>
        <div class="terms-box">
          Project Lighthouse is a conversational discovery and alignment platform designed to help individuals understand and articulate their natural capabilities, thinking styles, and working patterns through AI-guided conversation. Lighthouse profiles are discovery documents, not evaluations, rankings, diagnoses, or credentials.
        </div>
        <a href="#" id="terms-link">Read the full Terms of Service</a>
        <label class="checkbox-row">
          <input type="checkbox" id="terms-check" />
          <span>I have read and agree to the Terms of Service</span>
        </label>
        <button class="primary-button" id="begin" disabled>Begin my discovery -></button>
        <p class="promise hidden" id="mic-note">Microphone permission was not granted. You can continue with text fallback in the discovery screen.</p>
      </section>
    </main>
  `;

  const checkbox = app.querySelector("#terms-check");
  const begin = app.querySelector("#begin");
  const note = app.querySelector("#mic-note");

  checkbox.addEventListener("change", () => {
    begin.disabled = !checkbox.checked;
  });

  app.querySelector("#terms-link").addEventListener("click", (event) => {
    event.preventDefault();
    alert("Full Terms are stored in the Project Lighthouse Terms document. This prototype keeps the participant-facing summary short for testing.");
  });

  begin.addEventListener("click", async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        for (const track of stream.getTracks()) track.stop();
      }
      navigate("/discover");
    } catch {
      note.classList.remove("hidden");
      window.setTimeout(() => navigate("/discover"), 900);
    }
  });
}
