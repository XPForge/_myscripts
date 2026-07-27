import type { OzBehaviorTag, OzConversationInput } from "./ozConversationEvaluatorTypes.ts";

export type OzSimulationScenario = {
  id: string;
  name: string;
  transcript: OzConversationInput;
  expectedDetections: OzBehaviorTag[];
};

export const ozConversationScenarios: OzSimulationScenario[] = [
  {
    id: "strong-alice",
    name: "Strong Alice",
    transcript: {
      sessionId: "sim-strong-alice",
      model: "simulation-only",
      discoveryModeId: "native-discovery-realtime2-v0.1",
      turns: [
        { role: "assistant", content: "When you look back across the things you've done, what's the one thread that seems to stay with you?" },
        { role: "user", content: "I keep ending up in messy early projects where nobody knows what the shape is yet." },
        { role: "assistant", content: "It sounds like the live part for you is finding the first shape inside ambiguity, not just executing once the path is obvious. What tends to pull you into those messy early projects?" },
        { role: "user", content: "Usually there is a customer problem that feels important and a team that is stuck." },
        { role: "assistant", content: "So the pattern connects customer pressure, stuck teams, and your instinct to make the problem usable. Where do you usually create the most movement first?" },
      ],
    },
    expectedDetections: ["ASK_SINGLE", "REFLECT_UNDERSTANDING", "SYNTHESIS", "GROUNDED_FOLLOWUP", "NATURAL_MOVEMENT"],
  },
  {
    id: "question-stack-failure",
    name: "Question Stack Failure",
    transcript: {
      sessionId: "sim-question-stack",
      turns: [
        { role: "user", content: "I liked building the prototype more than presenting it." },
        { role: "assistant", content: "What did you build? Why did it matter? Who was it for? How did the presentation go?" },
      ],
    },
    expectedDetections: ["QUESTION_STACK"],
  },
  {
    id: "premature-advice-failure",
    name: "Premature Advice Failure",
    transcript: {
      sessionId: "sim-premature-advice",
      turns: [
        { role: "user", content: "I like turning unclear requests into something concrete." },
        { role: "assistant", content: "You should apply for product manager roles because that would be a great fit for your ability to clarify ambiguity." },
      ],
    },
    expectedDetections: ["ROLE_RECOMMENDATION_DRIFT", "ADVICE_DRIFT"],
  },
  {
    id: "premature-profile-failure",
    name: "Premature Profile Failure",
    transcript: {
      sessionId: "sim-premature-profile",
      turns: [
        { role: "user", content: "I have only told you one story so far." },
        { role: "assistant", content: "That's enough to complete your profile. Your capability profile shows strategic creativity, leadership strengths, and strong opportunity alignment." },
      ],
    },
    expectedDetections: ["PREMATURE_PROFILE_OUTPUT", "DISCOVERY_CUTOFF"],
  },
  {
    id: "redirect-recovery",
    name: "Redirect Recovery",
    transcript: {
      sessionId: "sim-redirect-recovery",
      turns: [
        { role: "user", content: "I started in operations but moved toward design systems." },
        { role: "assistant", content: "What operations work did you do? Why did you leave? Which design tools did you use?" },
        { role: "user", content: "Actually, let's focus on why design systems caught my attention." },
        { role: "assistant", content: "You're redirecting toward design systems, so let's stay there. What about design systems caught your attention first?" },
      ],
    },
    expectedDetections: ["QUESTION_STACK", "PARTICIPANT_AUTHORITY_RESPECTED"],
  },
  {
    id: "nerfed-overcontrolled-feel",
    name: "Nerfed/Overcontrolled Feel",
    transcript: {
      sessionId: "sim-nerfed",
      turns: [
        { role: "user", content: "I want to talk through a strange project that changed how I work." },
        { role: "assistant", content: "For compliance, I will ask exactly the next question in this intake section. On a scale of 1 to 5, rate yourself before we continue." },
      ],
    },
    expectedDetections: ["SCRIPTED_INTAKE_FEEL", "OVERCONTROLLED_OR_NERFED_FEEL"],
  },
];
