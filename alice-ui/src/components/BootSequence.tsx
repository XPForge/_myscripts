
import { useEffect } from "react";

type Props = {
  onComplete: () => void;
};

export default function BootSequence({
  onComplete,
}: Props) {

  useEffect(() => {
    onComplete();
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
          width: "360px",
          height: "360px",
          borderRadius: "999px",
          background: "rgba(59,130,246,0.18)",
          filter: "blur(100px)",
        }}
      />

      <img
        src="/ALICE-title-screen_solo.PNG"
        alt="ALICE"
        style={{
          width: "240px",
          opacity: 1,
          transform: "scale(1)",
          zIndex: 2,
        }}
      />

      <div
        style={{
          marginTop: "24px",
          opacity: 0.7,
          letterSpacing: "0.08em",
          fontSize: "14px",
        }}
      >
        Initializing Strategic Guidance...
      </div>
    </div>
  );
}
