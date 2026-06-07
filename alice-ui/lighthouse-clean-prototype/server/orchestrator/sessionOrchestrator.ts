import { loadProtectedDiscoveryPrompt } from "../prompts/loadProtectedPrompt.js";
import { getWrapperPrompt } from "../prompts/wrappers.js";
import type {
  DiscoveryContext,
  DiscoveryProvider,
  ParticipantMode,
  SpeechToTextProvider,
  SynthesisProvider,
  TextToSpeechProvider,
} from "../providers/types.js";
import {
  isPromptExtractionAttempt,
  promptExtractionRefusal,
} from "../security/extractionAttemptDetector.js";
import { filterPromptLeakage } from "../security/promptLeakGuard.js";
import {
  appendTurn,
  createSession,
  getSession,
  saveSession,
  type LighthouseSession,
} from "../storage/sessionStore.js";

export type OrchestratorDeps = {
  discovery: DiscoveryProvider;
  synthesis: SynthesisProvider;
  speechToText: SpeechToTextProvider;
  textToSpeech: TextToSpeechProvider;
};

export type ConversationResult = {
  session: LighthouseSession;
  participantText?: string;
  assistantText: string;
  audioBase64?: string;
  audioMimeType?: string;
};

export class SessionOrchestrator {
  constructor(private readonly deps: OrchestratorDeps) {}

  async start(context: DiscoveryContext) {
    const session = createSession(context);
    const assistantText = await this.runDiscovery(session);
    appendTurn(session, {
      role: "assistant",
      text: assistantText,
      mode: "system",
    });
    return { session, assistantText };
  }

  async acceptText(sessionId: string, text: string, mode: ParticipantMode, includeAudio: boolean) {
    const session = this.requireSession(sessionId);
    const participantText = text.trim();
    if (!participantText) {
      throw new Error("Participant message is required.");
    }

    appendTurn(session, {
      role: "user",
      text: participantText,
      mode,
    });

    if (isPromptExtractionAttempt(participantText)) {
      const assistantText = promptExtractionRefusal();
      appendTurn(session, {
        role: "assistant",
        text: assistantText,
        mode: "system",
      });
      return this.withOptionalAudio(session, participantText, assistantText, includeAudio);
    }

    const assistantText = await this.runDiscovery(session);
    appendTurn(session, {
      role: "assistant",
      text: assistantText,
      mode: "system",
    });

    return this.withOptionalAudio(session, participantText, assistantText, includeAudio);
  }

  async acceptAudio(sessionId: string, audio: Buffer, mimeType: string) {
    const participantText = await this.deps.speechToText.transcribe(audio, mimeType);
    return this.acceptText(sessionId, participantText, "voice", true);
  }

  async generateProfile(sessionId: string) {
    const session = this.requireSession(sessionId);
    const systemPrompt = loadProtectedDiscoveryPrompt();
    const profile = await this.deps.synthesis.generateProfile({
      systemPrompt,
      transcript: session.turns,
    });
    session.profileMarkdown = filterPromptLeakage(profile.profileMarkdown);
    saveSession(session);
    return session;
  }

  getSession(sessionId: string) {
    return this.requireSession(sessionId);
  }

  private async runDiscovery(session: LighthouseSession) {
    const systemPrompt = loadProtectedDiscoveryPrompt();
    const wrapperPrompt = getWrapperPrompt(session.context);
    const response = await this.deps.discovery.respond({
      sessionId: session.id,
      systemPrompt,
      wrapperPrompt,
      turns:
        session.turns.length > 0
          ? session.turns
          : [
              {
                id: "start",
                role: "user",
                text: "Please begin the discovery conversation.",
                mode: "text",
                createdAt: new Date().toISOString(),
              },
            ],
    });

    return filterPromptLeakage(response.text);
  }

  private requireSession(sessionId: string) {
    const session = getSession(sessionId);
    if (!session) {
      throw new Error("Session not found.");
    }
    return session;
  }

  private async withOptionalAudio(
    session: LighthouseSession,
    participantText: string,
    assistantText: string,
    includeAudio: boolean
  ): Promise<ConversationResult> {
    if (!includeAudio) {
      return { session, participantText, assistantText };
    }

    const audio = await this.deps.textToSpeech.synthesize(assistantText);
    return {
      session,
      participantText,
      assistantText,
      audioBase64: audio.audio.toString("base64"),
      audioMimeType: audio.mimeType,
    };
  }
}
