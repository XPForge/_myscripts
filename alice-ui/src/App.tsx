
import { useEffect, useState } from "react";
import AdaptiveOnboarding from "./components/AdaptiveOnboarding";
import AppShell from "./components/AppShell";
import LighthouseDiscovery from "./components/LighthouseDiscovery";
import LighthouseAppLayout from "./components/lighthouse/AppLayout";
import { SavedJobsProvider } from "./context/SavedJobsContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { hasKnownIdentity } from "./services/identityConfidence";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import MicrophoneTestPage from "./pages/MicrophoneTestPage";
import ModelInterfacePage from "./pages/ModelInterfacePage";
import NativeBenchmarkPage from "./pages/NativeBenchmarkPage";
import RealtimeVoicePage from "./pages/RealtimeVoicePage";
import ThresholdPage from "./pages/ThresholdPage";
import DiscoveryAccessPage from "./pages/DiscoveryAccessPage";
import MaterialsPage from "./pages/MaterialsPage";
import PreparingPage from "./pages/PreparingPage";
import ReadyPage from "./pages/ReadyPage";
import SessionPage from "./pages/SessionPage";
import LighthouseProfilePage from "./pages/LighthouseProfilePage";
import { loadDiscoverySession, saveDiscoverySession } from "./engine/sessionStore";
import type {
  DiscoverySession,
  DiscoveryStage,
  MaterialItem,
  ParticipantAccess,
} from "./engine/discoveryState";
import "./styles/global.css";
import DiscoveryPage from "./components/discovery/DiscoveryPage";
import HeroLandingPage from "./pages/HeroLandingPage";
import { loadDiscoveryIdentity } from "./services/discoveryIdentity";

function LighthouseCockpit() {
  const [session, setSession] = useState<DiscoverySession>(() => loadDiscoverySession());
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [doctrineOpen, setDoctrineOpen] = useState(false);

  useEffect(() => {
    saveDiscoverySession(session);
  }, [session]);

  const updateSession = (updates: Partial<DiscoverySession>) => {
    setSession((current) => ({ ...current, ...updates }));
  };

  const navigate = (stage: DiscoveryStage) => {
    updateSession({ stage });
  };

  const updateAccess = (access: ParticipantAccess) => updateSession({ access });
  const updateMaterials = (materials: MaterialItem[]) => updateSession({ materials });

  return (
    <LighthouseAppLayout
      stage={session.stage}
      theme={theme}
      doctrineOpen={doctrineOpen}
      onToggleDoctrine={() => setDoctrineOpen((open) => !open)}
      onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
      onNavigate={navigate}
    >
      {session.stage === "threshold" && <ThresholdPage onNavigate={navigate} />}
      {session.stage === "access" && (
        <DiscoveryAccessPage session={session} onUpdateAccess={updateAccess} onNavigate={navigate} />
      )}
      {session.stage === "materials" && (
        <MaterialsPage session={session} onUpdateMaterials={updateMaterials} onNavigate={navigate} />
      )}
      {session.stage === "preparing" && <PreparingPage onNavigate={navigate} />}
      {session.stage === "ready" && (
        <ReadyPage session={session} onUpdate={updateSession} onNavigate={navigate} />
      )}
      {session.stage === "session" && (
        <SessionPage session={session} onUpdate={updateSession} onNavigate={navigate} />
      )}
      {session.stage === "profile" && <LighthouseProfilePage session={session} onNavigate={navigate} />}
    </LighthouseAppLayout>
  );
}

function AppContent() {
  const auth = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [discoveryComplete, setDiscoveryComplete] = useState(false);

  useEffect(() => {
    setHasOnboarded(auth.user ? hasKnownIdentity(auth.user.id) : false);
  }, [auth.user]);

  if (window.location.pathname === "/mic-test") {
    return <MicrophoneTestPage />;
  }

  const handleComplete = () => {
    setShowProfile(false);
    setHasOnboarded(true);
  };

  if (!auth.user) {
    return auth.authMode === "signup" ? <SignupPage /> : <LoginPage />;
  }

  if (!discoveryComplete) {
    return (
      <AppShell onViewProfile={() => setShowProfile(true)}>
        <LighthouseDiscovery onComplete={() => setDiscoveryComplete(true)} />
      </AppShell>
    );
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

function DiscoveryEntry() {
  // Name/email capture now happens inline on the hero page (/) — this route
  // just trusts that identity is already set. If someone lands here directly
  // without it (bookmark, shared link), send them back to capture first.
  if (!loadDiscoveryIdentity()) {
    window.location.href = "/";
    return null;
  }
  return <DiscoveryPage onRestart={() => { window.location.href = "/"; }} />;
}

export default function App() {
  if (window.location.pathname === "/legacy") {
    return (
      <AuthProvider>
        <SavedJobsProvider>
          <AppContent />
        </SavedJobsProvider>
      </AuthProvider>
    );
  }

  if (window.location.pathname === "/model") {
    return <ModelInterfacePage />;
  }

  if (window.location.pathname === "/native-benchmark") {
    return <NativeBenchmarkPage />;
  }

  if (window.location.pathname === "/realtime-voice") {
    return <RealtimeVoicePage />;
  }

  if (window.location.pathname === "/cockpit") {
    return <LighthouseCockpit />;
  }

  if (window.location.pathname === "/discovery") {
    return <DiscoveryEntry />;
  }

  return <HeroLandingPage />;
}
