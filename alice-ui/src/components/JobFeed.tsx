import JobCard from "./JobCard";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  score: number;
  track: string;
  qualificationsScore: number;
  speedScore: number;
  tags: string[];
  summary: string;
  insight: string;
  risks: string;
  folder: string;
};

type ThemeName =
  | "generic_clean"
  | "luxury_tech"
  | "minimal_cinematic"
  | "futuristic_concierge";

type Theme = {
  text: string;
  subtext: string;
  heading: string;
  cardBg: string;
  cardBgSelected: string;
  cardBorder: string;
  cardBorderSelected: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
  mutedBoxBg: string;
  mutedBoxBorder: string;
};

type JobFeedProps = {
  jobs: Job[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  theme: Theme;
  themeMode: ThemeName;
  moveListing: (id: string, folderName: string) => void;
  discardListing: (id: string) => void;
};

export default function JobFeed({
  jobs,
  selectedId,
  setSelectedId,
  theme,
  themeMode,
  moveListing,
  discardListing,
}: JobFeedProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "14px",
        overflowX: "auto",
        overflowY: "hidden",
        paddingBottom: "8px",
        marginTop: "18px",
        scrollSnapType: "x mandatory",
      }}
    >
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          selected={selectedId === job.id}
          onSelect={(id) => setSelectedId(id)}
          onSave={(id) => moveListing(id, "Apply Now")}
          onExpand={(id) => setSelectedId(id)}
          onDiscard={(id) => discardListing(id)}
          theme={theme}
          themeMode={themeMode}
        />
      ))}
    </div>
  );
}