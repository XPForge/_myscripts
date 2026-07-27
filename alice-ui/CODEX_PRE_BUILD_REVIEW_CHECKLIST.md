# Codex Pre-Build Review Checklist

Before implementing any Lighthouse Discovery, runtime, provider, schema, module, transcript, evaluation, profile, opportunity, or host-integration change, review:

1. `LIGHTHOUSE_MODULAR_DISCOVERY_CORE_DOCTRINE.md`
2. `PARTICIPANT_AUTHORITY_UI_STANDARD.md` — required whenever the change touches consent, opt-in/opt-out, or data-control UI
3. Relevant README files for the target module
4. Any active milestone or phase document
5. Any user-provided prompt for this task

## Required Pre-Build Questions

Answer these before modifying files:

* What module or area is being changed?
* Is this change inside a standalone module or does it couple to a host app?
* Does this preserve runtime swappability?
* Does this preserve model/provider swappability?
* Does this preserve input adapter extensibility?
* Does this preserve schema/config as the behavior boundary?
* Does this preserve transcript/export separation?
* Does this avoid hard-coding Human Discovery, Opportunity Discovery, or any single domain into the core?
* Does this avoid scoring/matching/ranking/recommendation drift?
* Does this avoid adding prompts or model behavior control unless explicitly requested?
* Does this avoid touching unrelated ALICE app/runtime files?
* Does this avoid modifying `discovery-engine/` unless explicitly requested?

## Required Final Report Add-On

Every related Codex report must include:

```markdown
## Doctrine Review
- Reviewed `LIGHTHOUSE_MODULAR_DISCOVERY_CORE_DOCTRINE.md`: yes/no
- Reviewed `CODEX_PRE_BUILD_REVIEW_CHECKLIST.md`: yes/no
- Preserved runtime swappability: yes/no
- Preserved model/provider swappability: yes/no
- Preserved module portability: yes/no
- Preserved schema-driven behavior boundary: yes/no
- Avoided hard-coded domain logic in core: yes/no
- Avoided UI-owned runtime logic: yes/no
- Conflicts found: yes/no
```
