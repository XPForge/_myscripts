export type OpportunityPromptReference = {
  id: string;
  purpose: string;
  protected: true;
  notes: string;
};

export const opportunityPromptRefs: OpportunityPromptReference[] = [
  {
    id: "opportunity-discovery.discovery-agent.v1",
    purpose: "Guide free-flowing opportunity reality discovery.",
    protected: true,
    notes: "Reference only. Protected prompt content must remain server-side.",
  },
  {
    id: "opportunity-discovery.artifact-synthesis.v1",
    purpose: "Guide evidence-linked opportunity artifact synthesis.",
    protected: true,
    notes: "Reference only. Protected prompt content must remain server-side.",
  },
];
