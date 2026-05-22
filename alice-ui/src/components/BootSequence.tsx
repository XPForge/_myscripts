import { useEffect, useState } from "react";

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const synth = window.speechSynthesis;

    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance("Welcome back, Paul.");
        utterance.rate = 0.92;
        utterance.volume = 0.7;
        synth.speak(utterance);
      }, 3200),
      setTimeout(() => onComplete(), 5200),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div style={{
      width: "100%",
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at center, #0f172a 0%, #020617 75%)",
      color: "#f8fafc",
      overflow: "hidden",
      position: "relative",
    }}>
      <div style={{
        position: "absolute",
        width: phase >= 1 ? "340px" : "120px",
        height: phase >= 1 ? "340px" : "120px",
        borderRadius: "999px",
        background: "rgba(59,130,246,0.18)",
        filter: "blur(100px)",
        transition: "all 2s ease",
      }} />

      <img
        src="/ALICE-title-screen_solo.PNG"
        alt="ALICE"
        style={{
          width: phase >= 1 ? "240px" : "160px",
          opacity: phase >= 1 ? 1 : 0.2,
          transform: phase >= 1 ? "scale(1)" : "scale(0.82)",
          transition: "all 1.8s ease",
          zIndex: 2,
        }}
      />

      <div style={{
        marginTop: "24px",
        opacity: phase >= 2 ? 0.7 : 0,
        transition: "opacity 1.2s ease",
        fontSize: "14px",
        letterSpacing: "0.08em",
      }}>
        Initializing Strategic Guidance...
      </div>
    </div>
  );
}
