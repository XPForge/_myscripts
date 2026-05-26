import { useEffect, useMemo, useState } from "react";
import ArrivalScreen from "./ArrivalScreen";
import PromptReveal from "./PromptReveal";
import SignalProbePanel from "./SignalProbePanel";
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
import { calculateProfileCoverage } from "../services/profileCoverage";
import {
  createSignalProbes,
  evaluateProbeResponse,
  type SignalProbe,
} from "../services/signalProbeEngine";
import {
  createConfidenceDomains,
  estimateDomainsFromSelection,
  type ConfidenceDomains,
} from "../services/confidenceDomains";
import {
  selectNextProbe,
  shouldContinueOnboarding,
} from "../services/onboardingRouting";
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
  const [domainStates, setDomainStates] = useState<ConfidenceDomains>(createConfidenceDomains());
  const [probeHistory, setProbeHistory] = useState<string[]>([]);
  const [activeProbe, setActiveProbe] = useState<SignalProbe | null>(null);
  const [probeResponse, setProbeResponse] = useState("");

  const mode = useMemo(() => inferOnboardingMode(selectedPrompts), [selectedPrompts]);
  const probeSet = useMemo(() => createSignalProbes(mode), [mode]);
  const coverage = useMemo(
    () => calculateProfileCoverage(domainStates, mode),
    [domainStates, mode]
  );

  useEffect(() => {
    setDomainStates(estimateDomainsFromSelection(selectedPrompts, selectedDirections));
    setProbeHistory([]);
    setActiveProbe(null);
    setProbeResponse("");
  }, [selectedPrompts.join(","), selectedDirections.join(",")]);

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

  const completeOnboarding = () => {
    const archetype = inferArchetypeFromSelection(selectedPrompts, selectedDirections);
    const identity = createIdentityProfile({
      archetype,
      promptHistory: selectedPrompts.map((id) => promptLabels.get(id) ?? id),
      directionInterests: selectedDirections,
      knownToAlice: false,
    });
    const onboardingProfile = createOnboardingProfile({
      mode,
      certaintyScore: selectedPrompts.includes("precision") ? 0.88 : 0.68,
      explorationLevel: selectedPrompts.includes("exploration") || selectedPrompts.includes("discovery") ? 0.92 : 0.55,
      preferredIndustries: selectedDirections,
      excludedIndustries: [],
      promptHistory: selectedPrompts.map((id) => promptLabels.get(id) ?? id),
      directionInterests: selectedDirections,
      clusterAffinities: {},
      domainStates,
    });

    persistOnboardingProfile(auth.user?.id, onboardingProfile);
    if (auth.user) {
      persistIdentityProfile(auth.user.id, identity);
    }
    console.debug("ALICE onboarding coverage", coverage);
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
      domainStates,
    });

    persistOnboardingProfile(auth.user?.id, onboardingProfile);
    if (auth.user) {
      persistIdentityProfile(auth.user.id, identity);
    }
    console.debug("ALICE anonymous onboarding coverage", coverage);
    onComplete();
  };

  const handleContinue = () => {
    const nextProbe = selectNextProbe(domainStates, mode, probeHistory, probeSet);
    if (!shouldContinueOnboarding(domainStates, mode, probeHistory.length, probeSet) || !nextProbe) {
      completeOnboarding();
      return;
    }
    setActiveProbe(nextProbe);
    setProbeResponse("");
  };

  const advanceProbeSequence = (
    nextDomains: ConfidenceDomains,
    nextHistory: string[]
  ) => {
    const nextProbe = selectNextProbe(nextDomains, mode, nextHistory, probeSet);
    if (!shouldContinueOnboarding(nextDomains, mode, nextHistory.length, probeSet) || !nextProbe) {
      completeOnboarding();
      return;
    }
    setDomainStates(nextDomains);
    setProbeHistory(nextHistory);
    setActiveProbe(nextProbe);
    setProbeResponse("");
  };

  const handleProbeSubmit = () => {
    if (!activeProbe) return;
    const nextDomains = evaluateProbeResponse(activeProbe, probeResponse, domainStates);
    const nextHistory = [...probeHistory, activeProbe.id];
    advanceProbeSequence(nextDomains, nextHistory);
  };

  const handleProbeSkip = () => {
    if (!activeProbe) return;
    const nextHistory = [...probeHistory, activeProbe.id];
    advanceProbeSequence(domainStates, nextHistory);
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
        reserveBottom={showPrompts ? 520 : 180}
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
        {!activeProbe ? (
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              pointerEvents: "auto",
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <PromptReveal
              prompts={promptOptions}
              directions={directionOptions}
              selectedPrompts={selectedPrompts}
              selectedDirections={selectedDirections}
              onPromptToggle={handlePromptToggle}
              onDirectionToggle={handleDirectionToggle}
              onContinue={handleContinue}
              onExploreAnonymously={exploreAnonymously}
            />

            <div
              style={{
                marginTop: "18px",
                padding: "18px 20px",
                borderRadius: "20px",
                background: "rgba(15,23,42,0.88)",
                border: "1px solid rgba(96,165,250,0.16)",
                color: "rgba(226,232,240,0.9)",
                fontSize: "0.95rem",
                lineHeight: 1.75,
                display: "grid",
                gap: "10px",
              }}
            >
              <div style={{ fontWeight: 700, color: "#f8fafc" }}>
                Onboarding readiness: {Math.round(coverage.totalProfileConfidence * 100)}%
              </div>
              <div>
                {coverage.onboardingReadiness
                  ? "ALICE has enough initial signal to start shaping your profile. Additional questions will refine your fit."
                  : "ALICE is still gathering the right signals. Your answers will decide the next defining question."}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", color: "rgba(148,163,184,0.9)" }}>
                <span>Mode: {mode}</span>
                <span>Questions answered: {probeHistory.length}</span>
                <span>Signals active: {Object.keys(domainStates).filter((key) => domainStates[key as keyof ConfidenceDomains].confidence > 0).length}</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              pointerEvents: "auto",
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{
                padding: "18px 20px",
                borderRadius: "20px",
                background: "rgba(15,23,42,0.88)",
                border: "1px solid rgba(96,165,250,0.16)",
                color: "rgba(226,232,240,0.92)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(148,163,184,0.8)",
                  fontWeight: 700,
                }}
              >
                Adaptive question
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", color: "rgba(148,163,184,0.9)", fontSize: "0.95rem" }}>
                <span>Mode: {mode}</span>
                <span>Readiness: {Math.round(coverage.totalProfileConfidence * 100)}%</span>
                <span>Answered: {probeHistory.length}</span>
              </div>
            </div>
            <SignalProbePanel
              probe={activeProbe}
              response={probeResponse}
              onResponseChange={setProbeResponse}
              onSubmit={handleProbeSubmit}
              onSkip={handleProbeSkip}
            />
          </div>
        )}

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
