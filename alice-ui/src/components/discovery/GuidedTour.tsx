import { useLayoutEffect, useState } from "react";

// MAINTENANCE: this step list points at specific data-tour anchors in
// DiscoveryPage.tsx. Whenever a panel, button, or layout element referenced
// here is added, moved, renamed, or removed, update this list (and the
// matching data-tour attributes) in the same change — regardless of which
// coding assistant is making the edit. A stale tour that points at nothing
// silently skips the step, so drift here is easy to miss otherwise.
export type TourStep = {
  selector: string;
  title: string;
  text: string;
  // Optional supplementary detail, hidden behind an info icon so the main
  // callout stays short — for nuances that matter but would overload the
  // primary explanation.
  detail?: string;
};

export const DISCOVERY_TOUR_STEPS: TourStep[] = [
  {
    // 1: menu items
    selector: '[data-tour="top-actions"]',
    title: "Save, Theme & Account",
    text: "Save & Exit saves your progress on this device so you can leave and come back. You can also switch light/dark theme, check notifications, and access your profile menu here.",
  },
  {
    // 2: status
    selector: '[data-tour="brand-status"]',
    title: "Lighthouse & Session Status",
    text: "This shows you're in an active Discovery session. Lighthouse Discovery is a conversation, not a test — there's no score, no pass/fail.",
  },
  {
    // 3: modes
    selector: '[data-tour="composer"]',
    title: "Communicating with Alice",
    text: "This is where you answer Alice. Speak is the default. Type works the same way if you'd rather not talk out loud. Attach isn't available yet — it's coming in a future update.",
  },
  {
    // 3: modes (Push to Talk)
    selector: '[data-tour="mic-button"]',
    title: "Communicating with Alice · Push to Talk",
    text: "To respond to Alice's question, press the mic button to start recording. Press it again when you're finished speaking.",
  },
  {
    // 4: transcript
    selector: '[data-tour="transcript-review"]',
    title: "Communicating with Alice · Review, Edit & Send",
    text: "Check that your response looks right here. You can edit the text directly in this box if anything needs fixing. When you're satisfied with your answer, press Send to Alice.",
  },
  {
    // 5: profile progress
    selector: '[data-tour="discovery-progress"]',
    title: "Discovery Progress",
    text: "This ring fills up as your conversation covers more ground. It shows how close things are to being ready for a profile — not a requirement, just a guide.",
    detail:
      "You don't have to stop at 100%. Continuing past it lets Discovery go deeper, covering more of the underlying categories Lighthouse aims to capture for every participant — making your eventual profile more thorough.",
  },
  {
    selector: '[data-tour="session-info"]',
    title: "Session Info",
    text: "Your session time, your overall time with Alice, and how many exchanges you've had so far — all live here.",
  },
  {
    // 6: quick actions
    selector: '[data-tour="quick-actions"]',
    title: "Quick Actions",
    text: "Review and generate your profile, export your transcript, or reset your Discovery session anytime from here.",
  },
  {
    selector: '[data-tour="conversation-log"]',
    title: "Your Conversation",
    text: "Everything you and Alice discuss appears here, most recent at the top.",
  },
];

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
}

export function GuidedTourWaitingOverlay({ onCancel }: { onCancel: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2,6,23,0.55)",
      }}
    >
      <div
        style={{
          width: "min(340px, 90vw)",
          borderRadius: "18px",
          padding: "24px",
          background: "rgba(15,23,42,0.97)",
          border: "1px solid rgba(148,163,184,0.18)",
          color: "#e2e8f0",
          textAlign: "center",
          display: "grid",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>Getting the tour ready…</div>
        <div style={{ fontSize: "0.9rem", color: "rgba(226,232,240,0.85)", lineHeight: 1.6 }}>
          The tour will start as soon as Alice finishes what she's saying.
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{
            marginTop: "8px",
            padding: "10px 14px",
            borderRadius: "12px",
            border: "1px solid rgba(148,163,184,0.24)",
            background: "rgba(255,255,255,0.04)",
            color: "#e2e8f0",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function GuidedTour({ onClose }: { onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const step = DISCOVERY_TOUR_STEPS[stepIndex];
  const isLast = stepIndex === DISCOVERY_TOUR_STEPS.length - 1;

  useLayoutEffect(() => {
    // Resolve the target and decide skip-vs-show in one synchronous pass, so
    // there's no render where a stale rect is paired with a new step (which
    // previously caused an extra, incorrect skip on mount).
    const resolve = () => {
      const nextRect = getRect(step.selector);
      if (nextRect) {
        setRect(nextRect);
        return;
      }
      // Target element isn't on screen (e.g. panel collapsed or off-viewport) — skip past it.
      if (isLast) onClose();
      else setStepIndex((index) => index + 1);
    };
    resolve();
    window.addEventListener("resize", resolve);
    window.addEventListener("scroll", resolve, true);
    return () => {
      window.removeEventListener("resize", resolve);
      window.removeEventListener("scroll", resolve, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.selector]);

  useLayoutEffect(() => {
    setShowDetail(false);
  }, [stepIndex]);

  if (!rect) {
    return null;
  }

  const calloutWidth = 340;
  const calloutLeft = Math.min(Math.max(rect.left, 16), window.innerWidth - calloutWidth - 16);
  const spaceBelow = window.innerHeight - rect.bottom;
  const calloutTop = spaceBelow > 220 ? rect.bottom + 20 : Math.max(rect.top - 200, 16);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000 }}>
      {/* Blocks interaction with the underlying page while the tour is active */}
      <div style={{ position: "fixed", inset: 0, background: "transparent" }} onClick={(event) => event.stopPropagation()} />

      {/* Spotlight ring around the target, dimming everywhere else via box-shadow */}
      <div
        style={{
          position: "fixed",
          left: rect.left - 8,
          top: rect.top - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          borderRadius: "16px",
          border: "2px solid rgba(250,204,21,0.85)",
          boxShadow: "0 0 0 9999px rgba(2,6,23,0.6)",
          pointerEvents: "none",
          transition: "all 0.25s ease",
        }}
      />

      {/* Large transparent colored triangle pointing at the target */}
      <div
        style={{
          position: "fixed",
          left: rect.left + rect.width / 2 - 28,
          top: Math.max(rect.top - 52, 8),
          width: 0,
          height: 0,
          borderLeft: "28px solid transparent",
          borderRight: "28px solid transparent",
          borderTop: "44px solid rgba(250,204,21,0.55)",
          filter: "drop-shadow(0 0 14px rgba(250,204,21,0.45))",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "fixed",
          left: calloutLeft,
          top: calloutTop,
          width: calloutWidth,
          borderRadius: "18px",
          padding: "20px",
          background: "rgba(15,23,42,0.98)",
          border: "1px solid rgba(250,204,21,0.35)",
          color: "#e2e8f0",
          boxShadow: "0 20px 50px rgba(2,6,23,0.5)",
          display: "grid",
          gap: "10px",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="End tour"
          title="End tour"
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "26px",
            height: "26px",
            borderRadius: "8px",
            border: "1px solid rgba(148,163,184,0.24)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(226,232,240,0.85)",
            cursor: "pointer",
            fontSize: "0.95rem",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingRight: "28px" }}>
          <strong style={{ fontSize: "1.05rem" }}>{step.title}</strong>
          {step.detail && (
            <button
              type="button"
              onClick={() => setShowDetail((value) => !value)}
              aria-label={showDetail ? "Hide additional detail" : "Show additional detail"}
              aria-expanded={showDetail}
              title="More detail"
              style={{
                width: "18px",
                height: "18px",
                minWidth: "18px",
                borderRadius: "50%",
                border: "1px solid rgba(250,204,21,0.6)",
                background: showDetail ? "rgba(250,204,21,0.28)" : "rgba(250,204,21,0.14)",
                color: "#fde68a",
                fontSize: "0.7rem",
                fontWeight: 800,
                lineHeight: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              i
            </button>
          )}
        </div>
        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.55, color: "rgba(226,232,240,0.9)" }}>{step.text}</p>
        {step.detail && showDetail && (
          <p
            style={{
              margin: 0,
              fontSize: "0.84rem",
              lineHeight: 1.55,
              color: "#fde68a",
              background: "rgba(250,204,21,0.1)",
              border: "1px solid rgba(250,204,21,0.3)",
              borderRadius: "10px",
              padding: "10px 12px",
            }}
          >
            {step.detail}
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "none", color: "rgba(148,163,184,0.9)", cursor: "pointer", fontSize: "0.85rem" }}
          >
            Skip tour
          </button>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "rgba(148,163,184,0.8)" }}>
              {stepIndex + 1} / {DISCOVERY_TOUR_STEPS.length}
            </span>
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((index) => index - 1)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(148,163,184,0.24)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#e2e8f0",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.82rem",
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? onClose() : setStepIndex((index) => index + 1))}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(250,204,21,0.5)",
                background: "rgba(250,204,21,0.18)",
                color: "#fde68a",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: "0.82rem",
              }}
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
