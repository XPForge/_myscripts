import { downloadMarkdown, postJson } from "../services/APIService.js";
import { loadSessionAccessToken, loadSessionId } from "../services/SessionManager.js";

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

function deliveryMessage(session) {
  if (!session?.email) {
    return "No email address was collected for this session. Download is available now.";
  }
  return session.profileEmailMessage || `Profile prepared for ${session.email}. Email delivery will be connected in a later build.`;
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
  const accessToken = loadSessionAccessToken();
  app.innerHTML = `
    <main class="profile-shell">
      <aside class="sidebar profile-sidebar">
        <p class="logo">LIGHTHOUSE</p>
        <div class="nav-item">Discovery conversation</div>
        <div class="nav-item active">Your profile</div>
        <a class="nav-item learn-link" href="#learn-more">Learn more</a>
        <section class="sidebar-actions">
          <button class="sidebar-primary" id="download">Download profile</button>
        </section>
        <section class="delivery-panel" id="delivery-panel">
          <span class="delivery-dot"></span>
          <p>Preparing delivery status...</p>
        </section>
      </aside>
      <section class="profile-screen">
        <header class="profile-header">
          <div>
            <h1>Human Clarity Profile</h1>
            <div class="descriptor">Pattern-rich, participant-owned, discovery-led</div>
          </div>
        </header>
        <section class="profile-grid" id="profile-grid">
          ${card("Loading", "Retrieving profile...", true)}
        </section>
        <section class="learn-more-panel" id="learn-more">
          <div class="learn-mark">L</div>
          <div>
            <div class="card-label">Learn more about Lighthouse</div>
            <h2>Participant-owned clarity for work, growth, and fit.</h2>
            <p>This space is reserved for the Lighthouse resource page, including next steps, privacy context, and ways to use the profile.</p>
            <a href="#" aria-disabled="true">Lighthouse resource coming soon</a>
          </div>
        </section>
      </section>
    </main>
  `;

  let profile = "";
  let session = null;
  try {
    const payload = await postJson("/api/sessions/get", { sessionId, accessToken });
    session = payload.session;
    profile = session.profileMarkdown || "No generated profile found for this session.";
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

  app.querySelector("#delivery-panel").innerHTML = `
    <span class="delivery-dot"></span>
    <p>${escapeHtml(deliveryMessage(session))}</p>
  `;

  app.querySelector("#download").addEventListener("click", () => {
    downloadMarkdown(`lighthouse-profile-${sessionId}.md`, profile);
  });
}
