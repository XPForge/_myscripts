import type { ReactNode } from "react";
import { Info, LogIn, Shield } from "lucide-react";
import type { DiscoveryStage } from "../../engine/discoveryState";
import Button from "./Button";
import EthicsDoctrineOverlay from "./EthicsDoctrineOverlay";
import ThemeToggle from "./ThemeToggle";

type AppLayoutProps = {
  children: ReactNode;
  stage: DiscoveryStage;
  theme: "light" | "dark";
  doctrineOpen: boolean;
  onToggleDoctrine: () => void;
  onToggleTheme: () => void;
  onNavigate: (stage: DiscoveryStage) => void;
};

const navStages: { stage: DiscoveryStage; label: string }[] = [
  { stage: "threshold", label: "Home" },
  { stage: "materials", label: "Materials" },
  { stage: "session", label: "Discovery" },
  { stage: "profile", label: "Profile" },
];

export default function AppLayout({
  children,
  stage,
  theme,
  doctrineOpen,
  onToggleDoctrine,
  onToggleTheme,
  onNavigate,
}: AppLayoutProps) {
  return (
    <div className="lh-app" data-theme={theme}>
      <header className="lh-topbar">
        <button className="brand-mark" type="button" onClick={() => onNavigate("threshold")} aria-label="Project Lighthouse home">
          <span className="brand-mark__icon">L</span>
          <span>PROJECT LIGHTHOUSE</span>
        </button>
        <nav className="lh-nav" aria-label="Lighthouse sections">
          {navStages.map((item) => (
            <button
              key={item.stage}
              type="button"
              className={stage === item.stage ? "is-active" : ""}
              onClick={() => onNavigate(item.stage)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="lh-topbar__actions">
          <Button variant="ghost" icon={<Shield size={17} />} onClick={onToggleDoctrine}>
            Ethics Doctrine
          </Button>
          <Button variant="ghost" icon={<Info size={17} />} onClick={() => onNavigate("threshold")}>
            About
          </Button>
          <Button variant="secondary" icon={<LogIn size={17} />} onClick={() => onNavigate("access")}>
            Sign In
          </Button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>
      <EthicsDoctrineOverlay open={doctrineOpen} onClose={onToggleDoctrine} />
      <main className="lh-main">{children}</main>
    </div>
  );
}

