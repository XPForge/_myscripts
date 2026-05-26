import { createPortal } from "react-dom";
import { useState } from "react";
import { useSavedJobs } from "../context/SavedJobsContext";
import { clearAdaptivePreferences } from "../services/feedManager";
import SavedJobsPanel from "./SavedJobsPanel";
import StrategicProfilePanel from "./StrategicProfilePanel";
import SwipeCardStack from "./SwipeCardStack";
import TopCommandBar from "./TopCommandBar";

type AppShellProps = {
  onViewProfile: () => void;
};

export default function AppShell({ onViewProfile }: AppShellProps) {
  const {
    savedJobs,
    savedPanelOpen,
    toggleSavedPanel,
    setSavedPanelOpen,
    clearSavedJobs,
    clearDismissedJobs,
  } = useSavedJobs();

  const [feedKey, setFeedKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  const showStatus = (message: string) => {
    setStatusMessage(message);
  };

  const handleRefresh = () => {
    setFeedKey((key) => key + 1);
    showStatus("Opportunities refreshed.");
  };

  const handleResetDismissed = () => {
    clearDismissedJobs();
    setFeedKey((key) => key + 1);
    showStatus("Dismissed jobs restored.");
  };

  const handleFullReset = () => {
    clearSavedJobs();
    clearDismissedJobs();
    clearAdaptivePreferences();
    setFeedKey((key) => key + 1);
    showStatus("ALICE fully reset to first-launch state.");
  };

  const [inspectorOpen, setInspectorOpen] = useState(false);

  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at top, #0f172a 0%, #020617 75%)",
        overflow: "hidden",
      }}
    >
      <TopCommandBar
        savedCount={savedJobs.length}
        onSavedClick={toggleSavedPanel}
        isSavedPanelOpen={savedPanelOpen}
        onRefreshOpportunities={handleRefresh}
        onResetDismissedJobs={handleResetDismissed}
        onFullStrategicReset={handleFullReset}
        onViewProfile={onViewProfile}
        onInspectProfile={() => setInspectorOpen(true)}
      />
      {statusMessage ? (
        <div
          style={{
            position: "absolute",
            right: "16px",
            top: "calc(52px + env(safe-area-inset-top, 0px) + 10px)",
            padding: "10px 14px",
            borderRadius: "18px",
            background: "rgba(15,23,42,0.92)",
            border: "1px solid rgba(59,130,246,0.22)",
            color: "#e2e8f0",
            fontSize: "12px",
            boxShadow: "0 16px 34px rgba(2,6,23,0.32)",
            zIndex: 25,
          }}
        >
          {statusMessage}
        </div>
      ) : null}
      {createPortal(
        <SavedJobsPanel
          isOpen={savedPanelOpen}
          jobs={savedJobs}
          onClose={() => setSavedPanelOpen(false)}
        />,
        document.body
      )}
      <StrategicProfilePanel
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
      />
      <SwipeCardStack feedKey={feedKey} />
    </div>
  );
}
