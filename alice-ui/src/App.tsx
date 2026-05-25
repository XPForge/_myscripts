
import { useState } from "react";
import AdaptiveOnboarding from "./components/AdaptiveOnboarding";
import AppShell from "./components/AppShell";
import { SavedJobsProvider } from "./context/SavedJobsContext";
import { hasKnownIdentity } from "./services/identityConfidence";

export default function App() {
  const [skippedOnboarding, setSkippedOnboarding] = useState(() => hasKnownIdentity());

  const handleComplete = () => {
    setSkippedOnboarding(true);
  };

  return (
    <SavedJobsProvider>
      {skippedOnboarding ? <AppShell /> : <AdaptiveOnboarding onComplete={handleComplete} />}
    </SavedJobsProvider>
  );
}
