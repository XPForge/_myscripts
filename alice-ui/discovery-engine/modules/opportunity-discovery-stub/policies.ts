export type OpportunityPolicyReference = {
  id: string;
  purpose: string;
  notes: string;
};

export const opportunityPolicyRefs: OpportunityPolicyReference[] = [
  {
    id: "opportunity-discovery.output-boundaries.v1",
    purpose: "Define Opportunity Discovery output boundaries without exposing policy text.",
    notes: "Placeholder reference. Full policy content belongs in protected server-side configuration.",
  },
  {
    id: "opportunity-discovery.evidence-requirements.v1",
    purpose: "Define source-backed evidence expectations for Opportunity Discovery artifacts.",
    notes: "Placeholder reference. Full policy content belongs in protected server-side configuration.",
  },
];
