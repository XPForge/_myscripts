// A pool of broad, open, non-leading reflective openers. Any one of these is
// an equally valid way to start Discovery, so the exact opener is randomized
// per session rather than always being the same line. Shared across the
// realtime voice path and the text/chat path so both vary the same way.
export const DISCOVERY_OPENING_QUESTIONS = [
  "When you look across the different things you've done or experienced, what is one thread that seems to keep showing up?",
  "When you think back on the moments you've felt most like yourself, what were you doing?",
  "What's something you do that comes so naturally to you that you sometimes forget not everyone can do it?",
  "Looking across jobs, projects, or things you've built, what keeps showing up no matter what you're doing?",
  "What's a problem or challenge you solved that you're still a little proud of, and what made it feel worth doing?",
] as const;

export function pickRandomOpeningQuestion(): string {
  const index = Math.floor(Math.random() * DISCOVERY_OPENING_QUESTIONS.length);
  return DISCOVERY_OPENING_QUESTIONS[index];
}
