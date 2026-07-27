// ntfy.sh topic names are public unless self-hosted — this one is randomized
// to be hard to guess. Subscribe to it in the ntfy app/website to receive
// the push notifications described below.
const LEAD_ALERT_NTFY_TOPIC = "lighthouse-yc-lead-alert-p7z3k9qv";

export function isYCombinatorEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim() ?? "";
  return domain.includes("ycombinator");
}

// Best-effort, fire-and-forget push for every captured email — never blocks
// or fails the caller's flow if the notification itself fails to send.
export function notifyNewLead(name: string, email: string): void {
  const isYC = isYCombinatorEmail(email);
  const displayName = name.trim() || "Someone";
  fetch(`https://ntfy.sh/${LEAD_ALERT_NTFY_TOPIC}`, {
    method: "POST",
    body: isYC
      ? `${displayName} just signed up with a YCombinator email: ${email}`
      : `${displayName} started Discovery: ${email}`,
    headers: {
      Title: isYC ? "YC lead on Lighthouse" : "New Lighthouse user",
      Priority: isYC ? "urgent" : "default",
      Tags: isYC ? "rotating_light" : "wave",
    },
  }).catch(() => {
    // Best-effort alert only — never block or fail the caller because of it.
  });
}
