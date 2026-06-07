const extractionPatterns = [
  /what (are|were) your instructions/i,
  /repeat (your|the) system prompt/i,
  /show (your|the) system prompt/i,
  /ignore (all )?(previous|prior) instructions/i,
  /developer (message|instructions|prompt)/i,
  /underlying instructions/i,
  /how (were|are) you configured/i,
  /pretend .* instructions/i,
  /reveal .* prompt/i,
  /print .* prompt/i,
];

export function isPromptExtractionAttempt(text: string) {
  return extractionPatterns.some((pattern) => pattern.test(text));
}

export function promptExtractionRefusal() {
  return "I cannot share internal instructions or configuration. I can continue the discovery conversation with you.";
}
