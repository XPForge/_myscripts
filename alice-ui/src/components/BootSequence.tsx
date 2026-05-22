import { useEffect, useState } from "react";

type Props = {
  onContinue: () => void;
  onExperienceMode: () => void;
};

export default function BootSequence({
  onContinue,
  onExperienceMode,
}: Props) {
  const [phase, setPhase] = useState(0);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setShowOptions(true), 5200),
    ];

    const synth = window.speechSynthesis;

    const speak = (text: string, delay: number) => {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 0.95;
        utterance.volume = 0.75;
        synth.speak(utterance);
      }, delay);
    };

    speak("Welcome back, Paul.", 3400);
    speak("Would you like to continue where you left off, or experience the full startup sequence?", 5200);

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      width: "100%",
      height: "100dvh",
      overflow: "hidden",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at center, #0f172a 0%, #020617 75%)",
      color: "#f8fafc",
    }}>
      <div style={{
        position: "absolute",
        width: phase >= 1 ? "360px" : "120px",
        height: phase >= 1 ? "360px" : "120px",
        borderRadius: "999px",
        background: "rgba(59,130,246,0.18)",
        filter: "blur(100px)",
        transition: "all 2.2s ease",
      }} />

      <img
        src="/ALICE-title-screen_solo.PNG"
        alt="ALICE"
        style={{
          width: phase >= 1 ? "240px" : "160px",
          opacity: phase >= 1 ? 1 : 0.25,
          transform: phase >= 1 ? "scale(1)" : "scale(0.82)",
          transition: "all 1.8s ease",
          zIndex: 2,
        }}
      />

      <div style={{
        marginTop: "24px",
        opacity: phase >= 2 ? 0.7 : 0,
        transition: "opacity 1.4s ease",
        letterSpacing: "0.08em",
        fontSize: "14px",
      }}>
        Initializing Strategic Guidance...
      </div>

      <div style={{
        position: "absolute",
        bottom: "90px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        width: "85%",
        opacity: showOptions ? 1 : 0,
        transform: showOptions ? "translateY(0)" : "translateY(24px)",
        transition: "all 1.2s ease",
      }}>
        <button onClick={onContinue} style={{
          background: "rgba(59,130,246,0.18)",
          border: "1px solid rgba(148,163,184,0.18)",
          color: "#f8fafc",
          padding: "18px",
          borderRadius: "18px",
          fontSize: "16px",
          backdropFilter: "blur(18px)",
        }}>
          Continue Where You Left Off
        </button>

        <button onClick={onExperienceMode} style={{
          background: "rgba(15,23,42,0.75)",
          border: "1px solid rgba(148,163,184,0.18)",
          color: "#cbd5e1",
          padding: "18px",
          borderRadius: "18px",
          fontSize: "16px",
          backdropFilter: "blur(18px)",
        }}>
          Experience Full Startup Sequence
        </button>
      </div>
    </div>
  );
}
