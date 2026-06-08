const extractionPatterns = [
  /\bwhat (are|were) your (system |developer |hidden |internal )?(instructions|rules|prompt)\b/i,
  /\brepeat (your|the) (system |developer |hidden |internal )?(instructions|prompt|message)\b/i,
  /\bshow (me )?(your|the) (system |developer |hidden |internal )?(instructions|prompt|message)\b/i,
  /\bignore (all )?(previous|prior) instructions\b/i,
  /\breveal (your|the) (system |developer |hidden |internal )?(instructions|prompt|message)\b/i,
  /\bprint (your|the) (system |developer |hidden |internal )?(instructions|prompt|message)\b/i,
  /\btell me the exact prompt\b/i,
  /\bdeveloper message\b/i,
  /\bhidden instructions\b/i,
];

const leakPatterns = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/,
  /\bOPENAI_API_KEY\s*=\s*\S+/i,
  /\b(system|developer|wrapper)\s+prompt\b/i,
  /\bhidden instructions\b/i,
  /\bignore previous instructions\b/i,
  /\bAuthorization:\s*Bearer\s+\S+/i,
  /\bprocess\.env\.[A-Z0-9_]+\s*=\s*\S+/i,
  /\bat\s+\S+\s+\([A-Za-z]:\\[^)]+\)/,
  /\braw provider (payload|response|error)\b/i,
];

const internalInstructionMarkers = [
  "You are conducting a warm, natural discovery conversation.",
  "Use associative discovery rather than linear questioning.",
  "The preferred rhythm is: participant answer -> concise synthesis -> possible pattern or implication -> one adjacent question.",
  "Create a Human Clarity Profile from the conversation.",
  "Realtime behavior: let the participant finish",
];

export const promptExtractionFallback = "I can't share internal instructions, but I can continue the discovery conversation.";
export const responseLeakFallback = "I had trouble processing that safely. Please try again.";

export function isPromptExtractionAttempt(text: string) {
  return extractionPatterns.some((pattern) => pattern.test(text));
}

export function containsProtectedLeak(text: string) {
  return leakPatterns.some((pattern) => pattern.test(text)) || internalInstructionMarkers.some((marker) => text.includes(marker));
}

export function sanitizeAssistantText(text: string) {
  const trimmed = text.trim();
  return containsProtectedLeak(trimmed)
    ? { blocked: true, text: responseLeakFallback }
    : { blocked: false, text: trimmed };
}

export function sanitizeProfileMarkdown(markdown: string) {
  const sanitized = sanitizeAssistantText(markdown);
  return sanitized.blocked ? responseLeakFallback : sanitized.text;
}
