
import AppShell from "./components/AppShell";
import { SavedJobsProvider } from "./context/SavedJobsContext";

export default function App() {
  return (
    <SavedJobsProvider>
      <AppShell />
    </SavedJobsProvider>
  );
}
