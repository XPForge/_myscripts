import type { SynthesisProvider } from "../types.js";

function userMaterial(turns: { role: string; text: string }[]) {
  return turns
    .filter((turn) => turn.role === "user")
    .map((turn) => turn.text)
    .join(" ");
}

export function createMockSynthesisProvider(): SynthesisProvider {
  return {
    async generateProfile(input) {
      const material = userMaterial(input.turns) || "The participant has begun the discovery process but has not yet provided much material.";
      return {
        profileMarkdown: `SECTION 1 - EXECUTIVE SUMMARY
This mock Human Clarity Profile is generated from the current transcript to test the full Lighthouse flow. The participant appears to be beginning to surface patterns in attention, motivation, and working conditions. Raw observed material includes: "${material.slice(0, 500)}"

SECTION 2 - CORE THEMES
- A developing pattern around what draws attention.
- A need to preserve participant language before drawing conclusions.
- Early evidence only; this profile should be treated as provisional.

SECTION 3 - NATURAL STRENGTHS
The strongest visible strength in this mock pass is reflective self-description. More evidence would be needed before naming stable capabilities.

SECTION 4 - THINKING STYLE
The transcript suggests a meaning-oriented thinking style that looks for connective tissue rather than isolated facts. This is an inferred theme, not a confirmed conclusion.

SECTION 5 - LEARNING STYLE
The participant likely benefits from examples, lived context, and conversation that allows ideas to unfold. Evidence strength: early.

SECTION 6 - CREATIVE PROFILE
Creative signal is not yet fully established. The system should continue looking for how the participant notices, shapes, builds, repairs, or expresses.

SECTION 7 - COLLABORATION PROFILE
Collaboration patterns are not yet confirmed. Future discovery should explore what kind of group environment expands or suppresses the participant's contribution.

SECTION 8 - ENVIRONMENTAL FIT
Thrives In: Environments that allow reflection, nuance, and honest naming.
Suppressed Or Distorted In: Environments that rush to labels, force premature certainty, or reduce complexity to checklist categories.

SECTION 9 - UNIQUE CONTRIBUTIONS
The participant's unique contribution is not yet known. The transcript has begun to create room for it to emerge.

SECTION 10 - OPPORTUNITY ALIGNMENT
Opportunity alignment is not ready for strong claims. Current evidence supports continued discovery rather than recommendation.

SECTION 11 - POTENTIAL BLIND SPOTS
Potential blind spots cannot responsibly be named yet. Any future blind spot language should frame strengths operating without sufficient constraints.

SECTION 12 - LIGHTHOUSE SUMMARY
If someone truly understood this person, they would not rush to compress them into a role, score, or category. Even in this mock profile, the important thing is the method: listen first, preserve the raw signal, distinguish observation from inference, and let the participant remain the authority over meaning.`,
      };
    },
  };
}
