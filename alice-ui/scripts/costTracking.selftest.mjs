// Plain-assertion self-test for the cost-tracking math and event shape --
// there's no test framework configured in this project (no vitest/jest,
// confirmed before writing this), and adding one is a bigger change than
// this task calls for. Run directly with:
//   node scripts/costTracking.selftest.mjs
import assert from "node:assert/strict";
import {
  estimateChatCostUsd,
  estimateTtsCostUsd,
  estimateTranscriptionCostUsd,
  estimateEmailCostUsd,
  getSessionIdFromRequest,
  recordCostEvent,
} from "../api/_lib/costTracking.js";
import { getRate, PRICING } from "../api/_lib/costPricing.js";

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok   - ${name}`);
  } catch (err) {
    console.error(`FAIL - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

check("getRate falls back to a service's default entry for an unknown model", () => {
  const rate = getRate("openai.chat", "some-future-model-not-in-config");
  assert.deepEqual(rate, PRICING["openai.chat"].default);
});

check("getRate returns null for a completely unknown service", () => {
  assert.equal(getRate("not.a.real.service", "x"), null);
});

check("estimateChatCostUsd computes input+output token cost from configured rates", () => {
  const rate = PRICING["openai.chat"].default;
  const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000 };
  const expected = rate.inputPerMillionTokensUsd + rate.outputPerMillionTokensUsd;
  assert.equal(estimateChatCostUsd("openai.chat", "gpt-5.6-sol", usage), expected);
});

check("estimateChatCostUsd returns null when usage is missing (no silent zero)", () => {
  assert.equal(estimateChatCostUsd("openai.chat", "gpt-5.6-sol", null), null);
  assert.equal(estimateChatCostUsd("openai.chat", "gpt-5.6-sol", undefined), null);
});

check("estimateChatCostUsd accepts camelCase usage fields too", () => {
  const usage = { inputTokens: 500_000, outputTokens: 0 };
  const rate = PRICING["openai.chat"].default;
  assert.equal(estimateChatCostUsd("openai.chat", "gpt-5.6-sol", usage), rate.inputPerMillionTokensUsd / 2);
});

check("estimateTtsCostUsd scales with input character count", () => {
  const rate = PRICING["openai.tts"].default;
  const text = "a".repeat(1_000_000);
  assert.equal(estimateTtsCostUsd("gpt-4o-mini-tts", text), rate.perMillionCharsUsd);
});

check("estimateTtsCostUsd returns null for non-string input", () => {
  assert.equal(estimateTtsCostUsd("gpt-4o-mini-tts", undefined), null);
});

check("estimateTranscriptionCostUsd is positive for a realistic recording size and scales with size", () => {
  const small = estimateTranscriptionCostUsd("gpt-4o-transcribe", 50_000); // ~50KB
  const large = estimateTranscriptionCostUsd("gpt-4o-transcribe", 500_000); // ~500KB
  assert.ok(small > 0, "expected a positive estimate for a non-trivial recording");
  assert.ok(large > small, "expected a larger recording to estimate a higher cost");
});

check("estimateTranscriptionCostUsd returns null for zero/negative/non-numeric byte counts", () => {
  assert.equal(estimateTranscriptionCostUsd("gpt-4o-transcribe", 0), null);
  assert.equal(estimateTranscriptionCostUsd("gpt-4o-transcribe", -5), null);
  assert.equal(estimateTranscriptionCostUsd("gpt-4o-transcribe", "not-a-number"), null);
});

check("estimateEmailCostUsd returns the configured flat per-email rate", () => {
  assert.equal(estimateEmailCostUsd(), PRICING["resend.email"].default.perEmailUsd);
});

check("getSessionIdFromRequest reads and trims the header, rejects absurdly long values", () => {
  assert.equal(getSessionIdFromRequest({ headers: { "x-lighthouse-session-id": "  abc-123  " } }), "abc-123");
  assert.equal(getSessionIdFromRequest({ headers: {} }), null);
  assert.equal(getSessionIdFromRequest({ headers: { "x-lighthouse-session-id": "x".repeat(200) } }), null);
});

check("recordCostEvent emits one well-formed JSON line on console.log and never includes transcript-shaped fields", () => {
  const originalLog = console.log;
  const originalEnv = process.env.VERCEL_ENV;
  let captured = null;
  console.log = (line) => { captured = line; };
  try {
    process.env.VERCEL_ENV = "production";
    recordCostEvent({
      service: "openai.chat",
      model: "gpt-5.6-sol",
      kind: "discovery_chat_turn",
      sessionId: "test-session-id",
      quantity: 1234,
      unit: "tokens",
      estimatedCostUsd: 0.001234,
      isTestAccount: false,
      meta: { inputTokens: 1000, outputTokens: 234 },
    });
  } finally {
    console.log = originalLog;
    process.env.VERCEL_ENV = originalEnv;
  }

  assert.ok(captured, "expected recordCostEvent to log a line");
  const parsed = JSON.parse(captured);
  assert.equal(parsed.type, "lighthouse_cost_event");
  assert.equal(parsed.environment, "production");
  assert.equal(parsed.sessionId, "test-session-id");
  assert.equal(parsed.estimatedCostUsd, 0.001234);
  const forbiddenKeys = ["transcript", "text", "message", "content", "turns", "reply"];
  const flatJson = JSON.stringify(parsed).toLowerCase();
  for (const key of forbiddenKeys) {
    assert.ok(!(key in parsed), `cost event must not include a "${key}" field`);
  }
  // Belt-and-suspenders: also make sure nothing conversational leaked into
  // meta as an unexpected extra property.
  assert.deepEqual(Object.keys(parsed.meta).sort(), ["inputTokens", "outputTokens"]);
  void flatJson;
});

check("recordCostEvent defaults environment to development when VERCEL_ENV is unset (local dev)", () => {
  const originalLog = console.log;
  const originalEnv = process.env.VERCEL_ENV;
  let captured = null;
  console.log = (line) => { captured = line; };
  try {
    delete process.env.VERCEL_ENV;
    recordCostEvent({ service: "openai.tts", model: "gpt-4o-mini-tts", kind: "discovery_voice_reply", quantity: 10, unit: "characters", estimatedCostUsd: 0.0001 });
  } finally {
    console.log = originalLog;
    if (originalEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalEnv;
  }
  assert.equal(JSON.parse(captured).environment, "development");
});

check("recordCostEvent never throws even with garbage input", () => {
  assert.doesNotThrow(() => recordCostEvent(null));
  assert.doesNotThrow(() => recordCostEvent(undefined));
  assert.doesNotThrow(() => recordCostEvent({}));
});

console.log(`\n${passed} check(s) passed.`);
if (process.exitCode) {
  console.error("Self-test FAILED.");
} else {
  console.log("Self-test passed.");
}
