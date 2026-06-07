export function renderLanding(app, navigate) {
  app.innerHTML = `
    <main class="screen landing gold-bar">
      <section class="landing-content">
        <div class="badge">HUMAN CLARITY PLATFORM</div>
        <h1>Be seen for who you <span class="accent">actually</span> are.</h1>
        <p class="subheadline">Lighthouse uses a real conversation to reveal how you think, work, and create - then represents you more truthfully than any resume ever could.</p>
        <div class="button-row">
          <button class="primary-button" id="start-discovery">Start discovery</button>
          <button class="secondary-button" id="how-it-works">Preview the process</button>
        </div>
        <p class="promise">Free for participants. Always. No judgment. No scoring.</p>
      </section>
      <section class="beacon-panel">
        <div class="beacon">
          <div class="beam" aria-hidden="true"></div>
          <p>The beam is discovery. The harbor is true alignment.</p>
        </div>
      </section>
      <section class="modal-backdrop hidden" id="identity-modal" aria-modal="true" role="dialog">
        <form class="modal-panel" id="identity-form">
          <div class="step">STEP 1 OF 2 - YOUR DETAILS</div>
          <h2>Start your discovery</h2>
          <p>Lighthouse uses your name during the conversation and your email when preparing the profile share step.</p>
          <label>
            <span>Name</span>
            <input id="participant-name" autocomplete="name" placeholder="Your name" />
          </label>
          <label>
            <span>Email</span>
            <input id="participant-email" type="email" autocomplete="email" placeholder="you@example.com" />
          </label>
          <div class="button-row">
            <button class="primary-button" id="continue-start" type="submit" disabled>Continue</button>
            <button class="secondary-button" id="close-modal" type="button">Cancel</button>
          </div>
        </form>
      </section>
      <section class="modal-backdrop hidden" id="process-modal" aria-modal="true" role="dialog">
        <div class="modal-panel">
          <div class="step">WHAT TO EXPECT</div>
          <h2>A conversation first, a profile second</h2>
          <p>The agent will ask one question at a time, synthesize what it hears, and follow meaningful patterns instead of running a questionnaire.</p>
          <p>When enough understanding has emerged, your profile becomes available in the sidebar. You can open it when you are ready.</p>
          <div class="button-row">
            <button class="primary-button" id="process-start" type="button">Start discovery</button>
            <button class="secondary-button" id="close-process" type="button">Close</button>
          </div>
        </div>
      </section>
    </main>
  `;

  const modal = app.querySelector("#identity-modal");
  const processModal = app.querySelector("#process-modal");
  const nameInput = app.querySelector("#participant-name");
  const emailInput = app.querySelector("#participant-email");
  const continueButton = app.querySelector("#continue-start");

  function openModal() {
    modal.classList.remove("hidden");
    nameInput.focus();
  }

  function updateContinueState() {
    continueButton.disabled = !nameInput.value.trim() || !emailInput.value.trim();
  }

  app.querySelector("#start-discovery").addEventListener("click", openModal);
  app.querySelector("#how-it-works").addEventListener("click", () => processModal.classList.remove("hidden"));
  app.querySelector("#process-start").addEventListener("click", () => {
    processModal.classList.add("hidden");
    openModal();
  });
  app.querySelector("#close-process").addEventListener("click", () => processModal.classList.add("hidden"));
  app.querySelector("#close-modal").addEventListener("click", () => modal.classList.add("hidden"));
  nameInput.addEventListener("input", updateContinueState);
  emailInput.addEventListener("input", updateContinueState);
  app.querySelector("#identity-form").addEventListener("submit", (event) => {
    event.preventDefault();
    window.sessionStorage.setItem("lighthouse.vanilla.participant", JSON.stringify({
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
    }));
    navigate("/start");
  });
}
