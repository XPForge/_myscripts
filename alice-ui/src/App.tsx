
import { useEffect, useState } from "react";
import AdaptiveOnboarding from "./components/AdaptiveOnboarding";
import AppShell from "./components/AppShell";
import LighthouseDiscovery from "./components/LighthouseDiscovery";
import { SavedJobsProvider } from "./context/SavedJobsContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { hasKnownIdentity } from "./services/identityConfidence";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import MicrophoneTestPage from "./pages/MicrophoneTestPage";

function AppContent() {
  const auth = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [discoveryComplete, setDiscoveryComplete] = useState(false);

  if (window.location.pathname === "/mic-test") {
    return <MicrophoneTestPage />;
  }

  useEffect(() => {
    setHasOnboarded(auth.user ? hasKnownIdentity(auth.user.id) : false);
  }, [auth.user]);

  const handleComplete = () => {
    setShowProfile(false);
    setHasOnboarded(true);
  };

  if (!discoveryComplete) {
    return (
      <AppShell onViewProfile={() => setShowProfile(true)}>
        <LighthouseDiscovery onComplete={() => setDiscoveryComplete(true)} />
      </AppShell>
    );
  }

  if (!auth.user) {
    return auth.authMode === "signup" ? <SignupPage /> : <LoginPage />;
  }

  if (showProfile) {
    return (
      <AppShell onViewProfile={() => setShowProfile(true)}>
        <ProfilePage
          user={auth.user}
          onClose={() => setShowProfile(false)}
          onLogout={() => {
            auth.logout();
            setShowProfile(false);
          }}
        />
      </AppShell>
    );
  }

  if (!hasOnboarded) {
    return (
      <AppShell onViewProfile={() => setShowProfile(true)}>
        <AdaptiveOnboarding onComplete={handleComplete} />
      </AppShell>
    );
  }

  return <AppShell onViewProfile={() => setShowProfile(true)} />;
}

export default function App() {
  return (
    <AuthProvider>
      <SavedJobsProvider>
        <AppContent />
      </SavedJobsProvider>
    </AuthProvider>
  );
}
