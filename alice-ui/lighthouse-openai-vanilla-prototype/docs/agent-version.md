# Lighthouse Agent Version

Current checkpoint: **Lighthouse Agent v0.4.0-security**

Short label: **LA-v0.4-secure**

Prototype directory:

`c:\Users\paulz\_myscripts\alice-ui\lighthouse-openai-vanilla-prototype`

Local URL:

`http://localhost:3300`

## Version Meaning

`v0.4.0-security` is the secured working OpenAI realtime prototype.

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

This checkpoint does not include:

- Minimal identity layer.
- Full Lighthouse canon.
- Soul Kernel integration.
- Production email delivery.
- Full server-mediated realtime bridge.

## Version Roadmap

- **v0.5.0-identity**: minimal identity-preservation layer.
- **v0.6.0-canon-lite**: thin Lighthouse canon/DNA layer, if v0.5 preserves behavior.
- **v0.7.0-delivery**: profile delivery/email ownership flow.
- **v1.0.0-pilot**: stable participant journey ready for controlled pilot use.

## Canonical Code Reference

The code-level version reference lives in:

`server/config/version.ts`

Update both this document and that file when creating a new named checkpoint.
