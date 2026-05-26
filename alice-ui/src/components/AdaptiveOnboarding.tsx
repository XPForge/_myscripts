import { useEffect, useMemo, useState } from "react";
import ArrivalScreen from "./ArrivalScreen";
import PromptReveal from "./PromptReveal";
import {
  buildOnboardingObservation,
  directionOptions,
  inferOnboardingMode,
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
import {
  createOnboardingProfile,
  persistOnboardingProfile,
} from "../services/onboardingProfile";
import { useAuth } from "../context/AuthContext";

type AdaptiveOnboardingProps = {
  onComplete: () => void;
};

export default function AdaptiveOnboarding({ onComplete }: AdaptiveOnboardingProps) {
  const auth = useAuth();
  const [showWelcome] = useState(true);
  const [showQuestion] = useState(true);
  const [showHint] = useState(true);
  const [showPrompts] = useState(true);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [signals, setSignals] = useState(createOnboardingSignals());
  const [observation, setObservation] = useState<string | null>(null);

  const promptLabels = useMemo(
    () => new Map(promptOptions.map((item) => [item.id, item.label])),
    []
  );

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

  // focus first prompt button for keyboard users when prompts revealed
  useEffect(() => {
    if (showPrompts) {
      try {
        const root = document.getElementById("prompt-reveal");
        const btn = root?.querySelector("button");
        if (btn && typeof (btn as HTMLElement).focus === "function") (btn as HTMLElement).focus();
      } catch (err) {
        /* ignore */
      }
    }
  }, [showPrompts]);

  const completeOnboarding = () => {
    const archetype = inferArchetypeFromSelection(selectedPrompts, selectedDirections);
    const identity = createIdentityProfile({
      archetype,
      promptHistory: selectedPrompts.map((id) => promptLabels.get(id) ?? id),
      directionInterests: selectedDirections,
      knownToAlice: false,
    });
    const onboardingProfile = createOnboardingProfile({
      mode: inferOnboardingMode(selectedPrompts),
      certaintyScore: selectedPrompts.includes("precision") ? 0.88 : 0.68,
      explorationLevel: selectedPrompts.includes("exploration") || selectedPrompts.includes("discovery") ? 0.92 : 0.55,
      preferredIndustries: selectedDirections,
      excludedIndustries: [],
      promptHistory: selectedPrompts.map((id) => promptLabels.get(id) ?? id),
      directionInterests: selectedDirections,
      clusterAffinities: {},
    });

    persistOnboardingProfile(auth.user?.id, onboardingProfile);
    if (auth.user) {
      persistIdentityProfile(auth.user.id, identity);
    }
    onComplete();
  };

  const exploreAnonymously = () => {
    const identity = createIdentityProfile({
      archetype: "Strategic Explorer",
      promptHistory: selectedPrompts.map((id) => promptLabels.get(id) ?? id),
      directionInterests: selectedDirections,
      knownToAlice: false,
    });
    const onboardingProfile = createOnboardingProfile({
      mode: "exploration",
      certaintyScore: 0.6,
      explorationLevel: 0.98,
      preferredIndustries: selectedDirections,
      excludedIndustries: [],
      promptHistory: selectedPrompts.map((id) => promptLabels.get(id) ?? id),
      directionInterests: selectedDirections,
      clusterAffinities: {},
    });

    persistOnboardingProfile(auth.user?.id, onboardingProfile);
    if (auth.user) {
      persistIdentityProfile(auth.user.id, identity);
    }
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
          padding: "20px 16px 24px",
          pointerEvents: "none",
          gap: "12px",
        }}
      >

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
