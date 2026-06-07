import { renderDiscover } from "./pages/Discover.js";
import { renderLanding } from "./pages/Landing.js";
import { renderProfile } from "./pages/Profile.js";
import { renderStart } from "./pages/Start.js";

const app = document.querySelector("#app");

function navigate(path) {
  window.history.pushState({}, "", path);
  render();
}

function render() {
  const path = window.location.pathname;
  if (path === "/start") return renderStart(app, navigate);
  if (path === "/discover") return void renderDiscover(app, navigate);
  if (path.startsWith("/profile/")) return void renderProfile(app, navigate, path.split("/").filter(Boolean)[1]);
  renderLanding(app, navigate);
}

window.addEventListener("popstate", render);
render();
