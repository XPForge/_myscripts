
export default function Watermark() {
  return (
    <img
      src="/ALICE-Watermark_w-Alpha.PNG"
      alt="ALICE Watermark"
      style={{
        position: "fixed",
        top: "12px",
        left: "12px",
        width: "42px",
        opacity: 0.16,
        zIndex: 9999,
        pointerEvents: "none",
        filter:
          "drop-shadow(0 0 12px rgba(59,130,246,0.45))",
      }}
    />
  );
}
