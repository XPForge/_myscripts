import JobFeed from "./components/JobFeed";
import ExclusionControls from "./components/ExclusionControls";
import ResumeWorkspace from "./resume/ResumeWorkspace";
import type { JobData } from "./resume/ResumeEngine";
import React, { useEffect, useMemo, useState } from "react";

import {
  Search,
  Mic,
  FolderOpen,
  Star,
  SlidersHorizontal,
  Brain,
  Briefcase,
  ArrowRight,
  Bookmark,
  MessageSquare,
  Sparkles,
  Filter,
  Bell,
  Palette,
  X,
} from "lucide-react";

// =====================================================
// TYPES: JOB DATA MODEL
// =====================================================
type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  score: number;
  track: string;
  domain: string;
  qualificationsScore: number;
  speedScore: number;
  tags: string[];
  summary: string;
  insight: string;
  risks: string;
  folder: string;
  description: string;
  requirements: string;
  responsibilities: string;
  preferred: string;
  tools: string;
  url: string;
};

// =====================================================
// TYPES: THEME NAMES
// =====================================================
type ThemeName =
  | "generic_clean"
  | "luxury_tech"
  | "minimal_cinematic"
  | "futuristic_concierge";

// =====================================================
// TYPES: THEME SHAPE
// =====================================================
type Theme = {
  appBg: string;
  text: string;
  subtext: string;
  heading: string;
  panelBg: string;
  panelBorder: string;
  panelShadow: string;
  panelBackdrop?: string;
  cardBg: string;
  cardBgSelected: string;
  cardBorder: string;
  cardBorderSelected: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
  mutedBoxBg: string;
  mutedBoxBorder: string;
  primaryButtonBg: string;
  primaryButtonBorder: string;
  primaryButtonText: string;
  primaryButtonShadow?: string;
  outlineButtonBg: string;
  outlineButtonBorder: string;
  outlineButtonText: string;
  destructiveButtonBg: string;
  destructiveButtonBorder: string;
  destructiveButtonText: string;
  sliderAccent: string;
  trackBarBg: string;
  trackBarFill: string;
  chatAliceBg: string;
  chatAliceBorder: string;
  chatAliceText: string;
  chatUserBg: string;
  chatUserText: string;
};

// =====================================================
// THEME CONFIGURATION
// =====================================================
const themes: Record<ThemeName, Theme> = {
  generic_clean: {
    appBg: "#f8fafc",
    text: "#0f172a",
    subtext: "#475569",
    heading: "#0f172a",
    panelBg: "#ffffff",
    panelBorder: "1px solid #e2e8f0",
    panelShadow: "0 10px 30px rgba(15,23,42,0.06)",
    cardBg: "#ffffff",
    cardBgSelected: "#ffffff",
    cardBorder: "1px solid #e2e8f0",
    cardBorderSelected: "2px solid #0f172a",
    inputBg: "#ffffff",
    inputBorder: "1px solid #cbd5e1",
    inputText: "#0f172a",
    pillBg: "#f1f5f9",
    pillText: "#334155",
    pillBorder: "1px solid #cbd5e1",
    mutedBoxBg: "#f8fafc",
    mutedBoxBorder: "1px solid #e2e8f0",
    primaryButtonBg: "#0f172a",
    primaryButtonBorder: "#0f172a",
    primaryButtonText: "#ffffff",
    outlineButtonBg: "#ffffff",
    outlineButtonBorder: "#cbd5e1",
    outlineButtonText: "#0f172a",
    destructiveButtonBg: "#e11d48",
    destructiveButtonBorder: "#e11d48",
    destructiveButtonText: "#ffffff",
    sliderAccent: "#0f172a",
    trackBarBg: "#e2e8f0",
    trackBarFill: "#0f172a",
    chatAliceBg: "#ffffff",
    chatAliceBorder: "1px solid #e2e8f0",
    chatAliceText: "#0f172a",
    chatUserBg: "#0f172a",
    chatUserText: "#ffffff",
  },

  luxury_tech: {
    appBg:
      "radial-gradient(circle at top left, rgba(37,99,235,0.16), transparent 28%), radial-gradient(circle at top right, rgba(56,189,248,0.10), transparent 24%), linear-gradient(180deg, #020617 0%, #0f172a 45%, #111827 100%)",
    text: "#e2e8f0",
    subtext: "#94a3b8",
    heading: "#f8fafc",
    panelBg: "rgba(15, 23, 42, 0.62)",
    panelBorder: "1px solid rgba(148, 163, 184, 0.14)",
    panelShadow:
      "0 20px 60px rgba(2, 6, 23, 0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
    panelBackdrop: "blur(18px)",
    cardBg: "linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.96))",
    cardBgSelected:
      "linear-gradient(180deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))",
    cardBorder: "1px solid rgba(148,163,184,0.12)",
    cardBorderSelected: "1px solid rgba(96,165,250,0.42)",
    inputBg: "rgba(255,255,255,0.04)",
    inputBorder: "1px solid rgba(148,163,184,0.18)",
    inputText: "#e2e8f0",
    pillBg: "rgba(255,255,255,0.04)",
    pillText: "#cbd5e1",
    pillBorder: "1px solid rgba(148,163,184,0.12)",
    mutedBoxBg: "rgba(255,255,255,0.03)",
    mutedBoxBorder: "1px solid rgba(148,163,184,0.12)",
    primaryButtonBg: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    primaryButtonBorder: "rgba(96,165,250,0.28)",
    primaryButtonText: "#ffffff",
    primaryButtonShadow: "0 10px 25px rgba(37,99,235,0.28)",
    outlineButtonBg: "rgba(255,255,255,0.03)",
    outlineButtonBorder: "rgba(148,163,184,0.18)",
    outlineButtonText: "#e2e8f0",
    destructiveButtonBg: "linear-gradient(135deg, #e11d48, #be123c)",
    destructiveButtonBorder: "rgba(251,113,133,0.28)",
    destructiveButtonText: "#ffffff",
    sliderAccent: "#60a5fa",
    trackBarBg: "rgba(255,255,255,0.05)",
    trackBarFill: "linear-gradient(90deg, #60a5fa, #38bdf8)",
    chatAliceBg: "rgba(255,255,255,0.04)",
    chatAliceBorder: "1px solid rgba(148,163,184,0.12)",
    chatAliceText: "#e2e8f0",
    chatUserBg: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    chatUserText: "#ffffff",
  },

  minimal_cinematic: {
    appBg: "linear-gradient(180deg, #0b1020 0%, #101827 40%, #0f172a 100%)",
    text: "#e5e7eb",
    subtext: "#9ca3af",
    heading: "#ffffff",
    panelBg: "rgba(17, 24, 39, 0.92)",
    panelBorder: "1px solid rgba(255,255,255,0.06)",
    panelShadow: "0 18px 40px rgba(0,0,0,0.28)",
    panelBackdrop: "blur(8px)",
    cardBg: "rgba(17, 24, 39, 0.95)",
    cardBgSelected: "rgba(31, 41, 55, 0.98)",
    cardBorder: "1px solid rgba(255,255,255,0.06)",
    cardBorderSelected: "1px solid rgba(255,255,255,0.16)",
    inputBg: "rgba(255,255,255,0.03)",
    inputBorder: "1px solid rgba(255,255,255,0.08)",
    inputText: "#f3f4f6",
    pillBg: "rgba(255,255,255,0.04)",
    pillText: "#d1d5db",
    pillBorder: "1px solid rgba(255,255,255,0.08)",
    mutedBoxBg: "rgba(255,255,255,0.03)",
    mutedBoxBorder: "1px solid rgba(255,255,255,0.06)",
    primaryButtonBg: "#f9fafb",
    primaryButtonBorder: "#f9fafb",
    primaryButtonText: "#111827",
    primaryButtonShadow: "0 8px 24px rgba(255,255,255,0.12)",
    outlineButtonBg: "transparent",
    outlineButtonBorder: "rgba(255,255,255,0.12)",
    outlineButtonText: "#e5e7eb",
    destructiveButtonBg: "#991b1b",
    destructiveButtonBorder: "#991b1b",
    destructiveButtonText: "#ffffff",
    sliderAccent: "#f3f4f6",
    trackBarBg: "rgba(255,255,255,0.08)",
    trackBarFill: "#f3f4f6",
    chatAliceBg: "rgba(255,255,255,0.04)",
    chatAliceBorder: "1px solid rgba(255,255,255,0.08)",
    chatAliceText: "#e5e7eb",
    chatUserBg: "#f9fafb",
    chatUserText: "#111827",
  },

  futuristic_concierge: {
    appBg:
      "radial-gradient(circle at 20% 0%, rgba(34,211,238,0.18), transparent 25%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.18), transparent 22%), linear-gradient(180deg, #050816 0%, #0b1020 55%, #0a0f1f 100%)",
    text: "#dbeafe",
    subtext: "#93c5fd",
    heading: "#f8fbff",
    panelBg: "rgba(7, 12, 28, 0.72)",
    panelBorder: "1px solid rgba(56,189,248,0.16)",
    panelShadow:
      "0 18px 48px rgba(2,6,23,0.42), 0 0 50px rgba(56,189,248,0.08)",
    panelBackdrop: "blur(16px)",
    cardBg: "linear-gradient(180deg, rgba(8,15,35,0.92), rgba(10,18,42,0.98))",
    cardBgSelected:
      "linear-gradient(180deg, rgba(12,24,58,0.96), rgba(7,16,40,0.99))",
    cardBorder: "1px solid rgba(56,189,248,0.14)",
    cardBorderSelected: "1px solid rgba(96,165,250,0.36)",
    inputBg: "rgba(255,255,255,0.03)",
    inputBorder: "1px solid rgba(56,189,248,0.16)",
    inputText: "#e0f2fe",
    pillBg: "rgba(34,211,238,0.08)",
    pillText: "#bae6fd",
    pillBorder: "1px solid rgba(56,189,248,0.16)",
    mutedBoxBg: "rgba(255,255,255,0.03)",
    mutedBoxBorder: "1px solid rgba(56,189,248,0.12)",
    primaryButtonBg: "linear-gradient(135deg, #06b6d4, #2563eb)",
    primaryButtonBorder: "rgba(56,189,248,0.28)",
    primaryButtonText: "#ffffff",
    primaryButtonShadow: "0 10px 30px rgba(6,182,212,0.22)",
    outlineButtonBg: "rgba(255,255,255,0.03)",
    outlineButtonBorder: "rgba(56,189,248,0.18)",
    outlineButtonText: "#dbeafe",
    destructiveButtonBg: "linear-gradient(135deg, #be123c, #7f1d1d)",
    destructiveButtonBorder: "rgba(244,63,94,0.24)",
    destructiveButtonText: "#ffffff",
    sliderAccent: "#22d3ee",
    trackBarBg: "rgba(255,255,255,0.05)",
    trackBarFill: "linear-gradient(90deg, #22d3ee, #60a5fa)",
    chatAliceBg: "rgba(255,255,255,0.03)",
    chatAliceBorder: "1px solid rgba(56,189,248,0.12)",
    chatAliceText: "#dbeafe",
    chatUserBg: "linear-gradient(135deg, #06b6d4, #2563eb)",
    chatUserText: "#ffffff",
  },
};

// =====================================================
// INITIAL APP DATA: THEMES, TRACKS, FOLDERS
// =====================================================
const initialTheme: ThemeName = "luxury_tech";

const initialTracks = [
  {
    id: "t1",
    name: "Immediate Placement Roles",
    description: "Fast-hire roles with proven overlap.",
    priority: 92,
  },
  {
    id: "t2",
    name: "Technical Troubleshooter Roles",
    description: "Equipment, diagnostics, and systems-heavy work.",
    priority: 88,
  },
  {
    id: "t3",
    name: "Process Optimization Pathways",
    description: "Workflow and efficiency roles hiding in plain sight.",
    priority: 78,
  },
  {
    id: "t4",
    name: "Creative Leadership Watchlist",
    description:
      "Well-paid design and creative operations roles worth keeping open.",
    priority: 62,
  },
];

const initialFolders = [
  { id: "f1", name: "Apply Now", count: 3 },
  { id: "f2", name: "Save for Later", count: 6 },
  { id: "f3", name: "Agencies", count: 4 },
  { id: "f4", name: "Stretch Roles", count: 2 },
  { id: "f5", name: "Fast Income", count: 5 },
];

// =====================================================
// HELPER: JOB DOMAIN DETECTION
// Determines the broad real-world domain of a job.
// =====================================================
const detectJobDomain = (job: Job) => {
  const text =
    `${job.title} ${job.company} ${job.summary} ${job.description} ${job.requirements} ${job.tags.join(" ")}`.toLowerCase();

  if (
    text.includes("auto body") ||
    text.includes("collision") ||
    text.includes("automotive") ||
    text.includes("body shop")
  ) {
    return "Automotive";
  }

  if (
    text.includes("nurse") ||
    text.includes("rn") ||
    text.includes("healthcare") ||
    text.includes("medical") ||
    text.includes("patient")
  ) {
    return "Healthcare";
  }

  if (
    text.includes("sales") ||
    text.includes("commission") ||
    text.includes("cold calling") ||
    text.includes("account executive")
  ) {
    return "Sales";
  }

  if (
    text.includes("print") ||
    text.includes("printing") ||
    text.includes("press") ||
    text.includes("indigo") ||
    text.includes("wide format")
  ) {
    return "Print / Production";
  }

  if (
    text.includes("manufacturing") ||
    text.includes("production") ||
    text.includes("warehouse") ||
    text.includes("assembly")
  ) {
    return "Manufacturing";
  }

  if (
    text.includes("graphic design") ||
    text.includes("branding") ||
    text.includes("creative") ||
    text.includes("adobe")
  ) {
    return "Creative / Design";
  }

  if (
    text.includes("equipment") ||
    text.includes("maintenance") ||
    text.includes("technician") ||
    text.includes("troubleshooting") ||
    text.includes("mechanical")
  ) {
    return "Technical / Equipment";
  }

  return "General";
};

// =====================================================
// INITIAL CHAT MESSAGE SEED
// =====================================================
const conversationSeed = [
  {
    speaker: "Alice",
    text: "Live feed loaded. I ranked your strongest opportunities and surfaced the best immediate and strategic fits.",
  },
  {
    speaker: "Alice",
    text: "Use the cards to triage quickly, then drill into the listing on the right when something looks promising.",
  },
];

// =====================================================
// HELPER: SCORE COLOR PALETTE
// =====================================================
function scorePalette(score: number, themeName: ThemeName) {
  if (themeName === "generic_clean") {
    if (score >= 85) {
      return {
        bg: "#ecfdf5",
        border: "#a7f3d0",
        text: "#047857",
        badgeBg: "#dcfce7",
        badgeText: "#166534",
        glow: "none",
      };
    }
    if (score >= 75) {
      return {
        bg: "#eff6ff",
        border: "#bfdbfe",
        text: "#1d4ed8",
        badgeBg: "#dbeafe",
        badgeText: "#1d4ed8",
        glow: "none",
      };
    }
    if (score >= 65) {
      return {
        bg: "#fffbeb",
        border: "#fde68a",
        text: "#b45309",
        badgeBg: "#fef3c7",
        badgeText: "#b45309",
        glow: "none",
      };
    }
    return {
      bg: "#fff1f2",
      border: "#fecdd3",
      text: "#be123c",
      badgeBg: "#ffe4e6",
      badgeText: "#be123c",
      glow: "none",
    };
  }

  if (score >= 85) {
    return {
      bg: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(6,95,70,0.28))",
      border: "rgba(52, 211, 153, 0.35)",
      text: "#a7f3d0",
      badgeBg: "rgba(16,185,129,0.16)",
      badgeText: "#a7f3d0",
      glow: "0 0 30px rgba(16,185,129,0.18)",
    };
  }
  if (score >= 75) {
    return {
      bg: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(30,64,175,0.28))",
      border: "rgba(96, 165, 250, 0.35)",
      text: "#bfdbfe",
      badgeBg: "rgba(59,130,246,0.16)",
      badgeText: "#bfdbfe",
      glow: "0 0 30px rgba(59,130,246,0.18)",
    };
  }
  if (score >= 65) {
    return {
      bg: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(180,83,9,0.28))",
      border: "rgba(251, 191, 36, 0.35)",
      text: "#fde68a",
      badgeBg: "rgba(245,158,11,0.16)",
      badgeText: "#fde68a",
      glow: "0 0 30px rgba(245,158,11,0.16)",
    };
  }
  return {
    bg: "linear-gradient(135deg, rgba(244,63,94,0.18), rgba(157,23,77,0.28))",
    border: "rgba(251, 113, 133, 0.35)",
    text: "#fecdd3",
    badgeBg: "rgba(244,63,94,0.16)",
    badgeText: "#fecdd3",
    glow: "0 0 30px rgba(244,63,94,0.16)",
  };
}

// =====================================================
// HELPER: SHARED PANEL STYLE
// =====================================================
function panelStyle(theme: Theme): React.CSSProperties {
  return {
    background: theme.panelBg,
    border: theme.panelBorder,
    borderRadius: "24px",
    padding: "20px",
    boxShadow: theme.panelShadow,
    backdropFilter: theme.panelBackdrop,
    WebkitBackdropFilter: theme.panelBackdrop,
  };
}

// =====================================================
// COMPONENT: SHARED BUTTON
// =====================================================
function Button({
  children,
  onClick,
  variant = "default",
  size = "default",
  style = {},
  theme,
}: {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm";
  style?: React.CSSProperties;
  theme: Theme;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "16px",
    border: "1px solid",
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.2s ease",
  };

  const sizes = {
    default: { padding: "10px 14px", fontSize: "14px" },
    sm: { padding: "8px 12px", fontSize: "13px" },
  };

  const variants = {
    default: {
      background: theme.primaryButtonBg,
      color: theme.primaryButtonText,
      borderColor: theme.primaryButtonBorder,
      boxShadow: theme.primaryButtonShadow || "none",
    },
    outline: {
      background: theme.outlineButtonBg,
      color: theme.outlineButtonText,
      borderColor: theme.outlineButtonBorder,
    },
    destructive: {
      background: theme.destructiveButtonBg,
      color: theme.destructiveButtonText,
      borderColor: theme.destructiveButtonBorder,
    },
  };

  return (
    <button
      onClick={onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

// =====================================================
// MAIN COMPONENT: APP
// =====================================================
export default function App() {
  // =====================================================
  // STATE: FILTERS, EXCLUSIONS, AND USER PREFERENCES
  // =====================================================
  const [excludedKeywordInput, setExcludedKeywordInput] = useState("");
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>([
    "sales",
    "commission",
    "telemarketing",
  ]);

  const [excludedClusters, setExcludedClusters] = useState<string[]>([]);

  const [excludedIndustries, setExcludedIndustries] = useState<string[]>([
    "insurance",
    "retail",
  ]);
  const [excludedDomains] = useState<string[]>([
    "Automotive",
    "Healthcare",
    "Sales",
  ]);
  // =====================================================
  // STATE: THEME
  // =====================================================
  const [themeMode, setThemeMode] = useState<ThemeName>(initialTheme);
  const theme = themes[themeMode];

  // =====================================================
  // STATE: APP DATA, SELECTED JOB, CHAT, AND LAYOUT
  // =====================================================
  const [tracks] = useState(initialTracks);
  const [folders] = useState(initialFolders);
  const [listings, setListings] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState(conversationSeed);
  const [composer, setComposer] = useState("");
  const [detailMode, setDetailMode] = useState<"listing" | "advisor">(
    "advisor",
  );
  const [resumeWorkspaceOpen, setResumeWorkspaceOpen] = useState(false);
  const [priorities, setPriorities] = useState({
    pay: 82,
    speed: 95,
    stability: 84,
    growth: 68,
    creativity: 56,
    technicalDepth: 78,
  });
  const [minimumScore, setMinimumScore] = useState(0);
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

  // =====================================================
  // EFFECT: TRACK WINDOW WIDTH FOR RESPONSIVE LAYOUT
  // =====================================================
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // =====================================================
  // EFFECT: LOAD JOB DATA FROM public/jobs.json
  // Normalizes backend fields and fills missing job domains.
  // =====================================================
  useEffect(() => {
    fetch("/jobs.json")
      .then((res) => res.json())
      .then((data) => {
        const normalized: Job[] = (Array.isArray(data) ? data : []).map(
          (job: { [key: string]: unknown }, index: number) => ({
            id: String(job.id ?? `job-${index + 1}`),
            title: String(job.title ?? "Untitled role"),
            company: String(job.company ?? "Unknown company"),
            location: String(job.location ?? "Unknown location"),
            salary: String(
              [job.salary_min, job.salary_max].filter(Boolean).join(" - ") ||
                job.salary ||
                "Salary not listed",
            ),
            score: Number(job.score ?? 0),
            track: String(job.track ?? "Matched opportunity"),
            qualificationsScore: Number(
              job.qualificationsScore ?? job.score ?? 0,
            ),
            speedScore: Number(
              job.speedScore ??
                Math.max(35, Math.min(95, Number(job.score ?? 0) + 10)),
            ),
            tags: String(job.matched_terms ?? "")
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean)
              .slice(0, 4),
            summary: String(
              job.summary ?? job.insight ?? "Matched from your live job feed.",
            ),
            insight: String(job.insight ?? "Matched from your live job feed."),
            risks: String(
              job.risks ??
                "Review qualifications and commute details before applying.",
            ),

            description: String(job.description ?? ""),
            requirements: String(job.requirements ?? ""),
            responsibilities: String(job.responsibilities ?? ""),
            domain: String(job.domain ?? ""),
            preferred: String(job.preferred ?? ""),
            tools: String(job.tools ?? ""),
            url: String(job.url ?? ""),

            folder: String(job.folder ?? "New"),
          }),
        );

        const withDomains = normalized.map((job) => ({
          ...job,
          domain: job.domain || detectJobDomain(job),
        }));

        setListings(withDomains);

        if (withDomains.length > 0) {
          setSelectedId(withDomains[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load jobs.json:", err);
      });
  }, []);

  // =====================================================
  // FILTER LOGIC: BUILDS THE VISIBLE JOB LIST
  // Applies minimum score, excluded domains, keywords,
  // excluded industries, and search query.
  // =====================================================
  const filtered = useMemo(() => {
    return listings
      .filter((job) => job.score >= minimumScore)
      .filter((job) => {
        if (excludedDomains.includes(job.domain || "")) return false;

        const jobClusters = (job.tags || [])
          .map((tag) => (tag.includes(":") ? tag.split(":")[0] : ""))
          .filter(Boolean);

        const matchesExcludedCluster = jobClusters.some((cluster) =>
          excludedClusters.includes(cluster),
        );

        if (matchesExcludedCluster) return false;

        const title = String(job.title || "").toLowerCase();
        const company = String(job.company || "").toLowerCase();
        const track = String(job.track || "").toLowerCase();
        const summary = String(job.summary || "").toLowerCase();
        const location = String(job.location || "").toLowerCase();
        const tags = (job.tags || []).join(" ").toLowerCase();

        const fullText = [title, company, track, summary, location, tags].join(
          " ",
        );

        const matchesExcludedKeyword = excludedKeywords.some((keyword) =>
          fullText.includes(keyword.toLowerCase()),
        );

        if (matchesExcludedKeyword) return false;

        const matchesExcludedIndustry = excludedIndustries.some((industry) =>
          fullText.includes(industry.toLowerCase()),
        );

        if (matchesExcludedIndustry) return false;

        if (!query.trim()) return true;

        return fullText.includes(query.toLowerCase());
      })
      .sort((a, b) => b.score - a.score);
  }, [
    listings,
    minimumScore,
    query,
    excludedKeywords,
    excludedIndustries,
    excludedDomains,
    excludedClusters,
  ]);

  // =====================================================
  // DERIVED STATE: CURRENTLY SELECTED JOB
  // =====================================================
  const selected =
    filtered.find((j) => j.id === selectedId) || filtered[0] || null;

  // =====================================================
  // ACTION: MOVE A JOB INTO A FOLDER
  // =====================================================
  const moveListing = (id: string, folderName: string) => {
    setListings((items) =>
      items.map((job) =>
        job.id === id ? { ...job, folder: folderName } : job,
      ),
    );
    setMessages((m) => [
      ...m,
      {
        speaker: "Alice",
        text: `Done. I moved that listing into ${folderName}.`,
      },
    ]);
  };

  // =====================================================
  // ACTION: DISCARD A JOB
  // =====================================================
  const discardListing = (id: string) => {
    const item = listings.find((job) => job.id === id);
    setListings((items) => items.filter((job) => job.id !== id));
    if (item) {
      setMessages((m) => [
        ...m,
        {
          speaker: "Alice",
          text: `Discarded ${item.title}. I’ll use that to tighten future suggestions.`,
        },
      ]);
    }
  };

  // =====================================================
  // ACTIONS: KEYWORD AND INDUSTRY EXCLUSIONS
  // =====================================================
  const addBlockWord = () => {
    const value = excludedKeywordInput.trim().toLowerCase();
    if (!value) return;

    if (!excludedKeywords.includes(value)) {
      setExcludedKeywords((prev) => [...prev, value]);
    }

    setExcludedKeywordInput("");
  };

  const removeBlockWord = (word: string) => {
    setExcludedKeywords((prev) => prev.filter((item) => item !== word));
  };

  const toggleBlockCategory = (category: string) => {
    const normalized = category.toLowerCase();

    setExcludedIndustries((prev) =>
      prev.includes(normalized)
        ? prev.filter((item) => item !== normalized)
        : [...prev, normalized],
    );
  };

  // =====================================================
  // ACTION: SEND A CHAT MESSAGE TO ALICE
  // =====================================================
  const sendMessage = () => {
    if (!composer.trim()) return;

    const nextUser = { speaker: "User", text: composer.trim() };
    const lower = composer.toLowerCase();
    let response = "I noted that and adjusted the queue.";

    if (lower.includes("save")) {
      response =
        "Saved. I can also file it under Apply Now, Save for Later, Agencies, Fast Income, or any custom folder.";
    } else if (lower.includes("skip") || lower.includes("discard")) {
      response = "Skipped. I’ll keep looking for stronger fits.";
    } else if (lower.includes("why") || lower.includes("fit")) {
      response = selected
        ? `${selected.title} scored ${selected.score} because the role language overlaps with your strongest capability clusters and priorities.`
        : "Select a card and I’ll break down the match.";
    } else if (lower.includes("focus")) {
      response =
        "Understood. I’ll shift the shortlist toward the area you mentioned.";
    }

    setMessages((m) => [...m, nextUser, { speaker: "Alice", text: response }]);
    setComposer("");
  };

  // =====================================================
  // LAYOUT: RESPONSIVE GRID SETTINGS
  // =====================================================
  const isDesktop = windowWidth >= 1280;
  const isTablet = windowWidth >= 900 && windowWidth < 1280;

  const gridTemplateColumns = isDesktop
    ? "300px minmax(0, 1fr) 360px"
    : isTablet
      ? "1fr"
      : "1fr";

  // =====================================================
  // ADVISOR HELPERS: JOB INTERPRETATION TEXT
  // =====================================================
  const buildWorthItText = (job: Job) => {
    const score = job.score || 0;

    if (score >= 85) {
      return "This looks like a strong use of your time. The language in the role overlaps heavily with your strongest experience areas, so it is likely worth serious consideration.";
    }

    if (score >= 75) {
      return "This looks promising. It has meaningful overlap with your background and may be worth pursuing if the pay, commute, and company feel right.";
    }

    if (score >= 65) {
      return "This is worth reviewing, but probably not a top-priority move unless something else about the role stands out strongly.";
    }

    return "This appears to be a stretch match. It may still be useful for exploration, but it is probably not the best use of your immediate application time.";
  };

  const buildGapText = (job: Job) => {
    const tags = (job.tags || []).join(", ");

    if (!tags) {
      return "No obvious matched-skill detail is available yet, so review the original listing carefully for missing requirements.";
    }

    if (job.score >= 80) {
      return "No major gap is obvious from the current match data, but you should still verify years of experience, degree requirements, and tool-specific expectations.";
    }

    if (job.score >= 65) {
      return "This may have partial alignment. Check for seniority level, tool-specific requirements, management expectations, and industry-specific experience.";
    }

    return "There are likely multiple gaps here. Review hard requirements closely before spending too much time on it.";
  };

  const buildPositioningText = (job: Job) => {
    const full =
      `${job.title} ${job.track} ${job.summary} ${job.tags.join(" ")}`.toLowerCase();

    if (
      full.includes("design") ||
      full.includes("branding") ||
      full.includes("creative")
    ) {
      return "Position yourself around creative leadership, design execution, multimedia versatility, branding, and your ability to move ideas from concept into production.";
    }

    if (
      full.includes("technician") ||
      full.includes("maintenance") ||
      full.includes("mechanical") ||
      full.includes("troubleshooting")
    ) {
      return "Position yourself around troubleshooting, diagnostics, mechanical reasoning, systems thinking, and your ability to learn unfamiliar equipment fast.";
    }

    if (
      full.includes("operations") ||
      full.includes("workflow") ||
      full.includes("process") ||
      full.includes("production")
    ) {
      return "Position yourself around workflow optimization, process improvement, production coordination, reliability, and solving operational bottlenecks.";
    }

    return "Lead with your strongest transferable strengths: systems thinking, problem solving, production experience, adaptability, and cross-functional capability.";
  };

  const buildClusterBreakdown = (job: Job) => {
    const text =
      `${job.title} ${job.track} ${job.summary} ${job.tags.join(" ")}`.toLowerCase();

    return [
      {
        label: "Creative",
        active:
          text.includes("design") ||
          text.includes("branding") ||
          text.includes("creative") ||
          text.includes("multimedia"),
      },
      {
        label: "Operations",
        active:
          text.includes("operations") ||
          text.includes("workflow") ||
          text.includes("production") ||
          text.includes("process"),
      },
      {
        label: "Technical",
        active:
          text.includes("equipment") ||
          text.includes("troubleshooting") ||
          text.includes("maintenance") ||
          text.includes("systems"),
      },
      {
        label: "Mechanical",
        active:
          text.includes("mechanical") ||
          text.includes("inspection") ||
          text.includes("repair") ||
          text.includes("technician"),
      },
    ];
  };

  // =====================================================
  // UI LABELS: THEME BUTTON NAMES
  // =====================================================
  const themeLabels: Record<ThemeName, string> = {
    generic_clean: "Generic Clean",
    luxury_tech: "Luxury Tech",
    minimal_cinematic: "Minimal Cinematic",
    futuristic_concierge: "Futuristic Concierge",
  };

  // =====================================================
  // UI ROOT: MAIN THREE-COLUMN APP LAYOUT
  // =====================================================
  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.appBg,
        color: theme.text,
        padding: "18px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1440px",
          margin: "0 auto",
          display: "grid",
          gap: "16px",
          gridTemplateColumns,
          alignItems: "start",
        }}
      >
        {/* =====================================================
            UI COLUMN 1: LEFT SIDEBAR
            Alice summary, opportunity map, saved folders
        ===================================================== */}
        {/* =====================================================
            UI COLUMN 3: RIGHT SIDEBAR
            Selected listing and settings
        ===================================================== */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* =====================================================
              UI PANEL: SELECTED LISTING DETAIL PANEL
              Listing View / Advisor View live here
          ===================================================== */}
          {/* =====================================================
              UI PANEL: ALICE SUMMARY / APP HEADER
          ===================================================== */}
          <div style={panelStyle(theme)}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  letterSpacing: "-0.02em",
                  color: theme.heading,
                }}
              >
                <Sparkles
                  size={20}
                  color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"}
                />
                Alice
              </div>
              <span
                style={{
                  background: theme.pillBg,
                  border: theme.pillBorder,
                  borderRadius: "999px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: theme.pillText,
                }}
              >
                {themeLabels[themeMode]}
              </span>
            </div>

            <p
              style={{
                fontSize: "14px",
                color: theme.subtext,
                marginTop: "8px",
                lineHeight: 1.5,
              }}
            >
              Conversational career concierge with swipeable opportunity cards
              and a premium review flow.
            </p>

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
                flexWrap: "wrap",
              }}
            >
              <Button theme={theme} style={{ flex: 1, minWidth: "120px" }}>
                <Mic size={16} />
                Listen
              </Button>
              <Button
                theme={theme}
                variant="outline"
                style={{ flex: 1, minWidth: "120px" }}
              >
                <Bell size={16} />
                Digest
              </Button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              <div
                style={{
                  background: theme.mutedBoxBg,
                  border: theme.mutedBoxBorder,
                  borderRadius: "16px",
                  padding: "12px",
                }}
              >
                <div style={{ fontSize: "12px", color: theme.subtext }}>
                  Visible matches
                </div>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: theme.heading,
                  }}
                >
                  {filtered.length}
                </div>
              </div>
              <div
                style={{
                  background: theme.mutedBoxBg,
                  border: theme.mutedBoxBorder,
                  borderRadius: "16px",
                  padding: "12px",
                }}
              >
                <div style={{ fontSize: "12px", color: theme.subtext }}>
                  Loaded jobs
                </div>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: theme.heading,
                  }}
                >
                  {listings.length}
                </div>
              </div>
            </div>
          </div>

          <div style={panelStyle(theme)}>
            <div
              style={{
                fontWeight: 700,
                display: "flex",
                gap: "8px",
                alignItems: "center",
                color: theme.heading,
              }}
            >
              <Brain
                size={16}
                color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"}
              />
              Opportunity Map
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginTop: "16px",
              }}
            >
              {tracks.map((track) => (
                <div
                  key={track.id}
                  style={{
                    background: theme.mutedBoxBg,
                    border: theme.mutedBoxBorder,
                    borderRadius: "18px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        {track.name}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: theme.subtext,
                          marginTop: "4px",
                        }}
                      >
                        {track.description}
                      </div>
                    </div>
                    <span
                      style={{
                        background: theme.pillBg,
                        borderRadius: "999px",
                        padding: "4px 8px",
                        fontSize: "12px",
                        color: theme.pillText,
                      }}
                    >
                      {track.priority}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: "12px",
                      height: "8px",
                      background: theme.trackBarBg,
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${track.priority}%`,
                        background: theme.trackBarFill,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={panelStyle(theme)}>
            <div
              style={{
                fontWeight: 700,
                display: "flex",
                gap: "8px",
                alignItems: "center",
                color: theme.heading,
              }}
            >
              <FolderOpen
                size={16}
                color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"}
              />
              Saved Structure
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    border: theme.mutedBoxBorder,
                    background: theme.mutedBoxBg,
                    borderRadius: "16px",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: "14px", color: theme.text }}>
                    {folder.name}
                  </div>
                  <span
                    style={{
                      background: theme.pillBg,
                      borderRadius: "999px",
                      padding: "2px 8px",
                      fontSize: "12px",
                      color: theme.pillText,
                    }}
                  >
                    {folder.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =====================================================
            UI COLUMN 2: CENTER CONTENT
            Opportunity feed and chat queue
        ===================================================== */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            minWidth: 0,
          }}
        >
          {/* =====================================================
              UI PANEL: OPPORTUNITY FEED
              Search, score slider, excluded keyword bar, JobFeed
          ===================================================== */}
          <div style={panelStyle(theme)}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "18px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  color: theme.heading,
                }}
              >
                <Search
                  size={16}
                  color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"}
                />
                Opportunity Feed
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  width: isDesktop ? "auto" : "100%",
                }}
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search roles, companies, themes"
                  style={{
                    border: theme.inputBorder,
                    background: theme.inputBg,
                    color: theme.inputText,
                    borderRadius: "16px",
                    padding: "10px 14px",
                    flex: 1,
                    minWidth: isDesktop ? "260px" : "180px",
                    outline: "none",
                  }}
                />
                <Button theme={theme} variant="outline">
                  <Filter size={16} />
                  Filter
                </Button>
              </div>
            </div>

            <div
              style={{
                border: theme.mutedBoxBorder,
                background: theme.mutedBoxBg,
                borderRadius: "18px",
                padding: "16px",
                marginTop: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      color: theme.heading,
                    }}
                  >
                    Minimum match score
                  </div>
                  <div style={{ fontSize: "12px", color: theme.subtext }}>
                    Raise or lower shortlist quality live.
                  </div>
                </div>
                <span
                  style={{
                    background: theme.pillBg,
                    borderRadius: "999px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    height: "fit-content",
                    color: theme.pillText,
                  }}
                >
                  {minimumScore}+
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={minimumScore}
                onChange={(e) => setMinimumScore(Number(e.target.value))}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  accentColor: theme.sliderAccent,
                }}
              />
            </div>

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
              {/* EXCLUDED KEYWORDS BAR */}
              {excludedKeywords.length > 0 && (
                <div style={{ marginTop: "16px", marginBottom: "12px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: theme.subtext,
                      marginBottom: "6px",
                    }}
                  >
                    Excluded Keywords:
                  </div>

                  <div
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
                    {excludedKeywords.map((kw) => (
                      <span
                        key={kw}
                        onClick={() =>
                          setExcludedKeywords((prev) =>
                            prev.filter((k) => k !== kw),
                          )
                        }
                        style={{
                          padding: "6px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          cursor: "pointer",
                          background: theme.pillBg,
                          color: theme.pillText,
                          border: theme.pillBorder,
                        }}
                        title="Click to remove"
                      >
                        {kw} ✕
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* EXCLUDED CLUSTERS BAR */}
              {excludedClusters.length > 0 && (
                <div style={{ marginTop: "16px", marginBottom: "12px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: theme.subtext,
                      marginBottom: "6px",
                    }}
                  >
                    Excluded Clusters:
                  </div>

                  <div
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
                    {excludedClusters.map((cluster) => (
                      <span
                        key={cluster}
                        onClick={() =>
                          setExcludedClusters((prev) =>
                            prev.filter((item) => item !== cluster),
                          )
                        }
                        style={{
                          padding: "6px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          cursor: "pointer",
                          background: theme.pillBg,
                          color: theme.pillText,
                          border: theme.pillBorder,
                        }}
                        title="Click to remove"
                      >
                        {cluster.replaceAll("_", " ")} ✕
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {filtered.length === 0 ? (
                <div
                  style={{
                    border: theme.mutedBoxBorder,
                    borderRadius: "18px",
                    padding: "24px",
                    background: theme.mutedBoxBg,
                    color: theme.subtext,
                    minWidth: "100%",
                  }}
                >
                  No live jobs loaded yet. Make sure `public/jobs.json` exists
                  and refresh the page.
                </div>
              ) : (
                <JobFeed
                  jobs={filtered}
                  selectedId={selectedId}
                  setSelectedId={setSelectedId}
                  theme={theme}
                  themeMode={themeMode}
                  moveListing={moveListing}
                  discardListing={discardListing}
                />
              )}
            </div>
          </div>

          {/* =====================================================
              UI PANEL: CONVERSATIONAL QUEUE
          ===================================================== */}
          <div style={panelStyle(theme)}>
            <div
              style={{
                fontWeight: 700,
                display: "flex",
                gap: "8px",
                alignItems: "center",
                color: theme.heading,
              }}
            >
              <MessageSquare
                size={16}
                color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"}
              />
              Conversational Queue
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "320px",
                overflow: "auto",
                marginTop: "16px",
              }}
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent:
                      msg.speaker === "Alice" ? "flex-start" : "flex-end",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "88%",
                      borderRadius: "20px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      background:
                        msg.speaker === "Alice"
                          ? theme.chatAliceBg
                          : theme.chatUserBg,
                      color:
                        msg.speaker === "Alice"
                          ? theme.chatAliceText
                          : theme.chatUserText,
                      border:
                        msg.speaker === "Alice"
                          ? theme.chatAliceBorder
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        textTransform: "uppercase",
                        opacity: 0.7,
                        marginBottom: "4px",
                      }}
                    >
                      {msg.speaker}
                    </div>
                    <div>{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <textarea
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Ask Alice: save that one, compare these, why does this fit me, focus on agencies..."
                style={{
                  flex: 1,
                  border: theme.inputBorder,
                  background: theme.inputBg,
                  color: theme.inputText,
                  borderRadius: "16px",
                  minHeight: "64px",
                  padding: "12px",
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <Button theme={theme} onClick={sendMessage}>
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={panelStyle(theme)}>
            <div
              style={{
                fontWeight: 700,
                fontSize: "18px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                color: theme.heading,
              }}
            >
              <Briefcase
                size={18}
                color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"}
              />
              Selected Listing
            </div>

            {selected ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  marginTop: "16px",
                }}
              >
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Button
                    theme={theme}
                    variant={detailMode === "listing" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDetailMode("listing")}
                  >
                    Listing View
                  </Button>

                  <Button
                    theme={theme}
                    variant={detailMode === "advisor" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDetailMode("advisor")}
                  >
                    Advisor View
                  </Button>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "22px",
                        fontWeight: 700,
                        lineHeight: 1.2,
                        color: theme.heading,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {selected.title}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: theme.text,
                        marginTop: "4px",
                      }}
                    >
                      {selected.company} • {selected.location}
                    </div>
                    <div style={{ fontSize: "14px", color: theme.subtext }}>
                      {selected.salary}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: theme.subtext,
                        marginTop: "4px",
                      }}
                    >
                      Domain: {selected.domain}
                    </div>
                  </div>

                  {(() => {
                    const palette = scorePalette(selected.score, themeMode);
                    return (
                      <div
                        style={{
                          width: "84px",
                          height: "84px",
                          borderRadius: "20px",
                          border: `1px solid ${palette.border}`,
                          background: palette.bg,
                          color: palette.text,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "32px",
                          fontWeight: 700,
                          boxShadow: palette.glow,
                        }}
                      >
                        {selected.score}
                      </div>
                    );
                  })()}
                </div>

                {detailMode === "listing" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        Description
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: theme.text,
                          marginTop: "8px",
                          lineHeight: 1.55,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {selected.description || "No description available."}
                      </div>
                    </div>

                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        Requirements
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: theme.text,
                          marginTop: "8px",
                          lineHeight: 1.55,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {selected.requirements || "No requirements listed."}
                      </div>
                    </div>

                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        Responsibilities
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: theme.text,
                          marginTop: "8px",
                          lineHeight: 1.55,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {selected.responsibilities ||
                          "No responsibilities listed."}
                      </div>
                    </div>

                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        Preferred
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: theme.text,
                          marginTop: "8px",
                          lineHeight: 1.55,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {selected.preferred ||
                          "No preferred qualifications listed."}
                      </div>
                    </div>

                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        Tools / Technologies
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: theme.text,
                          marginTop: "8px",
                          lineHeight: 1.55,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {selected.tools || "Not specified."}
                      </div>
                    </div>

                    {selected.url && (
                      <a
                        href={selected.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: theme.heading,
                          fontWeight: 600,
                          textDecoration: "underline",
                        }}
                      >
                        View Original Job Posting →
                      </a>
                    )}
                  </div>
                )}

                {detailMode === "advisor" && (
                  <>
                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        Why it fits
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: theme.text,
                          marginTop: "8px",
                          lineHeight: 1.55,
                        }}
                      >
                        {selected.insight}
                      </div>
                    </div>

                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        Matched skills
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: theme.text,
                          marginTop: "8px",
                          lineHeight: 1.55,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                            marginTop: "8px",
                          }}
                        >
                          {selected.tags.map((tag) => {
                            const isSplit = tag.includes(":");
                            const cluster = isSplit ? tag.split(":")[0] : "";
                            const term = isSplit ? tag.split(":")[1] : tag;

                            return (
                              <div
                                key={tag}
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  onClick={() =>
                                    setExcludedKeywords((prev) =>
                                      prev.includes(term.toLowerCase())
                                        ? prev
                                        : [...prev, term.toLowerCase()],
                                    )
                                  }
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: "999px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    background: theme.pillBg,
                                    color: theme.pillText,
                                    border: theme.pillBorder,
                                    opacity: excludedKeywords.includes(
                                      term.toLowerCase(),
                                    )
                                      ? 0.5
                                      : 1,
                                  }}
                                  title="Click to exclude this skill"
                                >
                                  {term}
                                </span>

                                {cluster && (
                                  <span
                                    onClick={() =>
                                      setExcludedClusters((prev) =>
                                        prev.includes(cluster)
                                          ? prev
                                          : [...prev, cluster],
                                      )
                                    }
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: "999px",
                                      fontSize: "11px",
                                      cursor: "pointer",
                                      opacity: excludedClusters.includes(cluster)
                                        ? 0.4
                                        : 0.7,
                                      background: theme.pillBg,
                                      color: theme.subtext,
                                      border: theme.pillBorder,
                                    }}
                                    title="Click to exclude this entire category"
                                  >
                                    {cluster.replaceAll("_", " ")}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          border: theme.mutedBoxBorder,
                          borderRadius: "16px",
                          padding: "16px",
                          background: theme.mutedBoxBg,
                        }}
                      >
                        <div style={{ fontSize: "12px", color: theme.subtext }}>
                          Qualifications match
                        </div>
                        <div
                          style={{
                            fontSize: "28px",
                            fontWeight: 700,
                            marginTop: "4px",
                            color: theme.heading,
                          }}
                        >
                          {selected.qualificationsScore}
                        </div>
                      </div>
                      <div
                        style={{
                          border: theme.mutedBoxBorder,
                          borderRadius: "16px",
                          padding: "16px",
                          background: theme.mutedBoxBg,
                        }}
                      >
                        <div style={{ fontSize: "12px", color: theme.subtext }}>
                          Fast-hire potential
                        </div>
                        <div
                          style={{
                            fontSize: "28px",
                            fontWeight: 700,
                            marginTop: "4px",
                            color: theme.heading,
                          }}
                        >
                          {selected.speedScore}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        Why this is worth your time
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: theme.text,
                          marginTop: "8px",
                          lineHeight: 1.55,
                        }}
                      >
                        {buildWorthItText(selected)}
                      </div>
                    </div>

                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        Possible gaps or watch-outs
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: theme.text,
                          marginTop: "8px",
                          lineHeight: 1.55,
                        }}
                      >
                        {buildGapText(selected)}
                      </div>
                    </div>

                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        How to position yourself
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: theme.text,
                          marginTop: "8px",
                          lineHeight: 1.55,
                        }}
                      >
                        {buildPositioningText(selected)}
                      </div>
                    </div>

                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                          marginBottom: "10px",
                        }}
                      >
                        Match cluster view
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {buildClusterBreakdown(selected).map((cluster) => (
                          <span
                            key={cluster.label}
                            style={{
                              borderRadius: "999px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background: cluster.active
                                ? theme.heading
                                : theme.pillBg,
                              color: cluster.active
                                ? "#ffffff"
                                : theme.pillText,
                              border: theme.pillBorder,
                            }}
                          >
                            {cluster.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        border: theme.mutedBoxBorder,
                        borderRadius: "18px",
                        padding: "16px",
                        background: theme.mutedBoxBg,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: theme.heading,
                        }}
                      >
                        Risk factors
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: theme.text,
                          marginTop: "8px",
                          lineHeight: 1.55,
                        }}
                      >
                        {selected.risks}
                      </div>
                    </div>
                  </>
                )}

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Button
                    theme={theme}
                    onClick={() => setResumeWorkspaceOpen(true)}
                  >
                    <Sparkles size={16} />
                    Generate Tailored Resume
                  </Button>

                  <Button
                    theme={theme}
                    onClick={() => moveListing(selected.id, "Apply Now")}
                  >
                    <Bookmark size={16} />
                    Apply Now
                  </Button>
                  <Button
                    theme={theme}
                    variant="outline"
                    onClick={() => moveListing(selected.id, "Save for Later")}
                  >
                    <FolderOpen size={16} />
                    Save
                  </Button>
                  <Button
                    theme={theme}
                    variant="outline"
                    onClick={() => {
                      const keyword = prompt("Enter keyword to exclude:");
                      if (!keyword) return;

                      setExcludedKeywords((prev) => [
                        ...prev,
                        keyword.toLowerCase(),
                      ]);
                    }}
                  >
                    Exclude Keyword
                  </Button>

                  <Button
                    theme={theme}
                    variant="outline"
                    onClick={() =>
                      setMessages((m) => [
                        ...m,
                        {
                          speaker: "Alice",
                          text: `My read: ${selected.insight} Main risk: ${selected.risks}`,
                        },
                      ])
                    }
                  >
                    <Star size={16} />
                    Ask Alice
                  </Button>
                  <Button
                    theme={theme}
                    variant="destructive"
                    onClick={() => discardListing(selected.id)}
                  >
                    <X size={16} />
                    Discard
                  </Button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: "14px",
                  color: theme.subtext,
                  marginTop: "16px",
                }}
              >
                No listing selected.
              </div>
            )}
          </div>

          {/* =====================================================
              UI PANEL: SELECTABLE SETTINGS
              Theme buttons, ExclusionControls, priority sliders
          ===================================================== */}
          <div style={panelStyle(theme)}>
            <div
              style={{
                fontWeight: 700,
                display: "flex",
                gap: "8px",
                alignItems: "center",
                color: theme.heading,
              }}
            >
              <SlidersHorizontal
                size={16}
                color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"}
              />
              Selectable Settings
            </div>

            <div style={{ marginTop: "18px" }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  color: theme.heading,
                  marginBottom: "8px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <Palette size={14} />
                Theme
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(Object.keys(themeLabels) as ThemeName[]).map((key) => (
                  <Button
                    key={key}
                    theme={theme}
                    variant={themeMode === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setThemeMode(key)}
                  >
                    {themeLabels[key]}
                  </Button>
                ))}
              </div>

              <ExclusionControls
                theme={theme}
                excludedKeywordInput={excludedKeywordInput}
                setExcludedKeywordInput={setExcludedKeywordInput}
                excludedKeywords={excludedKeywords}
                addExcludedKeyword={addBlockWord}
                removeExcludedKeyword={removeBlockWord}
                excludedIndustries={excludedIndustries}
                toggleExcludedIndustry={toggleBlockCategory}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginTop: "20px",
              }}
            >
              {Object.entries(priorities).map(([key, value]) => (
                <div key={key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      marginBottom: "6px",
                      textTransform: "capitalize",
                      color: theme.text,
                    }}
                  >
                    <span>{key.replace(/([A-Z])/g, " $1")}</span>
                    <span>{value}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={value}
                    onChange={(e) =>
                      setPriorities((p) => ({
                        ...p,
                        [key]: Number(e.target.value),
                      }))
                    }
                    style={{ width: "100%", accentColor: theme.sliderAccent }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {resumeWorkspaceOpen && selected && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.82)",
            zIndex: 9999,
            overflow: "auto",
            padding: isDesktop ? "40px" : "18px",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              maxWidth: "1080px",
              margin: "0 auto",
              background: theme.panelBg,
              border: theme.panelBorder,
              borderRadius: "24px",
              padding: isDesktop ? "28px" : "18px",
              boxShadow: theme.panelShadow,
              color: theme.text,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: theme.heading,
                  }}
                >
                  Tailored Resume Workspace
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: theme.subtext,
                    marginTop: "4px",
                  }}
                >
                  {selected.title} • {selected.company}
                </div>
              </div>

              <Button
                theme={theme}
                variant="outline"
                onClick={() => setResumeWorkspaceOpen(false)}
              >
                <X size={16} />
                Close
              </Button>
            </div>

            <ResumeWorkspace selectedJob={selected as JobData} />
          </div>
        </div>
      )}
    </div>
  );
}
