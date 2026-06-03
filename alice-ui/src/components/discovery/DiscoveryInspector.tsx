import type { LighthouseProfile } from "../../services/lighthouseProfile";
import type { ReactNode } from "react";
import { useState, type PointerEvent } from "react";
import { Menu, X } from "lucide-react";
import {
  createDiscoverySessionExport,
  createDiscoveryTimeline,
  stringifyDiscoverySessionExport,
  type DiscoverySessionState,
} from "../../engine/agent/discovery";
import { buildDiscoveryPromptAssembly } from "../../ai/lighthousePrompt";

type DiscoveryInspectorProps = {
  profile: LighthouseProfile | null;
  state: DiscoverySessionState | null;
};

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details
      open
      style={{
        border: "1px solid rgba(148,163,184,0.18)",
        borderRadius: "8px",
        padding: "12px",
        background: "rgba(2,6,23,0.72)",
      }}
    >
      <summary style={{ cursor: "pointer", fontWeight: 800, color: "#f8fafc" }}>
        {title}
      </summary>
      <div style={{ marginTop: "12px" }}>{children}</div>
    </details>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre
      style={{
        margin: 0,
        maxHeight: "280px",
        overflow: "auto",
        whiteSpace: "pre-wrap",
        fontSize: "0.78rem",
        lineHeight: 1.5,
        color: "#cbd5e1",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function CountGrid({ state }: { state: DiscoverySessionState }) {
  const items = [
    ["Transcript turns", state.transcript.turns.length],
    ["Observations", state.intelligenceSnapshot.observations.length],
    ["Evidence", state.evidence.length],
    ["Patterns", state.intelligenceSnapshot.patterns.length],
    ["Understanding", state.intelligenceSnapshot.understanding.length],
    ["Open questions", state.openQuestions.length],
    ["Reflections queued", state.reflectionOpportunities.length],
    ["Decisions", state.behaviorDecisionHistory.length],
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "8px",
      }}
    >
      {items.map(([label, count]) => (
        <div
          key={label}
          style={{
            border: "1px solid rgba(59,130,246,0.16)",
            borderRadius: "8px",
            padding: "10px",
            background: "rgba(15,23,42,0.88)",
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: "0.76rem" }}>{label}</div>
          <div style={{ color: "#e2e8f0", fontSize: "1.1rem", fontWeight: 800 }}>
            {count}
          </div>
        </div>
      ))}
    </div>
  );
}

function DiscoveryDecisionInspector({ state }: { state: DiscoverySessionState }) {
  const decision = state.latestBehaviorDecision;
  const evidence = decision
    ? state.evidence.filter((item) => decision.supportingEvidenceIds.includes(item.id))
    : [];

  return (
    <InspectorSection title="Discovery Decision Inspector">
      {decision ? (
        <div style={{ display: "grid", gap: "10px" }}>
          <div>
            <strong>Decision:</strong> {decision.selectedRequest.type}
          </div>
          <div>
            <strong>Confidence:</strong> {decision.confidence}
          </div>
          <div>
            <strong>Rationale:</strong> {decision.rationale}
          </div>
          <div>
            <strong>Supporting evidence:</strong> {evidence.length}
          </div>
          <JsonBlock
            value={{
              selectedRequest: decision.selectedRequest,
              supportingEvidence: evidence,
              rejectedOrReprioritizedAlternatives: decision.candidateAlternatives,
              metadata: decision.metadata,
            }}
          />
        </div>
      ) : (
        <div>No behavior decision has been selected yet.</div>
      )}
    </InspectorSection>
  );
}

function DiscoveryPromptInspector({
  profile,
  state,
}: {
  profile: LighthouseProfile | null;
  state: DiscoverySessionState;
}) {
  if (!profile) {
    return (
      <InspectorSection title="Discovery Prompt Inspector">
        <div>Prompt inspection is waiting for participant profile metadata.</div>
      </InspectorSection>
    );
  }

  const assembly = buildDiscoveryPromptAssembly(profile, state);
  const activeRequest = assembly.outputs.supportedBehaviorRequests[0];

  return (
    <InspectorSection title="Discovery Prompt Inspector">
      <div style={{ display: "grid", gap: "10px" }}>
        <div>
          <strong>Active behavior request:</strong> {activeRequest?.type ?? "none"}
        </div>
        <JsonBlock
          value={{
            runtimeMetadata: assembly.outputs.runtimeMetadata,
            activeBehaviorRequest: activeRequest,
            conversationGuidance: assembly.outputs.conversationGuidance,
            reflectionGuidance: assembly.outputs.reflectionGuidance,
          }}
        />
      </div>
    </InspectorSection>
  );
}

function DiscoveryTimeline({ profile, state }: DiscoveryInspectorProps) {
  if (!state) return null;
  const promptOutputs = profile
    ? buildDiscoveryPromptAssembly(profile, state).outputs
    : undefined;
  const timeline = createDiscoveryTimeline(state, promptOutputs);

  return (
    <InspectorSection title="Discovery Timeline">
      <div style={{ display: "grid", gap: "8px" }}>
        {timeline.length === 0 ? (
          <div>No Discovery events have been recorded yet.</div>
        ) : (
          timeline.map((item) => (
            <div
              key={item.id}
              style={{
                borderLeft: "3px solid rgba(96,165,250,0.55)",
                padding: "6px 0 6px 10px",
              }}
            >
              <div style={{ color: "#f8fafc", fontWeight: 800 }}>
                {item.title} <span style={{ color: "#94a3b8" }}>({item.type})</span>
              </div>
              <div style={{ color: "#cbd5e1" }}>{item.description}</div>
              <div style={{ color: "#64748b", fontSize: "0.74rem" }}>{item.createdAt}</div>
            </div>
          ))
        )}
      </div>
    </InspectorSection>
  );
}

function exportSession(profile: LighthouseProfile | null, state: DiscoverySessionState) {
  const assembly = profile ? buildDiscoveryPromptAssembly(profile, state) : undefined;
  const snapshot = createDiscoverySessionExport(state, assembly?.outputs);
  const blob = new Blob([stringifyDiscoverySessionExport(snapshot)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `discovery-session-${state.sessionId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DiscoveryInspector({ profile, state }: DiscoveryInspectorProps) {
  const [open, setOpen] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 760, height: 720 });

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = panelSize.width;
    const startHeight = panelSize.height;

    const resize = (moveEvent: globalThis.PointerEvent) => {
      setPanelSize({
        width: Math.max(360, Math.min(window.innerWidth - 32, startWidth + moveEvent.clientX - startX)),
        height: Math.max(320, Math.min(window.innerHeight - 84, startHeight + moveEvent.clientY - startY)),
      });
    };

    const stopResize = () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
    };

    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Open Discovery inspector"
        title="Discovery inspector"
        style={{
          position: "fixed",
          top: "calc(env(safe-area-inset-top, 0px) + 7px)",
          right: "236px",
          zIndex: 60,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "38px",
          height: "38px",
          borderRadius: "14px",
          border: "1px solid rgba(148,163,184,0.22)",
          background: open ? "rgba(14,165,233,0.26)" : "rgba(30,41,59,0.78)",
          color: "#dbeafe",
          cursor: "pointer",
          boxShadow: open ? "0 0 20px rgba(14,165,233,0.26)" : "0 0 12px rgba(15,23,42,0.35)",
        }}
      >
        {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
      </button>

      {open ? (
        <div
          style={{
            position: "fixed",
            right: "16px",
            top: "calc(52px + env(safe-area-inset-top, 0px) + 10px)",
            width: `${panelSize.width}px`,
            height: `${panelSize.height}px`,
            minWidth: "360px",
            minHeight: "320px",
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "calc(100vh - 84px)",
            overflow: "auto",
            zIndex: 59,
            padding: "16px",
            borderRadius: "8px",
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(14,165,233,0.24)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
            color: "#cbd5e1",
            display: "grid",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <div style={{ color: "#f8fafc", fontWeight: 900 }}>Discovery Inspector</div>
              <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                Developer-only view of Discovery reasoning state.
              </div>
            </div>
            {state ? (
              <button
                type="button"
                onClick={() => exportSession(profile, state)}
                style={{
                  alignSelf: "start",
                  borderRadius: "8px",
                  border: "1px solid rgba(96,165,250,0.45)",
                  background: "rgba(59,130,246,0.18)",
                  color: "#e0f2fe",
                  padding: "8px 10px",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Export JSON
              </button>
            ) : null}
          </div>

          {state ? (
            <>
              <CountGrid state={state} />

              <InspectorSection title="Discovery Inspector">
                <JsonBlock
                  value={{
                    observations: state.intelligenceSnapshot.observations,
                    evidence: state.evidence,
                    confidence: state.intelligenceSnapshot.observations.map((observation) => ({
                      targetId: observation.id,
                      confidence: observation.confidence,
                    })),
                    patterns: state.intelligenceSnapshot.patterns,
                    coverage: state.intelligenceSnapshot.coverage,
                    understanding: state.intelligenceSnapshot.understanding,
                    openQuestions: state.openQuestions,
                    reflectionOpportunities: state.reflectionOpportunities,
                    participantConfirmations: state.participantConfirmations,
                  }}
                />
              </InspectorSection>

              <DiscoveryDecisionInspector state={state} />
              <DiscoveryPromptInspector profile={profile} state={state} />
              <DiscoveryTimeline profile={profile} state={state} />
            </>
          ) : (
            <div>Waiting for persisted Discovery session state.</div>
          )}
          <div
            onPointerDown={startResize}
            title="Resize Discovery inspector"
            aria-label="Resize Discovery inspector"
            role="separator"
            style={{
              position: "sticky",
              left: "100%",
              bottom: 0,
              width: "22px",
              height: "22px",
              justifySelf: "end",
              marginTop: "-4px",
              marginRight: "-8px",
              marginBottom: "-8px",
              cursor: "nwse-resize",
              borderRadius: "6px",
              border: "1px solid rgba(125,211,252,0.55)",
              background:
                "linear-gradient(135deg, transparent 0 35%, rgba(125,211,252,0.35) 35% 45%, transparent 45% 58%, rgba(125,211,252,0.55) 58% 68%, transparent 68%)",
              boxShadow: "0 0 14px rgba(14,165,233,0.28)",
            }}
          />
        </div>
      ) : null}
    </>
  );
}
