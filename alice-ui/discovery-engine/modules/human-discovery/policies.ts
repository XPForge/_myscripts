export type HumanPolicyReference = {
  id: string;
  purpose: string;
  notes: string;
};

export const humanPolicyRefs: HumanPolicyReference[] = [
  {
    id: "human-discovery.output-boundaries.v1",
    purpose: "Define Human Discovery output boundaries without exposing policy text.",
    notes: "Placeholder reference. Full policy content belongs in protected server-side configuration.",
  },
  {
    id: "human-discovery.evidence-requirements.v1",
    purpose: "Define evidence expectations for Human Discovery artifacts.",
    notes: "Placeholder reference. Full policy content belongs in protected server-side configuration.",
  },
];
