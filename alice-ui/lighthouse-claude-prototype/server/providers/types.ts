export type DiscoveryContext = "employment" | "team" | "relationship" | "education" | "general";
export type ParticipantMode = "text" | "voice";
export type ConversationRole = "user" | "assistant";

export type ConversationTurn = {
  id: string;
  role: ConversationRole;
  text: string;
  mode: ParticipantMode | "system";
  createdAt: string;
};

export type DiscoveryRequest = {
  sessionId: string;
  systemPrompt: string;
  wrapperPrompt: string;
  turns: ConversationTurn[];
};

export type DiscoveryProvider = {
  respond(input: DiscoveryRequest): Promise<{ text: string }>;
};

export type SynthesisProvider = {
  generateProfile(input: {
    systemPrompt: string;
    turns: ConversationTurn[];
  }): Promise<{ profileMarkdown: string }>;
};
