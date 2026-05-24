import { createPortal } from "react-dom";
import { useSavedJobs } from "../context/SavedJobsContext";
import SavedJobsPanel from "./SavedJobsPanel";
import SwipeCardStack from "./SwipeCardStack";
import TopCommandBar from "./TopCommandBar";

export default function AppShell() {
  const { savedJobs, savedPanelOpen, toggleSavedPanel, setSavedPanelOpen } =
    useSavedJobs();

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
      />
      {createPortal(
        <SavedJobsPanel
          isOpen={savedPanelOpen}
          jobs={savedJobs}
          onClose={() => setSavedPanelOpen(false)}
        />,
        document.body
      )}
      <SwipeCardStack />
    </div>
  );
}
