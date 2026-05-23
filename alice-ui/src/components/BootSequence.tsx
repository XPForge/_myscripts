
import { useEffect, useState } from "react";

type Props = {
  onComplete: () => void;
};

export default function BootSequence({
  onComplete,
}: Props) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3400),
      setTimeout(() => onComplete(), 5200),
    ];

    const synth = window.speechSynthesis;

    const speak = (text: string, delay: number) => {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 0.95;
        utterance.volume = 0.72;
        synth.speak(utterance);
      }, delay);
    };

    speak("Welcome back, Paul.", 3200);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at center, #0f172a 0%, #020617 75%)",
        color: "#f8fafc",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: phase >= 1 ? "360px" : "120px",
          height: phase >= 1 ? "360px" : "120px",
          borderRadius: "999px",
          background: "rgba(59,130,246,0.18)",
          filter: "blur(100px)",
          transition: "all 2.2s ease",
        }}
      />

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

      <div
        style={{
          marginTop: "24px",
          opacity: phase >= 2 ? 0.7 : 0,
          transition: "opacity 1.4s ease",
          letterSpacing: "0.08em",
          fontSize: "14px",
        }}
      >
        Initializing Strategic Guidance...
      </div>
    </div>
  );
}
