export type OnboardingSignals = {
  promptSelections: number;
  directionSelections: number;
  anonymousInteractions: number;
  observationShown: boolean;
};

export function createOnboardingSignals(): OnboardingSignals {
  return {
    promptSelections: 0,
    directionSelections: 0,
    anonymousInteractions: 0,
    observationShown: false,
  };
}

export function recordPromptSelection(signals: OnboardingSignals): OnboardingSignals {
  return {
    ...signals,
    promptSelections: signals.promptSelections + 1,
  };
}

export function recordDirectionSelection(signals: OnboardingSignals): OnboardingSignals {
  return {
    ...signals,
    directionSelections: signals.directionSelections + 1,
  };
}

export function recordAnonymousInteraction(signals: OnboardingSignals): OnboardingSignals {
  return {
    ...signals,
    anonymousInteractions: signals.anonymousInteractions + 1,
  };
}

export function shouldTriggerStrategicObservation(signals: OnboardingSignals): boolean {
  if (signals.observationShown) return false;
  return (
    signals.promptSelections + signals.directionSelections >= 2 ||
    signals.anonymousInteractions >= 4
  );
}

export function markObservationShown(signals: OnboardingSignals): OnboardingSignals {
  return {
    ...signals,
    observationShown: true,
  };
}
