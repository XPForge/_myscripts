import type {
  AgentEvent,
  AgentEventBase,
  AgentTranscriptState,
  AgentTranscriptTurn,
} from "../instance";
import type { DiscoverySessionState } from "./DiscoverySessionState";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEventBase(
  state: DiscoverySessionState,
  type: AgentEvent["type"]
): AgentEventBase {
  return {
    eventId: createId("event"),
    instanceId: state.instance.instanceId,
    agentDefinitionId: state.agentId,
    sessionId: state.sessionId,
    type,
    createdAt: new Date().toISOString(),
  };
}

function appendTurn(
  transcript: AgentTranscriptState,
  turn: AgentTranscriptTurn
): AgentTranscriptState {
  return {
    ...transcript,
    turns: [...transcript.turns, turn],
    latestTurnId: turn.id,
    updatedAt: turn.createdAt,
  };
}

export function createParticipantTranscriptTurn(
  text: string,
  isFinal: boolean
): AgentTranscriptTurn {
  return {
    id: createId("turn-participant"),
    role: "participant",
    text,
    isFinal,
    createdAt: new Date().toISOString(),
  };
}

export function createAssistantTranscriptTurn(text: string): AgentTranscriptTurn {
  return {
    id: createId("turn-assistant"),
    role: "agent",
    text,
    isFinal: true,
    createdAt: new Date().toISOString(),
  };
}

export function appendParticipantTranscriptEvent(
  state: DiscoverySessionState,
  text: string,
  isFinal: boolean
): DiscoverySessionState {
  const turn = createParticipantTranscriptTurn(text, isFinal);
  const transcript = appendTurn(state.transcript, turn);
  const inputEvent: AgentEvent = {
    ...createEventBase(state, "participant.input"),
    type: "participant.input",
    input: turn,
  };
  const transcriptEvent: AgentEvent = {
    ...createEventBase(state, "transcript.update"),
    type: "transcript.update",
    transcript,
  };

  return {
    ...state,
    transcript,
    eventLog: [...state.eventLog, inputEvent, transcriptEvent],
  };
}

export function appendAssistantTranscriptEvent(
  state: DiscoverySessionState,
  text: string
): DiscoverySessionState {
  const turn = createAssistantTranscriptTurn(text);
  const transcript = appendTurn(state.transcript, turn);
  const responseEvent: AgentEvent = {
    ...createEventBase(state, "assistant.response"),
    type: "assistant.response",
    response: turn,
  };
  const transcriptEvent: AgentEvent = {
    ...createEventBase(state, "transcript.update"),
    type: "transcript.update",
    transcript,
  };

  return {
    ...state,
    transcript,
    eventLog: [...state.eventLog, responseEvent, transcriptEvent],
  };
}
