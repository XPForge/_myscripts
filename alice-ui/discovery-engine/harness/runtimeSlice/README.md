# Runtime Slice Harness

This is a runtime verification slice only.

It proves a tiny deterministic Discovery cycle can create a workspace, session, turn, evidence reference, module-owned observation, alignment observation, in-memory storage roundtrip, and export bundle.

It does not implement:

- UI
- API
- realtime
- LLM interpretation
- protected prompt loading
- real artifact generation
- profile generation
- scoring
- matching
- ranking
- recommendations
- percentages

Observation creation is deterministic demo behavior. It is not real Discovery interpretation.

Alignment proof is metadata-only. It compares `AlignmentObservation` objects and must not call any signal a match.
