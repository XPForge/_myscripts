export default function Watermark() {
  return (
    <img
      src="/ALICE-Watermark_w-Alpha.PNG"
      alt="ALICE"
      style={{
        position: "fixed",
        top: "14px",
        left: "14px",
        width: "44px",
        opacity: 0.16,
        zIndex: 1000,
        pointerEvents: "none",
        filter: "drop-shadow(0 0 12px rgba(59,130,246,0.45))",
      }}
    />
  );
}
