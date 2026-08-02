// Estimated per-unit pricing for metered external services used by Lighthouse.
//
// These numbers exist so /api costs can be *estimated* for internal
// visibility -- they are not exact invoices and will not exactly match your
// provider bill (rounding, promotional credits, volume tiers, prompt
// caching, thinking-token behavior, etc. aren't modeled).
//
// Traced against this project's actual configuration first: OPENAI_API_BASE,
// OPENAI_MODEL, OPENAI_TTS_MODEL, OZ_CAPTURE_MODEL, PROFILE_AUTHORING_MODEL,
// and any Anthropic base/model override are all UNSET in .env.local, so
// every call in this app resolves to the hardcoded defaults below, sent
// straight to the real api.openai.com / Anthropic API (no custom proxy or
// negotiated route is configured). That means public list pricing is the
// right thing to verify against here -- there's no hidden alias to account
// for.
//
// Entries below are marked VERIFIED (checked against the provider's own
// current pricing docs on 2026-08-02) or UNVERIFIED (left as a placeholder
// -- either the provider's plan-dependent, or this app's cost formula can't
// faithfully use the number that exists). Re-verify VERIFIED entries
// periodically; providers change prices without notice.
export const PRICING = {
  "openai.chat": {
    // VERIFIED 2026-08-02 against developers.openai.com/api/docs/models/gpt-5.6-sol
    // ($5 / 1M input tokens, $30 / 1M output tokens). This is the model
    // OPENAI_MODEL defaults to (chat.js, and by fallback oz-capture.js's
    // OZ_CAPTURE_MODEL / profile-author.js's PROFILE_AUTHORING_MODEL) with
    // no env override present.
    "gpt-5.6-sol": { inputPerMillionTokensUsd: 5.0, outputPerMillionTokensUsd: 30.0 },
    // Fallback for any other openai.chat model name that might appear later
    // (e.g. if OPENAI_MODEL is overridden). Mirrors gpt-5.6-sol for now --
    // update this specifically if/when a different model is actually used.
    default: { inputPerMillionTokensUsd: 5.0, outputPerMillionTokensUsd: 30.0 },
  },
  "openai.tts": {
    // UNVERIFIED (placeholder retained). OpenAI's own docs
    // (developers.openai.com/api/docs/models/gpt-4o-mini-tts, checked
    // 2026-08-02) show this model is billed as TWO token-based components --
    // $0.60 / 1M *text input* tokens, plus $12 / 1M *audio output* tokens --
    // not a flat per-character rate. Audio output tokens are driven by the
    // generated speech itself (roughly its duration), which tts.js has no
    // way to measure (the API returns raw audio bytes, no usage/token
    // count). The dominant cost is that unmeasurable output-audio term, so
    // this app's current input-character-only formula cannot faithfully
    // reproduce the real bill -- changing just the number here would imply
    // more precision than actually exists. perMillionCharsUsd below is left
    // as a rough placeholder pending a formula change (out of scope for a
    // pricing-values-only update).
    "gpt-4o-mini-tts": { perMillionCharsUsd: 12.0 },
    default: { perMillionCharsUsd: 12.0 },
  },
  "openai.transcribe": {
    // UNVERIFIED (placeholder retained). OpenAI's own docs
    // (developers.openai.com/api/docs/models/gpt-4o-transcribe, checked
    // 2026-08-02) list only token-based pricing -- $2.50 / 1M input tokens,
    // $10 / 1M output tokens -- with no official per-minute rate. This app's
    // formula estimates a per-minute cost from the uploaded recording's byte
    // size (see ASSUMED_AUDIO_BITRATE_KBPS in costTracking.js), which isn't
    // the same measurement OpenAI actually bills on, and no officially
    // documented bytes/duration-to-token ratio exists to convert one to the
    // other. The $0.006/minute figure here is a third-party estimate, not
    // something confirmed on OpenAI's own page, so it stays a placeholder.
    "gpt-4o-transcribe": { perMinuteUsd: 0.006 },
    default: { perMinuteUsd: 0.006 },
  },
  "anthropic.chat": {
    // VERIFIED 2026-08-02 against platform.claude.com/docs/en/docs/about-claude/pricing
    // ($5 / 1M input tokens, $25 / 1M output tokens, standard/global pricing --
    // excludes fast-mode, prompt-caching, and batch-API rates, none of which
    // founder-intel.js uses). This is the model hardcoded as
    // FOUNDER_INTEL_MODEL in founder-intel.js; there is no env override.
    "claude-opus-5": { inputPerMillionTokensUsd: 5.0, outputPerMillionTokensUsd: 25.0 },
    default: { inputPerMillionTokensUsd: 5.0, outputPerMillionTokensUsd: 25.0 },
  },
  "resend.email": {
    // UNVERIFIED (placeholder retained). Resend's pricing (resend.com/pricing,
    // checked 2026-08-02) is plan-dependent, not a flat per-email rate: the
    // Free plan covers the first 3,000 emails/month at $0, and paid plans
    // charge $0.90 per 1,000 emails of overage on the Pro tier down to
    // $0.46 per 1,000 at the highest Scale tier. Nothing in this project's
    // configuration (just RESEND_API_KEY) indicates which plan is active, so
    // there's no way to pick the right number from here -- confirm your
    // actual Resend plan before trusting this figure. Given this app's
    // current volume (a handful of emails total), the Free plan's effective
    // $0/email is probably closer to reality than the placeholder below.
    default: { perEmailUsd: 0.0004 },
  },
};

export function getRate(service, model) {
  const table = PRICING[service];
  if (!table) return null;
  return (model && table[model]) || table.default || null;
}
