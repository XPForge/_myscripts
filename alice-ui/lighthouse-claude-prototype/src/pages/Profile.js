import { downloadMarkdown, postJson } from "../services/APIService.js";
import { loadSessionId } from "../services/SessionManager.js";

function sectionText(profile, heading) {
  const match = profile.match(new RegExp(`${heading}[\\s\\S]*?(?=\\nSECTION \\d+|$)`, "i"));
  return match ? match[0].replace(new RegExp(`^${heading}`, "i"), "").trim() : "Generated profile content will appear here after synthesis.";
}

function card(label, body, full = false) {
  return `
    <article class="profile-card ${full ? "full" : ""}">
      <div class="card-label">${label}</div>
      <div class="card-body">${escapeHtml(body)}</div>
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

export async function renderProfile(app, navigate, routeSessionId) {
  const sessionId = routeSessionId || loadSessionId();
  app.innerHTML = `
    <main class="profile-screen">
      <header class="profile-header">
        <div>
          <h1>Human Clarity Profile</h1>
          <div class="descriptor">Pattern-rich, participant-owned, discovery-led</div>
        </div>
        <button class="primary-button" id="download">Download profile</button>
      </header>
      <section class="profile-grid" id="profile-grid">
        ${card("Loading", "Retrieving profile...", true)}
      </section>
      <section class="share-row">
        <button class="ghost-button" id="linkedin">Share to LinkedIn</button>
        <button class="ghost-button" id="copy">Copy link</button>
        <button class="ghost-button" id="email">Send to employer</button>
        <button class="ghost-button" id="back">Back to discovery</button>
      </section>
    </main>
  `;

  let profile = "";
  try {
    const payload = await postJson("/api/sessions/get", { sessionId });
    profile = payload.session.profileMarkdown || "No generated profile found for this session.";
  } catch {
    profile = "No generated profile found for this session.";
  }

  app.querySelector("#profile-grid").innerHTML = [
    card("Lighthouse Summary", sectionText(profile, "SECTION 12 - LIGHTHOUSE SUMMARY"), true),
    card("Thinking Style", sectionText(profile, "SECTION 4 - THINKING STYLE")),
    card("Natural Strengths", sectionText(profile, "SECTION 3 - NATURAL STRENGTHS")),
    card("Thrives When", sectionText(profile, "SECTION 8 - ENVIRONMENTAL FIT")),
    card("Potential Blind Spots", sectionText(profile, "SECTION 11 - POTENTIAL BLIND SPOTS")),
    card("Full Profile", profile, true),
  ].join("");

  app.querySelector("#download").addEventListener("click", () => {
    downloadMarkdown(`lighthouse-profile-${sessionId}.md`, profile);
  });
  app.querySelector("#copy").addEventListener("click", () => {
    void navigator.clipboard?.writeText(window.location.href);
  });
  app.querySelector("#linkedin").addEventListener("click", () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, "_blank");
  });
  app.querySelector("#email").addEventListener("click", () => {
    window.location.href = `mailto:?subject=Lighthouse Profile&body=${encodeURIComponent(window.location.href)}`;
  });
  app.querySelector("#back").addEventListener("click", () => navigate("/discover"));
}
