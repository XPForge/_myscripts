const ID_KEY = "lighthouse.openAiPrototype.sessionId";
const TOKEN_KEY = "lighthouse.openAiPrototype.sessionAccessToken";

export function saveSession(sessionId, accessToken) {
  window.sessionStorage.setItem(ID_KEY, sessionId);
  window.sessionStorage.setItem(TOKEN_KEY, accessToken || "");
}

export function saveSessionId(sessionId) {
  window.sessionStorage.setItem(ID_KEY, sessionId);
}

export function loadSessionId() {
  return window.sessionStorage.getItem(ID_KEY) || "";
}

export function loadSessionAccessToken() {
  return window.sessionStorage.getItem(TOKEN_KEY) || "";
}

export function clearSessionId() {
  window.sessionStorage.removeItem(ID_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
}
