
import { useEffect, useState } from "react";
import AdaptiveOnboarding from "./components/AdaptiveOnboarding";
import AppShell from "./components/AppShell";
import { SavedJobsProvider } from "./context/SavedJobsContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { hasKnownIdentity } from "./services/identityConfidence";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";

function AppContent() {
  const auth = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    setHasOnboarded(auth.user ? hasKnownIdentity(auth.user.id) : false);
  }, [auth.user]);

  const handleComplete = () => {
    setShowProfile(false);
    setHasOnboarded(true);
  };

  if (!auth.user) {
    return auth.authMode === "signup" ? <SignupPage /> : <LoginPage />;
  }

  if (showProfile) {
    return (
      <ProfilePage
        user={auth.user}
        onClose={() => setShowProfile(false)}
        onLogout={() => {
          auth.logout();
          setShowProfile(false);
        }}
      />
    );
  }

  if (!hasOnboarded) {
    return <AdaptiveOnboarding onComplete={handleComplete} />;
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
