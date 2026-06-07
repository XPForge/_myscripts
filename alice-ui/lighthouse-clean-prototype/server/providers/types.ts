export type DiscoveryContext =
  | "employment"
  | "team"
  | "relationship"
  | "education"
  | "general";

export type ParticipantMode = "voice" | "text";

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

export type DiscoveryResponse = {
  text: string;
};

export type SynthesisRequest = {
  systemPrompt: string;
  transcript: ConversationTurn[];
};

export type SynthesisResponse = {
  profileMarkdown: string;
};

export type DiscoveryProvider = {
  respond(input: DiscoveryRequest): Promise<DiscoveryResponse>;
};

export type SynthesisProvider = {
  generateProfile(input: SynthesisRequest): Promise<SynthesisResponse>;
};

export type SpeechToTextProvider = {
  transcribe(audio: Buffer, mimeType: string): Promise<string>;
};

export type TextToSpeechProvider = {
  synthesize(text: string): Promise<{ audio: Buffer; mimeType: string }>;
};
