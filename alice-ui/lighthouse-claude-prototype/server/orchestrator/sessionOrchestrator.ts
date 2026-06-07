import { loadProtectedPrompt } from "../prompts/loadProtectedPrompt.js";
import { getWrapperPrompt } from "../prompts/wrappers.js";
import type { DiscoveryContext, DiscoveryProvider, SynthesisProvider } from "../providers/types.js";
import { extractionRefusal, isPromptExtractionAttempt } from "../security/extractionAttemptDetector.js";
import { filterPromptLeakage } from "../security/promptLeakGuard.js";
import { appendTurn, createSession, getSession, saveSession, type LighthouseSession } from "../storage/sessionStore.js";

export class SessionOrchestrator {
  constructor(
    private readonly discovery: DiscoveryProvider,
    private readonly synthesis: SynthesisProvider
  ) {}

  async start(context: DiscoveryContext) {
    const session = createSession(context);
    const assistantText = await this.discovery.respond({
      sessionId: session.id,
      systemPrompt: loadProtectedPrompt(),
      wrapperPrompt: getWrapperPrompt(context),
      turns: [],
    });
    appendTurn(session, { role: "assistant", text: filterPromptLeakage(assistantText.text), mode: "system" });
    return this.requireSession(session.id);
  }

  async acceptText(sessionId: string, text: string) {
    const session = this.requireSession(sessionId);
    const participantText = text.trim();
    if (!participantText) throw new Error("Participant text is required.");
    appendTurn(session, { role: "user", text: participantText, mode: "text" });

    if (isPromptExtractionAttempt(participantText)) {
      appendTurn(session, { role: "assistant", text: extractionRefusal(), mode: "system" });
      return this.requireSession(sessionId);
    }

    const updated = this.requireSession(sessionId);
    const assistant = await this.discovery.respond({
      sessionId,
      systemPrompt: loadProtectedPrompt(),
      wrapperPrompt: getWrapperPrompt(updated.context),
      turns: updated.turns,
    });
    appendTurn(updated, { role: "assistant", text: filterPromptLeakage(assistant.text), mode: "system" });
    return this.requireSession(sessionId);
  }

  async generateProfile(sessionId: string) {
    const session = this.requireSession(sessionId);
    const result = await this.synthesis.generateProfile({
      systemPrompt: loadProtectedPrompt(),
      turns: session.turns,
    });
    session.profileMarkdown = filterPromptLeakage(result.profileMarkdown);
    saveSession(session);
    return session;
  }

  getSession(sessionId: string) {
    return this.requireSession(sessionId);
  }

  private requireSession(sessionId: string): LighthouseSession {
    const session = getSession(sessionId);
    if (!session) throw new Error("Session not found.");
    return session;
  }
}
