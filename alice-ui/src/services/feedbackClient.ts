const SUBMIT_FEEDBACK_API_URL = "/api/submit-feedback";

export async function submitDiscoveryFeedback(
  participantName: string,
  participantEmail: string,
  feedbackText: string,
  inputMode: "typed" | "voice",
  consentToUseAsTestimonial: boolean,
  sessionId?: string
): Promise<void> {
  const response = await fetch(SUBMIT_FEEDBACK_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(sessionId ? { "X-Lighthouse-Session-Id": sessionId } : {}) },
    body: JSON.stringify({ participantName, participantEmail, feedbackText, inputMode, consentToUseAsTestimonial }),
  });

  if (!response.ok) {
    let errorMessage = `Unable to send feedback: ${response.status}`;
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string") errorMessage = payload.error;
    } catch {
      // keep default message
    }
    throw new Error(errorMessage);
  }
}
