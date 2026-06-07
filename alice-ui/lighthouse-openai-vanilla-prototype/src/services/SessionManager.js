const KEY = "lighthouse.claudePrototype.sessionId";

export function saveSessionId(sessionId) {
  window.sessionStorage.setItem(KEY, sessionId);
}

export function loadSessionId() {
  return window.sessionStorage.getItem(KEY) || "";
}

export function clearSessionId() {
  window.sessionStorage.removeItem(KEY);
}
