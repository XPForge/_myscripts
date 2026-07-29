// Tracks the last page a signed-in participant was on so the landing page
// (the single entry point / gateway for password-protected pages) can send
// a returning, already-authenticated visitor straight back there instead of
// making them click through again.
const LAST_VISITED_PAGE_KEY = "lighthouse.lastVisitedPage";

export function saveLastVisitedPage(path: string): void {
  try {
    localStorage.setItem(LAST_VISITED_PAGE_KEY, path);
  } catch {
    // ignore storage errors
  }
}

export function loadLastVisitedPage(): string | null {
  try {
    return localStorage.getItem(LAST_VISITED_PAGE_KEY);
  } catch {
    return null;
  }
}

export function clearLastVisitedPage(): void {
  try {
    localStorage.removeItem(LAST_VISITED_PAGE_KEY);
  } catch {
    // ignore storage errors
  }
}
