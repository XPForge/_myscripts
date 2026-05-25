import { useEffect, useMemo, useState } from "react";
import ArrivalScreen from "./ArrivalScreen";
import ListeningState from "./ListeningState";
import PromptReveal from "./PromptReveal";
import {
  buildAdaptiveArchetype,
  buildOnboardingObservation,
  directionOptions,
  promptOptions,
} from "../services/onboardingEngine";
import {
  createOnboardingSignals,
  markObservationShown,
  recordDirectionSelection,
  recordPromptSelection,
  shouldTriggerStrategicObservation,
} from "../services/onboardingSignals";
import {
  createIdentityProfile,
  inferArchetypeFromSelection,
  persistIdentityProfile,
} from "../services/identityConfidence";

type AdaptiveOnboardingProps = {
  onComplete: () => void;
};

export default function AdaptiveOnboarding({ onComplete }: AdaptiveOnboardingProps) {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showListening, setShowListening] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [signals, setSignals] = useState(createOnboardingSignals());
  const [observation, setObservation] = useState<string | null>(null);

  const promptLabels = useMemo(
    () => new Map(promptOptions.map((item) => [item.id, item.label])),
    []
  );

  useEffect(() => {
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setShowWelcome(true), 120));
    timers.push(window.setTimeout(() => setShowQuestion(true), 860));
    timers.push(window.setTimeout(() => setShowHint(true), 1500));
    timers.push(window.setTimeout(() => setShowListening(true), 2400));
    timers.push(window.setTimeout(() => setShowPrompts(true), 4200));
    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, []);

  const handlePromptToggle = (id: string) => {
    setSelectedPrompts((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      setSignals((signal) => recordPromptSelection(signal));
      return next;
    });
  };

  const handleDirectionToggle = (id: string) => {
    setSelectedDirections((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      setSignals((signal) => recordDirectionSelection(signal));
      return next;
    });
  };

  useEffect(() => {
    if (shouldTriggerStrategicObservation(signals)) {
      const text = buildOnboardingObservation(selectedPrompts, selectedDirections);
      setObservation(text);
      setSignals((signal) => markObservationShown(signal));
    }
  }, [signals, selectedDirections, selectedPrompts]);

  const completeOnboarding = () => {
    const archetype = inferArchetypeFromSelection(selectedPrompts, selectedDirections);
    const profile = createIdentityProfile({
      archetype,
      promptHistory: selectedPrompts.map((id) => promptLabels.get(id) ?? id),
      directionInterests: selectedDirections,
      knownToAlice: false,
    });
    persistIdentityProfile(profile);
    onComplete();
  };

  const signIn = () => {
    const archetype = buildAdaptiveArchetype(selectedPrompts, selectedDirections);
    const profile = createIdentityProfile({
      archetype,
      promptHistory: selectedPrompts.map((id) => promptLabels.get(id) ?? id),
      directionInterests: selectedDirections,
      knownToAlice: true,
    });
    persistIdentityProfile(profile);
    onComplete();
  };

  const exploreAnonymously = () => {
    const profile = createIdentityProfile({
      archetype: "Strategic Explorer",
      promptHistory: selectedPrompts.map((id) => promptLabels.get(id) ?? id),
      directionInterests: selectedDirections,
      knownToAlice: false,
    });
    persistIdentityProfile(profile);
    onComplete();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, rgba(30,58,138,0.36), transparent 24%), #020617",
        color: "#e2e8f0",
        overflow: "hidden",
      }}
    >
      {/* reserve bottom space for prompts/listening panel to avoid overlap */}
      <ArrivalScreen
        showWelcome={showWelcome}
        showQuestion={showQuestion}
        showHint={showHint}
        reserveBottom={showPrompts ? 420 : 180}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "20px 16px 36px",
          pointerEvents: "none",
          gap: "12px",
        }}
      >
        {showListening ? <ListeningState /> : null}

        {showPrompts ? (
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              pointerEvents: "auto",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <PromptReveal
              prompts={promptOptions}
              directions={directionOptions}
              selectedPrompts={selectedPrompts}
              selectedDirections={selectedDirections}
              onPromptToggle={handlePromptToggle}
              onDirectionToggle={handleDirectionToggle}
              onContinue={completeOnboarding}
              onExploreAnonymously={exploreAnonymously}
            />
          </div>
        ) : null}

        <div
          style={{
            marginTop: "6px",
            color: "rgba(148,163,184,0.72)",
            fontSize: "0.9rem",
            textAlign: "center",
            pointerEvents: "auto",
          }}
        >
          Already known to ALICE?{" "}
          <button
            type="button"
            onClick={signIn}
            style={{
              border: "none",
              background: "transparent",
              color: "#93c5fd",
              cursor: "pointer",
              textDecoration: "underline",
              fontWeight: 700,
            }}
          >
            Sign In
          </button>
        </div>

        {observation ? (
          <div
            style={{
              marginTop: "12px",
              width: "min(720px, 100%)",
              padding: "12px 16px",
              borderRadius: "14px",
              background: "rgba(15,23,42,0.84)",
              border: "1px solid rgba(96,165,250,0.14)",
              boxShadow: "0 10px 26px rgba(2,6,23,0.22)",
              color: "#dbeafe",
              textAlign: "center",
              pointerEvents: "auto",
            }}
          >
            {observation}
          </div>
        ) : null}
      </div>
    </div>
  );
}
