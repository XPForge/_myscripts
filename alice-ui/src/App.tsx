
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
import AdminDashboardPage from "./pages/AdminDashboardPage";
import FounderDashboardPage from "./pages/FounderDashboardPage";
import { saveDiscoveryIdentity } from "./services/discoveryIdentity";
import { getCurrentUser } from "./services/authClient";
import { saveLastVisitedPage } from "./services/lastVisitedPage";

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
  // Real sign-up/sign-in now happens inline on the hero page (/) — this
  // route checks the actual session cookie server-side rather than trusting
  // localStorage, since that can be cleared or absent on a new device even
  // when the account itself is real. Local identity is re-synced from the
  // verified session so the rest of the Discovery UI keeps reading it the
  // same way it always has.
  const [checked, setChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) {
        saveDiscoveryIdentity(user.name, user.email);
        setAuthorized(true);
      } else {
        window.location.href = "/";
      }
      setChecked(true);
    });
  }, []);

  if (!checked) return null;
  if (!authorized) return null;
  return <DiscoveryPage onRestart={() => { window.location.href = "/"; }} />;
}

export default function App() {
  // Records wherever a participant currently is (everywhere but the landing
  // page itself), so the landing page's gateway can send them straight back
  // to it next time, instead of always dropping them at the front door.
  useEffect(() => {
    if (window.location.pathname !== "/") {
      saveLastVisitedPage(window.location.pathname + window.location.search);
    }
  }, []);

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

  if (window.location.pathname === "/admin") {
    return <AdminDashboardPage />;
  }

  if (window.location.pathname === "/founder") {
    return <FounderDashboardPage />;
  }

  return <HeroLandingPage />;
}
