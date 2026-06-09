# Lighthouse Agent Version

Current checkpoint: **Lighthouse Agent v0.5.0-identity**

Short label: **LA-v0.5-identity**

Prototype directory:

`c:\Users\paulz\_myscripts\alice-ui\lighthouse-openai-vanilla-prototype`

Local URL:

`http://localhost:3300`

## Version Meaning

`v0.5.0-identity` is the secured working OpenAI realtime prototype with a minimal identity-preservation layer.

This checkpoint includes:

- OpenAI realtime voice discovery.
- Associative discovery behavior.
- Name/email intake.
- Sidebar discovery/profile flow.
- Profile generation.
- Server-side API key handling.
- Server-side prompt assembly.
- Prompt extraction detection.
- Response/profile leak filtering.
- Session access token protection.
- Static file serving allowlist.
- Security scan script.
- Minimal identity guardrail against evaluation, assessment drift, resume drift, and flattening.

This checkpoint does not include:

- Full Lighthouse canon.
- Soul Kernel integration.
- Production email delivery.
- Full server-mediated realtime bridge.

## Version Roadmap

- **v0.4.0-security**: secured working OpenAI realtime prototype.
- **v0.5.0-identity**: minimal identity-preservation layer.
- **v0.6.0-canon-lite**: thin Lighthouse canon/DNA layer, if v0.5 preserves behavior.
- **v0.7.0-delivery**: profile delivery/email ownership flow.
- **v1.0.0-pilot**: stable participant journey ready for controlled pilot use.

## Canonical Code Reference

The code-level version reference lives in:

`server/config/version.ts`

Update both this document and that file when creating a new named checkpoint.
