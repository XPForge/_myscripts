
import { useEffect, useState } from "react";

type Props = {
  onContinue: () => void;
  onExperienceMode: () => void;
};

export default function BootSequence({
  onContinue,
  onExperienceMode,
}: Props) {
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOptions(true);
    }, 3800);

    const synth = window.speechSynthesis;

    const speak = (text: string, delay: number) => {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 0.95;
        utterance.volume = 0.8;
        synth.speak(utterance);
      }, delay);
    };

    speak("Welcome back, Paul.", 1400);

    speak(
      "Would you like to continue where you left off, or experience the full startup sequence?",
      4200
    );

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        background:
          "radial-gradient(circle at center, #0f172a 0%, #020617 78%)",
        color: "#f8fafc",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "380px",
          height: "380px",
          borderRadius: "999px",
          background: "rgba(59,130,246,0.18)",
          filter: "blur(110px)",
          animation: "pulse 4s ease-in-out infinite",
        }}
      />

      <img
        src="/ALICE-title-screen_solo.PNG"
        alt="ALICE"
        style={{
          width: "260px",
          maxWidth: "75vw",
          zIndex: 2,
          filter:
            "drop-shadow(0 0 30px rgba(59,130,246,0.45))",
        }}
      />

      <div
        style={{
          marginTop: "18px",
          opacity: 0.72,
          letterSpacing: "0.08em",
          fontSize: "14px",
          zIndex: 2,
        }}
      >
        Initializing Strategic Guidance...
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "70px",
          width: "84%",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          opacity: showOptions ? 1 : 0,
          transform: showOptions
            ? "translateY(0)"
            : "translateY(20px)",
          transition: "all 1.2s ease",
        }}
      >
        <button
          onClick={onContinue}
          style={{
            padding: "18px",
            borderRadius: "18px",
            border: "1px solid rgba(148,163,184,0.2)",
            background: "rgba(59,130,246,0.18)",
            color: "#f8fafc",
            fontSize: "16px",
            backdropFilter: "blur(18px)",
          }}
        >
          Continue Where You Left Off
        </button>

        <button
          onClick={onExperienceMode}
          style={{
            padding: "18px",
            borderRadius: "18px",
            border: "1px solid rgba(148,163,184,0.2)",
            background: "rgba(15,23,42,0.72)",
            color: "#cbd5e1",
            fontSize: "16px",
            backdropFilter: "blur(18px)",
          }}
        >
          Experience Full Startup Sequence
        </button>
      </div>

      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(0.92);
            }

            50% {
              transform: scale(1.08);
            }

            100% {
              transform: scale(0.92);
            }
          }
        `}
      </style>
    </div>
  );
}
