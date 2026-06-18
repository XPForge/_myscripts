# Interpretation Contracts

The interpretation layer defines controlled contracts for future interpretation behavior in the Discovery Engine.

Phase 10A defines architecture and type boundaries only. It does not implement a live interpreter, call an LLM, load prompts, or generate Discovery outputs.

## Purpose

Interpretation requests and results provide a controlled way to describe future evidence-linked interpretation work. The contracts keep interpretation separate from core discovery mechanics, module schemas, prompt storage, runtime execution, and UI behavior.

## Protected Prompt References

`ProtectedPromptRef` values are references only. They may identify a module-owned prompt purpose and version, but they do not contain prompt bodies, secret prompt text, system prompts, API keys, provider instructions, or provider-specific implementation.

## Evidence Requirement

Interpretation requests include source turn ids and evidence reference ids. Interpretation results preserve the evidence reference ids used. Future interpretation behavior must remain evidence-linked rather than producing unsupported claims.

## Uncertainty Requirement

Interpretation results include uncertainty notes and boundary notes. This keeps uncertainty visible and prevents interpretation results from becoming unsupported conclusions.

## Boundary Rules

The default boundary policy disallows:

- score
- match
- rank
- recommendation
- percentage
- qualification judgment
- fit conclusion
- profile generation
- artifact generation
- unsupported claims without evidence
- protected prompt exposure

## Not Implemented In Phase 10A

- live interpretation
- LLM calls
- protected prompt loading
- API endpoints
- realtime behavior
- real profile generation
- real artifact generation
- scoring, matching, ranking, recommendation, percentage, qualification, or fit logic
- alignment signal conclusions

## Next Step

The next planned step is `Phase 10B: Deterministic Mock Interpreter`.
