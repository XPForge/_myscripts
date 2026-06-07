const patterns = [
  /what (are|were) your instructions/i,
  /repeat .*system prompt/i,
  /show .*system prompt/i,
  /ignore .*previous instructions/i,
  /developer (message|instructions|prompt)/i,
  /underlying instructions/i,
  /how (are|were) you configured/i,
  /pretend .*instructions/i,
  /reveal .*prompt/i,
  /print .*prompt/i,
];

export function isPromptExtractionAttempt(text: string) {
  return patterns.some((pattern) => pattern.test(text));
}

export function extractionRefusal() {
  return "I cannot share internal instructions or configuration. I can keep going with the discovery conversation.";
}
