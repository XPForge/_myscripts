export type HumanPromptReference = {
  id: string;
  purpose: string;
  protected: true;
  notes: string;
};

export const humanPromptRefs: HumanPromptReference[] = [
  {
    id: "human-discovery.discovery-agent.v1",
    purpose: "Guide free-flowing Human Discovery conversation.",
    protected: true,
    notes: "Reference only. Protected prompt content must remain server-side.",
  },
  {
    id: "human-discovery.artifact-synthesis.v1",
    purpose: "Guide evidence-linked artifact synthesis.",
    protected: true,
    notes: "Reference only. Protected prompt content must remain server-side.",
  },
];
