import type { AgentSchema } from "../core/AgentDefinition";

export const DiscoverySchema: AgentSchema = {
  sections: [
    {
      id: "identity-narrative",
      title: "Identity Narrative",
      description:
        "How the participant describes themselves, their story, recurring life themes, self-perception, and desired perception.",
      fields: [
        {
          id: "selfDescription",
          name: "Self Description",
          description: "How the participant describes who they are.",
          required: false,
          type: "string",
        },
        {
          id: "personalNarrative",
          name: "Personal Narrative",
          description: "Stories, experiences, and context the participant uses to explain themselves.",
          required: false,
          type: "string",
        },
        {
          id: "lifeThemes",
          name: "Life Themes",
          description: "Recurring themes across the participant's life and work.",
          required: false,
          type: "array",
        },
        {
          id: "selfPerception",
          name: "Self Perception",
          description: "How the participant appears to understand themselves.",
          required: false,
          type: "string",
        },
        {
          id: "desiredPerception",
          name: "Desired Perception",
          description: "How the participant wants to be understood by others.",
          required: false,
          type: "string",
        },
      ],
    },
    {
      id: "strengths-and-capabilities",
      title: "Strengths And Capabilities",
      description:
        "Demonstrated abilities, learned skills, natural strengths, and recurring competencies.",
      fields: [
        {
          id: "demonstratedAbilities",
          name: "Demonstrated Abilities",
          description: "Abilities shown through participant examples and lived experience.",
          required: false,
          type: "array",
        },
        {
          id: "learnedSkills",
          name: "Learned Skills",
          description: "Skills the participant has developed through practice, work, or study.",
          required: false,
          type: "array",
        },
        {
          id: "naturalStrengths",
          name: "Natural Strengths",
          description: "Strengths that appear to come naturally or repeatedly show up.",
          required: false,
          type: "array",
        },
        {
          id: "recurringCompetencies",
          name: "Recurring Competencies",
          description: "Capabilities that recur across different settings or stories.",
          required: false,
          type: "array",
        },
      ],
    },
    {
      id: "motivators",
      title: "Motivators",
      description:
        "Sources of energy, drivers, interests, and engagement factors.",
      fields: [
        {
          id: "sourcesOfEnergy",
          name: "Sources Of Energy",
          description: "Activities, contexts, or conditions that energize the participant.",
          required: false,
          type: "array",
        },
        {
          id: "drivers",
          name: "Drivers",
          description: "Underlying forces that seem to move the participant toward action.",
          required: false,
          type: "array",
        },
        {
          id: "interests",
          name: "Interests",
          description: "Topics, domains, or activities that consistently attract the participant.",
          required: false,
          type: "array",
        },
        {
          id: "engagementFactors",
          name: "Engagement Factors",
          description: "Conditions that increase attention, commitment, or involvement.",
          required: false,
          type: "array",
        },
      ],
    },
    {
      id: "values",
      title: "Values",
      description:
        "Guiding principles, priorities, and what matters most to the participant.",
      fields: [
        {
          id: "guidingPrinciples",
          name: "Guiding Principles",
          description: "Principles that appear to guide participant choices and preferences.",
          required: false,
          type: "array",
        },
        {
          id: "priorities",
          name: "Priorities",
          description: "What the participant appears to prioritize when making tradeoffs.",
          required: false,
          type: "array",
        },
        {
          id: "whatMattersMost",
          name: "What Matters Most",
          description: "The people, outcomes, conditions, or meanings the participant treats as most important.",
          required: false,
          type: "string",
        },
      ],
    },
    {
      id: "work-style",
      title: "Work Style",
      description:
        "Preferred ways of working, collaboration preferences, structure preferences, and execution preferences.",
      fields: [
        {
          id: "preferredWaysOfWorking",
          name: "Preferred Ways Of Working",
          description: "How the participant prefers to approach work.",
          required: false,
          type: "array",
        },
        {
          id: "collaborationPreferences",
          name: "Collaboration Preferences",
          description: "How the participant prefers to work with others.",
          required: false,
          type: "array",
        },
        {
          id: "structurePreferences",
          name: "Structure Preferences",
          description: "The amount and kind of structure that appears useful to the participant.",
          required: false,
          type: "array",
        },
        {
          id: "executionPreferences",
          name: "Execution Preferences",
          description: "How the participant prefers to move from idea to action.",
          required: false,
          type: "array",
        },
      ],
    },
    {
      id: "environment-fit",
      title: "Environment Fit",
      description:
        "Environments where the participant thrives, environmental preferences, and organizational preferences.",
      fields: [
        {
          id: "thrivingEnvironments",
          name: "Thriving Environments",
          description: "Settings where the participant appears able to do strong or meaningful work.",
          required: false,
          type: "array",
        },
        {
          id: "environmentalPreferences",
          name: "Environmental Preferences",
          description: "Environmental conditions the participant prefers.",
          required: false,
          type: "array",
        },
        {
          id: "organizationalPreferences",
          name: "Organizational Preferences",
          description: "Organizational conditions, norms, or structures that may fit the participant.",
          required: false,
          type: "array",
        },
      ],
    },
    {
      id: "growth-areas",
      title: "Growth Areas",
      description:
        "Desired growth, frustrations, development opportunities, and learning goals.",
      fields: [
        {
          id: "desiredGrowth",
          name: "Desired Growth",
          description: "Areas where the participant wants to grow.",
          required: false,
          type: "array",
        },
        {
          id: "frustrations",
          name: "Frustrations",
          description: "Frustrations that may reveal unmet needs or development opportunities.",
          required: false,
          type: "array",
        },
        {
          id: "developmentOpportunities",
          name: "Development Opportunities",
          description: "Possible areas for development, without treating them as deficits.",
          required: false,
          type: "array",
        },
        {
          id: "learningGoals",
          name: "Learning Goals",
          description: "Skills, knowledge, or experiences the participant wants to pursue.",
          required: false,
          type: "array",
        },
      ],
    },
    {
      id: "decision-style",
      title: "Decision Style",
      description:
        "Decision-making tendencies, information preferences, and risk preferences.",
      fields: [
        {
          id: "decisionMakingTendencies",
          name: "Decision-Making Tendencies",
          description: "How the participant tends to make decisions.",
          required: false,
          type: "array",
        },
        {
          id: "informationPreferences",
          name: "Information Preferences",
          description: "The kind or amount of information the participant prefers before deciding.",
          required: false,
          type: "array",
        },
        {
          id: "riskPreferences",
          name: "Risk Preferences",
          description: "How the participant appears to relate to uncertainty, risk, and tradeoffs.",
          required: false,
          type: "array",
        },
      ],
    },
    {
      id: "relationship-style",
      title: "Relationship Style",
      description:
        "Communication preferences, feedback preferences, trust formation, and collaboration tendencies.",
      fields: [
        {
          id: "communicationPreferences",
          name: "Communication Preferences",
          description: "How the participant prefers to communicate and receive communication.",
          required: false,
          type: "array",
        },
        {
          id: "feedbackPreferences",
          name: "Feedback Preferences",
          description: "How the participant prefers feedback to be given, framed, or timed.",
          required: false,
          type: "array",
        },
        {
          id: "trustFormation",
          name: "Trust Formation",
          description: "Conditions that appear to help the participant build trust.",
          required: false,
          type: "string",
        },
        {
          id: "collaborationTendencies",
          name: "Collaboration Tendencies",
          description: "Patterns in how the participant collaborates with others.",
          required: false,
          type: "array",
        },
      ],
    },
    {
      id: "opportunity-signals",
      title: "Opportunity Signals",
      description:
        "Recurring opportunity indicators, areas of potential alignment, and observed possibilities.",
      fields: [
        {
          id: "recurringOpportunityIndicators",
          name: "Recurring Opportunity Indicators",
          description: "Signals that repeatedly suggest possible areas of opportunity.",
          required: false,
          type: "array",
        },
        {
          id: "potentialAlignmentAreas",
          name: "Potential Alignment Areas",
          description: "Areas where participant patterns may align with future opportunities.",
          required: false,
          type: "array",
        },
        {
          id: "observedPossibilities",
          name: "Observed Possibilities",
          description: "Possibilities surfaced by the discovery process without becoming recommendations.",
          required: false,
          type: "array",
        },
      ],
    },
    {
      id: "unresolved-tensions",
      title: "Unresolved Tensions",
      description:
        "Internal contradictions, competing desires, competing priorities, and recurring tensions that should be preserved rather than resolved.",
      fields: [
        {
          id: "internalContradictions",
          name: "Internal Contradictions",
          description: "Coexisting truths that appear to pull in different directions.",
          required: false,
          type: "array",
        },
        {
          id: "competingDesires",
          name: "Competing Desires",
          description: "Different desires the participant appears to hold at the same time.",
          required: false,
          type: "array",
        },
        {
          id: "competingPriorities",
          name: "Competing Priorities",
          description: "Priorities that may coexist in tension without requiring immediate resolution.",
          required: false,
          type: "array",
        },
        {
          id: "recurringTensions",
          name: "Recurring Tensions",
          description: "Repeated tensions that may be important to preserve as part of human complexity.",
          required: false,
          type: "array",
        },
      ],
    },
  ],
};
