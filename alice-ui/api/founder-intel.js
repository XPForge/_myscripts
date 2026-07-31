import Anthropic from "@anthropic-ai/sdk";
import { requireAdminSession } from "./_lib/auth.js";

export const config = { api: { bodyParser: false } };

function sanitizeSecret(value) {
  if (!value) return value;
  return value
    .split("")
    .filter((ch) => ch.charCodeAt(0) !== 0xfeff)
    .join("")
    .trim();
}

const ANTHROPIC_API_KEY = sanitizeSecret(process.env.ANTHROPIC_API_KEY);

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString("utf8"));
}

// Founder-only competitive intelligence for Project Lighthouse itself (not
// participant-facing) -- prompts live server-side so the client can only
// pick a mode, never inject an arbitrary system prompt into a paid API call.
const SYSTEM_PROMPT = `You are the Competitive Intelligence Officer for Project Lighthouse -- a participant-centered human discovery and alignment system built by Paul Dwinell.

Core doctrine: Lighthouse must never make people smaller in order to process them more easily.
Positioning: representation infrastructure that helps organizations see the full human -- not the resume -- before making consequential decisions.
The Soul Kernel is a moral and architectural constraint, not branding.

Give Paul direct, specific, honest competitive intelligence. No cheerleading. No hollow phrases. Name real companies, real limitations, real threats, real moats. If something is a genuine risk, say so.`;

const PROMPTS = {
  landscape:
    "Give me a concise but thorough competitive landscape analysis for Project Lighthouse. Cover: (1) ATS systems -- Greenhouse, Lever, Workday, iCIMS, (2) Talent intelligence platforms -- LinkedIn Talent, HireEZ, Eightfold.ai, (3) AI screening and assessment tools -- HireVue, Pymetrics, Predictive Index, (4) Resume tools and AI recruiters, (5) Emerging 'skills-based hiring' platforms like Beamery or Gloat. For each category: what they do, their core limitation when it comes to human complexity, and where Lighthouse is architecturally differentiated. Be specific -- no generic summaries. Paul needs honest intel.",
  moat:
    "Analyze the actual defensibility of Project Lighthouse's competitive position. What is the real moat? Consider: the Soul Kernel doctrine as an operating constraint (not just branding), the participant authority architecture, the Human Representation Integrity positioning, first-mover opportunity in regulatory alignment, and the distinction between 'discovery platform' vs 'automated screening tool.' What would a well-funded competitor actually need to replicate this? What genuinely can't be easily copied? Be honest about weaknesses too.",
  ats:
    "Compare Project Lighthouse directly and honestly against ATS systems -- Greenhouse, Lever, Workday, iCIMS. What problem does each solve? Where do ATS systems systematically fail candidates? How does Lighthouse's positioning as 'representation infrastructure' rather than 'screening software' create genuine differentiation? How does this distinction matter to regulators, to candidates, and to employers who actually care about quality of hire rather than just time-to-fill?",
  pitch:
    "A Shark is about to say: 'LinkedIn already does this. Workday already does this. Why can't they just copy you?' Help me build a response that's direct, confident, and genuinely defensible -- not marketing language. Ground it in what's architecturally distinct about Lighthouse and what the Soul Kernel means as a real business constraint, not a value statement. The Shark is smart. They'll see through anything soft.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!ANTHROPIC_API_KEY) {
    sendJson(res, 500, { error: "ANTHROPIC_API_KEY is not configured" });
    return;
  }

  const { status } = requireAdminSession(req);
  if (status !== 200) {
    sendJson(res, status, { error: status === 401 ? "Sign in required" : "Not authorized" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  const mode = typeof body.mode === "string" ? body.mode : "";
  const customPrompt = typeof body.customPrompt === "string" ? body.customPrompt.trim() : "";
  const prompt = mode === "custom" ? customPrompt : PROMPTS[mode];

  if (!prompt) {
    sendJson(res, 400, { error: "Invalid request: unknown mode or empty custom prompt" });
    return;
  }

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    // Streamed internally (not to the client) so a long analysis can't hit
    // the platform's non-streaming request timeout; the endpoint still
    // returns a single JSON payload matching the existing frontend contract.
    const stream = anthropic.beta.messages.stream({
      model: "claude-opus-5",
      // Thinking is on by default for claude-opus-5, and max_tokens caps
      // thinking + visible text together -- 4096 was silently consumed
      // entirely by thinking with nothing left for the actual answer.
      // 16000 was verified against this exact prompt/system to finish with
      // stop_reason "end_turn" rather than truncating mid-response.
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      sendJson(res, 200, { text: "Claude declined to answer this request." });
      return;
    }

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock) {
      sendJson(res, 200, { text: "Claude didn't produce a visible answer for this request -- try again." });
      return;
    }
    const truncatedNote = message.stop_reason === "max_tokens" ? "\n\n[Response was cut off at the length limit.]" : "";
    sendJson(res, 200, { text: textBlock.text + truncatedNote });
  } catch (err) {
    console.error("founder-intel error:", err);
    sendJson(res, 500, { error: "Unable to generate competitive intelligence" });
  }
}
