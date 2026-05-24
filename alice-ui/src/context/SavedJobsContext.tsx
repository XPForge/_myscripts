import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { JobCard } from "../services/jobService";
import {
  loadDismissedJobs,
  loadSavedJobs,
  persistDismissedJobs,
  persistSavedJobs,
} from "../services/jobPersistence";

type SavedJobsContextValue = {
  savedJobs: JobCard[];
  savedPanelOpen: boolean;
  setSavedPanelOpen: (open: boolean) => void;
  toggleSavedPanel: () => void;
  saveJob: (job: JobCard) => void;
  dismissJobId: (id: string) => void;
  isDismissed: (id: string) => boolean;
};

const SavedJobsContext = createContext<SavedJobsContextValue | null>(null);

export function SavedJobsProvider({ children }: { children: ReactNode }) {
  const [savedJobs, setSavedJobs] = useState<JobCard[]>(() => loadSavedJobs());
  const [dismissedJobIds, setDismissedJobIds] = useState<string[]>(() =>
    loadDismissedJobs()
  );
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);

  const dismissedSet = useMemo(
    () => new Set(dismissedJobIds),
    [dismissedJobIds]
  );

  const saveJob = useCallback((job: JobCard) => {
    setSavedJobs((prev) => {
      if (prev.some((item) => item.id === job.id)) return prev;
      const next = [...prev, job];
      persistSavedJobs(next);
      return next;
    });
  }, []);

  const dismissJobId = useCallback((id: string) => {
    setDismissedJobIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      persistDismissedJobs(next);
      return next;
    });
  }, []);

  const isDismissed = useCallback(
    (id: string) => dismissedSet.has(id),
    [dismissedSet]
  );

  const toggleSavedPanel = useCallback(() => {
    setSavedPanelOpen((open) => !open);
  }, []);

  const value = useMemo(
    () => ({
      savedJobs,
      savedPanelOpen,
      setSavedPanelOpen,
      toggleSavedPanel,
      saveJob,
      dismissJobId,
      isDismissed,
    }),
    [
      savedJobs,
      savedPanelOpen,
      toggleSavedPanel,
      saveJob,
      dismissJobId,
      isDismissed,
    ]
  );

  return (
    <SavedJobsContext.Provider value={value}>
      {children}
    </SavedJobsContext.Provider>
  );
}

export function useSavedJobs() {
  const context = useContext(SavedJobsContext);
  if (!context) {
    throw new Error("useSavedJobs must be used within SavedJobsProvider");
  }
  return context;
}
