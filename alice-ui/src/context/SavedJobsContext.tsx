import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { useAuth } from "./AuthContext";

type SavedJobsContextValue = {
  savedJobs: JobCard[];
  savedPanelOpen: boolean;
  setSavedPanelOpen: (open: boolean) => void;
  toggleSavedPanel: () => void;
  saveJob: (job: JobCard) => void;
  dismissJobId: (id: string) => void;
  clearSavedJobs: () => void;
  clearDismissedJobs: () => void;
  isDismissed: (id: string) => boolean;
};

const SavedJobsContext = createContext<SavedJobsContextValue | null>(null);

export function SavedJobsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [savedJobs, setSavedJobs] = useState<JobCard[]>(() => loadSavedJobs(userId));
  const [dismissedJobIds, setDismissedJobIds] = useState<string[]>(() =>
    loadDismissedJobs(userId)
  );
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);

  useEffect(() => {
    setSavedJobs(loadSavedJobs(userId));
    setDismissedJobIds(loadDismissedJobs(userId));
  }, [userId]);

  const dismissedSet = useMemo(
    () => new Set(dismissedJobIds),
    [dismissedJobIds]
  );

  const saveJob = useCallback((job: JobCard) => {
    setSavedJobs((prev) => {
      if (prev.some((item) => item.id === job.id)) return prev;
      const next = [...prev, job];
      persistSavedJobs(next, userId);
      return next;
    });
  }, [userId]);

  const dismissJobId = useCallback((id: string) => {
    setDismissedJobIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      persistDismissedJobs(next, userId);
      return next;
    });
  }, [userId]);

  const clearSavedJobs = useCallback(() => {
    setSavedJobs(() => {
      const next: JobCard[] = [];
      persistSavedJobs(next, userId);
      return next;
    });
  }, [userId]);

  const clearDismissedJobs = useCallback(() => {
    setDismissedJobIds(() => {
      const next: string[] = [];
      persistDismissedJobs(next, userId);
      return next;
    });
  }, [userId]);

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
      clearSavedJobs,
      clearDismissedJobs,
      isDismissed,
    }),
    [
      savedJobs,
      savedPanelOpen,
      toggleSavedPanel,
      saveJob,
      dismissJobId,
      clearSavedJobs,
      clearDismissedJobs,
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
