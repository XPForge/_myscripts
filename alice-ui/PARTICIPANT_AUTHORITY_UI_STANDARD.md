# Participant Authority UI Standard

Document Type: UI Convention / Canon Candidate
Status: Working Standard
Confidentiality: INTERNAL
Purpose: Ensure every piece of UI that represents a Participant Authority moment — consent, opt-in choice, data control, ownership — is visually distinct and instantly recognizable, consistently, across the whole app and across whichever coding assistant (Claude, Codex, or otherwise) implements it.

## Rule

Any content container that represents Participant Authority (the participant being asked to consent, choose, control, or own something about their own data or session) must use the yellow/amber treatment below. This applies regardless of which page, component, or coding assistant creates it.

"Participant Authority" content includes, but is not limited to:
- Consent requests (e.g. "may Lighthouse keep a copy of this for development purposes?")
- Explicit opt-in/opt-out choices about data retention, sharing, or usage
- Data ownership or control statements presented as an actionable choice, not just informational text

Purely informational trust/privacy copy (e.g. static "Your data is yours" cards with no actionable choice) does not require this treatment — it is reserved for moments where the participant is actively exercising authority over something.

## Visual Treatment

Container:
- Border: amber/yellow at ~40% opacity
- Background: amber/yellow at ~10% opacity
- Heading: amber/yellow, uppercase, small letter-spacing, prefixed with a 🛡 shield emoji and the literal label "Participant Authority"

### Reference values used in this codebase

Light/default context (e.g. `DiscoveryPage.tsx` modals):
```
border: "1px solid rgba(234,179,8,0.4)"
background: "rgba(234,179,8,0.1)"
heading color: "#ca8a04"
```

Dark context (e.g. `LighthouseDiscovery.tsx` modals):
```
border: "1px solid rgba(250,204,21,0.4)"
background: "rgba(250,204,21,0.1)"
heading color: "#facc15"
```

Either amber shade is acceptable — pick whichever reads clearly against the surrounding background. The point is consistency of intent (amber = "this is a Participant Authority moment"), not pixel-identical hex values.

## Current Applications

- `src/components/discovery/DiscoveryPage.tsx` — Review & Generate Profile modal, "development copy" consent checkbox
- `src/components/LighthouseDiscovery.tsx` — Review & Generate Profile screen, "development copy" consent checkbox

## Review Requirement

Before adding any new consent, opt-in, or data-control UI to this app, check this document and apply the same treatment. If a proposed design conflicts with this standard, resolve it here rather than introducing a one-off visual style for the same concept.
