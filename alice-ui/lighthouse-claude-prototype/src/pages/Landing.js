export function renderLanding(app, navigate) {
  app.innerHTML = `
    <main class="screen landing gold-bar">
      <section class="landing-content">
        <div class="badge">HUMAN CLARITY PLATFORM</div>
        <h1>Be seen for who you <span class="accent">actually</span> are.</h1>
        <p class="subheadline">Lighthouse uses a real conversation to reveal how you think, work, and create - then represents you more truthfully than any resume ever could.</p>
        <div class="button-row">
          <button class="primary-button" id="start-discovery">Microphone Start my discovery</button>
          <button class="secondary-button" id="how-it-works">See how it works</button>
        </div>
        <p class="promise">Free for participants. Always. No judgment. No scoring.</p>
      </section>
      <section class="beacon-panel">
        <div class="beacon">
          <div class="beam" aria-hidden="true"></div>
          <p>The beam is discovery. The harbor is true alignment.</p>
        </div>
      </section>
    </main>
  `;

  app.querySelector("#start-discovery").addEventListener("click", () => navigate("/start"));
  app.querySelector("#how-it-works").addEventListener("click", () => navigate("/start"));
}
