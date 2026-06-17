import type { ArtifactPurpose } from "../core/types";
import { humanDiscoveryArtifactTemplates } from "../modules/human-discovery/artifactTemplates";
import { humanDiscoveryModuleRegistration } from "../modules/human-discovery/module";
import { humanPromptRefs } from "../modules/human-discovery/prompts";
import { humanResolutionInterpretations } from "../modules/human-discovery/resolution";
import {
  humanDiscoveryModuleId,
  humanDiscoverySchemaVersion,
} from "../modules/human-discovery/wrapper";
import { opportunityDiscoveryArtifactTemplates } from "../modules/opportunity-discovery-stub/artifactTemplates";
import { opportunityDiscoveryStubModuleRegistration } from "../modules/opportunity-discovery-stub/module";
import { opportunityPromptRefs } from "../modules/opportunity-discovery-stub/prompts";
import { opportunityResolutionInterpretations } from "../modules/opportunity-discovery-stub/resolution";
import {
  opportunityDiscoveryStubModuleId,
  opportunityDiscoveryStubSchemaVersion,
} from "../modules/opportunity-discovery-stub/wrapper";
import { createDiscoveryModuleHarnessRegistry } from "./moduleHarness";

export type HarnessVerificationCheck = {
  id: string;
  passed: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

export type HarnessVerificationResult = {
  passed: boolean;
  checks: HarnessVerificationCheck[];
};

const neutralArtifactPurposes: ArtifactPurpose[] = [
  "synthesis",
  "reflection",
  "comparison",
  "decision_support",
  "transfer",
  "record",
  "presentation",
  "custom",
];

function result(checks: HarnessVerificationCheck[]): HarnessVerificationResult {
  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
}

function check(
  id: string,
  passed: boolean,
  message: string,
  metadata?: Record<string, unknown>
): HarnessVerificationCheck {
  return { id, passed, message, metadata };
}

function promptRefsAreReferencesOnly(
  refs: Array<{ id: string; protected?: boolean; notes?: string }>
): boolean {
  return refs.every((ref) => {
    const notes = ref.notes?.toLowerCase() ?? "";
    return Boolean(ref.id) && ref.protected === true && (
      notes.includes("reference only") ||
      notes.includes("placeholder reference")
    );
  });
}

export function verifyModuleRegistrationHarness(): HarnessVerificationResult {
  const registry = createDiscoveryModuleHarnessRegistry();
  const human = registry.get(humanDiscoveryModuleId);
  const opportunity = registry.get(opportunityDiscoveryStubModuleId);
  const humanByVersion = registry.get(
    humanDiscoveryModuleId,
    humanDiscoverySchemaVersion
  );
  const opportunityByVersion = registry.get(
    opportunityDiscoveryStubModuleId,
    opportunityDiscoveryStubSchemaVersion
  );
  const artifactPurposes = [
    ...humanDiscoveryArtifactTemplates,
    ...opportunityDiscoveryArtifactTemplates,
  ].map((template) => template.artifactPurpose);
  const checks: HarnessVerificationCheck[] = [
    check(
      "module.human.registers",
      human?.moduleId === humanDiscoveryModuleId,
      "Human Discovery registers through ModuleRegistry.",
      { moduleId: human?.moduleId }
    ),
    check(
      "module.opportunity.registers",
      opportunity?.moduleId === opportunityDiscoveryStubModuleId,
      "Opportunity Discovery Stub registers through ModuleRegistry.",
      { moduleId: opportunity?.moduleId }
    ),
    check(
      "module.human.version.retrieve",
      humanByVersion?.schemaVersion === humanDiscoverySchemaVersion,
      "Human Discovery can be retrieved by moduleId and schemaVersion.",
      { schemaVersion: humanByVersion?.schemaVersion }
    ),
    check(
      "module.opportunity.version.retrieve",
      opportunityByVersion?.schemaVersion === opportunityDiscoveryStubSchemaVersion,
      "Opportunity Discovery Stub can be retrieved by moduleId and schemaVersion.",
      { schemaVersion: opportunityByVersion?.schemaVersion }
    ),
    check(
      "module.versions.preserved",
      registry.listVersions(humanDiscoveryModuleId).length > 0 &&
        registry.listVersions(opportunityDiscoveryStubModuleId).length > 0,
      "Registered schema versions are preserved by ModuleRegistry.",
      {
        humanVersions: registry.listVersions(humanDiscoveryModuleId).map((module) => module.schemaVersion),
        opportunityVersions: registry.listVersions(opportunityDiscoveryStubModuleId).map((module) => module.schemaVersion),
      }
    ),
    check(
      "artifact.core.purpose.neutral",
      artifactPurposes.every((purpose) => neutralArtifactPurposes.includes(purpose)),
      "Module artifact templates use neutral core ArtifactPurpose values.",
      { artifactPurposes }
    ),
    check(
      "prompts.refs-only",
      promptRefsAreReferencesOnly(humanPromptRefs) &&
        promptRefsAreReferencesOnly(opportunityPromptRefs),
      "Prompt refs are references/placeholders only.",
      {
        humanPromptRefs: humanPromptRefs.map((ref) => ref.id),
        opportunityPromptRefs: opportunityPromptRefs.map((ref) => ref.id),
      }
    ),
    check(
      "resolution.module-owned",
      humanResolutionInterpretations.length > 0 &&
        opportunityResolutionInterpretations.length > 0,
      "Resolution meaning is supplied by modules, while core owns state mechanics.",
      {
        humanStates: humanResolutionInterpretations.map((item) => item.state),
        opportunityStates: opportunityResolutionInterpretations.map((item) => item.state),
      }
    ),
    check(
      "moduleData.harness-only",
      Boolean(humanDiscoveryModuleRegistration.moduleData) &&
        Boolean(opportunityDiscoveryStubModuleRegistration.moduleData),
      "Harness inspects moduleData from module registrations; core does not interpret it.",
      {
        humanModuleDataKeys: Object.keys(humanDiscoveryModuleRegistration.moduleData ?? {}),
        opportunityModuleDataKeys: Object.keys(opportunityDiscoveryStubModuleRegistration.moduleData ?? {}),
      }
    ),
  ];

  return result(checks);
}
