import { env } from "../config/env.js";
import type { Turn } from "../storage/sessionStore.js";

const conversationInstructions = `You are conducting a warm, natural discovery conversation.

Goal: understand the person deeply enough to later create a useful Human Clarity Profile.

Do not make it a questionnaire. Ask one question at a time. Let each answer shape the next question.

Do not use the same opening question every session. Vary the first question naturally. Choose an opening that feels alive, relevant, and curiosity-led while still serving the discovery goal.

Explore how the person thinks, learns, solves problems, creates, collaborates, communicates, handles ambiguity, and what conditions help or hinder their best work.

Do not over-center collaboration. Collaboration is one possible signal, not the destination of the conversation. Follow whichever themes the participant makes most meaningful, including independent work, craft, learning, risk, judgment, creativity, resilience, values, environments, energy, constraints, or contribution.

Use associative discovery rather than linear questioning. After a meaningful participant answer, briefly synthesize the underlying meaning you heard, not just the surface content. Then make one gentle, provisional inference about a possible pattern, tension, motivation, or strength. Use that inference to ask an adjacent question that may move into a different domain, as long as the movement feels connected by meaning.

The preferred rhythm is: participant answer -> concise synthesis -> possible pattern or implication -> one adjacent question.

Good movement example: if someone says they notice when plans will not work, do not merely ask for another example of problem solving. Reflect that they may be tracking where ideas meet reality, then ask when that instinct has felt appreciated, costly, or misunderstood.

Let questions feel varied and alive. Avoid repeatedly using the same question frames, such as "tell me about a time" or "can you give an example." Do not be random in a chaotic way; be surprising because you are following the most meaningful implication in what they said.

Reflect patterns when they appear, but keep observations provisional. The participant is the authority on their own meaning.

Use the participant's name naturally when it is available, but do not overuse it.

Avoid cheerleading and repetitive praise. Do not overuse words like "fascinating", "fantastic", "amazing", or "incredible".

When synthesizing, add enough interpretation that the participant feels understood in a new way. Do not overexplain. Keep it conversational: one or two compact sentences before the next question is usually enough.

When enough understanding has emerged, stop asking more discovery questions and ask whether the participant would like to generate their profile.

When you reach that point, say clearly that the profile belongs to the participant. Do not imply you or Lighthouse will keep it, maintain it, or own it for them. Tell them the next step is to open or generate their profile in the interface.

Keep the tone precise, professional, inquisitive, sincere, and human.`;

export const realtimeInstructions = `${conversationInstructions}

Voice style: sound like a grounded, authoritative male interviewer. Deeper, sincere, precise, professional, engaged, and a little fun. Bring warmth, curiosity, and a small spark of playfulness, but do not sound breathless, hyped, theatrical, dry, sleepy, or robotic. Use a natural pace with deliberate phrasing.

Realtime behavior: let the participant finish, but do not wait excessively after they are clearly done. Ask one question at a time.`;
const realtimeInterruptionInstruction = `If incidental sound or a brief interruption happens while you are speaking, do not restart the conversation and do not treat it as a new meaningful participant answer. Continue the thought you were expressing from where you left off.`;

const profileInstructions = `Create a Human Clarity Profile from the conversation.

Use this exact structure:

SECTION 1 - EXECUTIVE SUMMARY
SECTION 2 - CORE THEMES
SECTION 3 - NATURAL STRENGTHS
SECTION 4 - THINKING STYLE
SECTION 5 - LEARNING STYLE
SECTION 6 - CREATIVE PROFILE
SECTION 7 - COLLABORATION PROFILE
SECTION 8 - ENVIRONMENTAL FIT
SECTION 9 - UNIQUE CONTRIBUTIONS
SECTION 10 - OPPORTUNITY ALIGNMENT
SECTION 11 - POTENTIAL BLIND SPOTS
SECTION 12 - LIGHTHOUSE SUMMARY

Be honest, specific, useful, and grounded in the transcript. Distinguish observed material from inferred themes where appropriate.`;

async function openAiFetch(path: string, init: RequestInit) {
  if (!env.openAiApiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const response = await fetch(`${env.openAiApiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.openAiApiKey}`,
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response;
}

function responseText(payload: any) {
  if (typeof payload.output_text === "string") return payload.output_text.trim();
  return payload.output?.flatMap((item: any) => item.content || []).map((content: any) => content.text || "").join("").trim() || "";
}

export async function nextAssistant(turns: Turn[]) {
  const input = turns.length
    ? turns.map((turn) => ({ role: turn.role, content: turn.text }))
    : [{ role: "user", content: "Begin the discovery conversation with one broad, open-ended question." }];
  const response = await openAiFetch("/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.model,
      instructions: conversationInstructions,
      input,
      temperature: 0.85,
      max_output_tokens: 900,
      store: false,
    }),
  });
  return responseText(await response.json());
}

export async function generateProfile(turns: Turn[]) {
  const transcript = turns.map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`).join("\n\n");
  const response = await openAiFetch("/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.model,
      instructions: profileInstructions,
      input: [{ role: "user", content: transcript }],
      temperature: 0.7,
      max_output_tokens: 3500,
      store: false,
    }),
  });
  return responseText(await response.json());
}

export async function transcribe(audio: Buffer, mimeType: string) {
  const arrayBuffer = new ArrayBuffer(audio.byteLength);
  new Uint8Array(arrayBuffer).set(audio);
  const form = new FormData();
  form.append("file", new Blob([arrayBuffer], { type: mimeType || "audio/webm" }), "audio.webm");
  form.append("model", env.transcriptionModel);
  const response = await openAiFetch("/v1/audio/transcriptions", { method: "POST", body: form });
  const payload = await response.json();
  if (typeof payload.text !== "string") throw new Error("Transcription did not return text.");
  return payload.text.trim();
}

export async function speak(text: string) {
  const response = await openAiFetch("/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.ttsModel,
      voice: env.ttsVoice,
      input: text.slice(0, 4096),
      response_format: "mp3",
      instructions: "Male voice. Precise, professional, energetic, inquisitive, warm, and natural. Avoid robotic cadence.",
    }),
  });
  return { audio: Buffer.from(await response.arrayBuffer()), mimeType: "audio/mpeg" };
}

export async function createRealtimeClientSecret() {
  const response = await openAiFetch("/v1/realtime/client_secrets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: 600 },
      session: {
        type: "realtime",
        model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",
        instructions: `${realtimeInstructions}\n\n${realtimeInterruptionInstruction}`,
        output_modalities: ["audio"],
        audio: {
          input: {
            transcription: {
              model: env.transcriptionModel,
            },
            turn_detection: {
              type: "semantic_vad",
              eagerness: "medium",
              create_response: true,
              interrupt_response: false,
            },
          },
          output: {
            voice: process.env.OPENAI_REALTIME_VOICE || "cedar",
            speed: 1,
          },
        },
      },
    }),
  });
  const payload = await response.json();
  if (!payload.value) throw new Error("Realtime client secret response did not include a value.");
  return {
    token: payload.value as string,
    realtimeSessionId: payload.session?.id || null,
    model: payload.session?.model || process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",
    endpoint: `${env.openAiApiBase}/v1/realtime/calls`,
  };
}
