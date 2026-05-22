
import { useState } from "react";
import BootSequence from "./components/BootSequence";
import Watermark from "./components/Watermark";

export default function App() {
  const [bootComplete, setBootComplete] = useState(false);

  if (!bootComplete) {
    return (
      <BootSequence
        onComplete={() => setBootComplete(true)}
      />
    );
  }

  return (
    <>
      <Watermark />

      {/* YOUR EXISTING APP CONTENT GOES HERE */}
    </>
  );
}
