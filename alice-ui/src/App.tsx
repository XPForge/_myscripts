
import React from "react";
import Watermark from "./components/Watermark";

export default function App() {
  return (
    <>
      <Watermark />

      <div
        style={{
          minHeight: "100dvh",
          background: "#020617",
          color: "#f8fafc",
        }}
      >
        {/* RESTORE YOUR EXISTING APP CONTENT HERE */}
      </div>
    </>
  );
}
