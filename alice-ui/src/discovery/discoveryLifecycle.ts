import type { DiscoveryId, DiscoveryIsoTimestamp } from "./discoveryTypes.ts";

export type DiscoveryLifecycleState =
  | "initialized"
  | "active_discovery"
  | "profile_basic_ready"
  | "generating_profile"
  | "profile_ready_for_review"
  | "paused"
  | "closed";

export type DiscoveryLifecycleEventType =
  | "DISCOVERY_WORKSPACE_CREATED"
  | "DISCOVERY_SESSION_STARTED"
  | "DISCOVERY_TURN_CAPTURED"
  | "EVIDENCE_ITEM_CREATED"
  | "SIGNAL_EXTRACTED"
  | "THEME_IDENTIFIED"
  | "PARTICIPANT_CONFIRMATION_RECORDED"
  | "OPEN_QUESTION_CREATED"
  | "PROFILE_BASIC_READY"
  | "PROFILE_GENERATION_STARTED"
  | "PROFILE_GENERATION_COMPLETED"
  | "PROFILE_REVIEWED"
  | "DISCOVERY_PAUSED"
  | "DISCOVERY_RESUMED"
  | "DISCOVERY_CLOSED";

export type DiscoveryLifecycleEvent = {
  eventId: DiscoveryId;
  type: DiscoveryLifecycleEventType;
  occurredAt: DiscoveryIsoTimestamp;
  workspaceId?: DiscoveryId;
  sessionId?: DiscoveryId;
  sourceId?: DiscoveryId;
};

export type DiscoveryLifecycleContext = {
  state: DiscoveryLifecycleState;
  previousActiveState?: Exclude<DiscoveryLifecycleState, "paused" | "closed">;
  lastEventId?: DiscoveryId;
  updatedAt?: DiscoveryIsoTimestamp;
};

export const initialDiscoveryLifecycleContext: DiscoveryLifecycleContext = {
  state: "initialized",
};

export function reduceDiscoveryLifecycle(
  context: DiscoveryLifecycleContext,
  event: DiscoveryLifecycleEvent
): DiscoveryLifecycleContext {
  if (context.state === "closed") {
    return applyLifecycleEvent(context, event, event.type === "DISCOVERY_CLOSED" ? "closed" : context.state);
  }

  if (event.type === "DISCOVERY_CLOSED") {
    return applyLifecycleEvent(context, event, "closed");
  }

  if (event.type === "DISCOVERY_PAUSED") {
    return {
      ...applyLifecycleEvent(context, event, "paused"),
      previousActiveState: context.state === "paused" ? context.previousActiveState : context.state,
    };
  }

  if (event.type === "DISCOVERY_RESUMED") {
    const resumedState = context.state === "paused" ? (context.previousActiveState ?? "active_discovery") : context.state;
    return applyLifecycleEvent(context, event, resumedState);
  }

  if (context.state === "paused") {
    return applyLifecycleEvent(context, event, context.state);
  }

  switch (event.type) {
    case "DISCOVERY_WORKSPACE_CREATED":
      return applyLifecycleEvent(context, event, "initialized");
    case "DISCOVERY_SESSION_STARTED":
    case "DISCOVERY_TURN_CAPTURED":
    case "EVIDENCE_ITEM_CREATED":
    case "SIGNAL_EXTRACTED":
    case "THEME_IDENTIFIED":
    case "PARTICIPANT_CONFIRMATION_RECORDED":
    case "OPEN_QUESTION_CREATED":
    case "PROFILE_REVIEWED":
      return applyLifecycleEvent(context, event, keepDiscoveryOpenState(context.state));
    case "PROFILE_BASIC_READY":
      return applyLifecycleEvent(context, event, "profile_basic_ready");
    case "PROFILE_GENERATION_STARTED":
      return context.state === "profile_basic_ready" || context.state === "profile_ready_for_review"
        ? applyLifecycleEvent(context, event, "generating_profile")
        : applyLifecycleEvent(context, event, context.state);
    case "PROFILE_GENERATION_COMPLETED":
      return context.state === "generating_profile"
        ? applyLifecycleEvent(context, event, "profile_ready_for_review")
        : applyLifecycleEvent(context, event, context.state);
  }
}

export function applyDiscoveryLifecycleEvents(
  events: DiscoveryLifecycleEvent[],
  initialContext: DiscoveryLifecycleContext = initialDiscoveryLifecycleContext
): DiscoveryLifecycleContext {
  return events.reduce(reduceDiscoveryLifecycle, initialContext);
}

function keepDiscoveryOpenState(state: DiscoveryLifecycleState): DiscoveryLifecycleState {
  return state === "initialized" ? "active_discovery" : state;
}

function applyLifecycleEvent(
  context: DiscoveryLifecycleContext,
  event: DiscoveryLifecycleEvent,
  state: DiscoveryLifecycleState
): DiscoveryLifecycleContext {
  return {
    ...context,
    state,
    lastEventId: event.eventId,
    updatedAt: event.occurredAt,
    previousActiveState: state === "paused" ? context.previousActiveState : undefined,
  };
}
