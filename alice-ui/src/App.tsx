import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
  X,
  MessageSquare,
  Sparkles,
  Filter,
  Bell,
  Palette,
} from "lucide-react";

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
    appBg:
      "linear-gradient(180deg, #0b1020 0%, #101827 40%, #0f172a 100%)",
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
    cardBg:
      "linear-gradient(180deg, rgba(8,15,35,0.92), rgba(10,18,42,0.98))",
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

function fitBand(score: number) {
  if (score >= 85) return "Top Tier";
  if (score >= 75) return "Strong";
  if (score >= 65) return "Worth Reviewing";
  return "Stretch";
}

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

function cardStyle(theme: Theme, selected = false): React.CSSProperties {
  return {
    background: selected ? theme.cardBgSelected : theme.cardBg,
    border: selected ? theme.cardBorderSelected : theme.cardBorder,
    borderRadius: "24px",
    boxShadow: selected
      ? "0 16px 44px rgba(2,6,23,0.28)"
      : "0 12px 30px rgba(2,6,23,0.16)",
  };
}

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
    <button onClick={onClick} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeName>(initialTheme);
  const theme = themes[themeMode];

  const [tracks] = useState(initialTracks);
  const [folders] = useState(initialFolders);
  const [listings, setListings] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState(conversationSeed);
  const [composer, setComposer] = useState("");
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

  /* exclusion controls */
  const [excludedKeywordInput, setExcludedKeywordInput] = useState("");
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>([
    "sales",
    "commission",
    "telemarketing",
  ]);
  const [excludedIndustries, setExcludedIndustries] = useState<string[]>([
    "insurance",
    "retail",
  ]);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    fetch("/jobs.json")
      .then((res) => res.json())
      .then((data) => {
        const normalized: Job[] = (Array.isArray(data) ? data : []).map(
          (job: any, index: number) => ({
            id: job.id || `job-${index + 1}`,
            title: job.title || "Untitled role",
            company: job.company || "Unknown company",
            location: job.location || "Unknown location",
            salary:
              [job.salary_min, job.salary_max].filter(Boolean).join(" - ") ||
              job.salary ||
              "Salary not listed",
            score: Number(job.score || 0),
            track: job.track || "Matched opportunity",
            qualificationsScore: Number(job.qualificationsScore || job.score || 0),
            speedScore: Number(
              job.speedScore ||
                Math.max(35, Math.min(95, Number(job.score || 0) + 10))
            ),
            tags: String(job.matched_terms || "")
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean)
              .slice(0, 4),
            summary: job.summary || job.insight || "Matched from your live job feed.",
            insight: job.insight || "Matched from your live job feed.",
            risks:
              job.risks ||
              "Review qualifications and commute details before applying.",
            folder: job.folder || "New",
          })
        );

        setListings(normalized);

        if (normalized.length > 0) {
          setSelectedId(normalized[0].id);
          const scores = normalized
            .map((j) => Number(j.score))
            .filter((n) => !Number.isNaN(n));
          const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
          setMinimumScore(Math.max(0, Math.floor(maxScore * 0.5)));
        } else {
          setMinimumScore(0);
        }
      })
      .catch(() => {
        setListings([]);
        setMinimumScore(0);
      });
  }, []);

  const filtered = useMemo(() => {
    return listings
      .filter((job) => job.score >= minimumScore)
      .filter((job) => {
        if (!query.trim()) return true;
        const haystack = [
          job.title,
          job.company,
          job.track,
          job.summary,
          ...job.tags,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
      .sort((a, b) => b.score - a.score);
  }, [listings, minimumScore, query]);

  const selected = filtered.find((j) => j.id === selectedId) || filtered[0] || null;

  const moveListing = (id: string, folderName: string) => {
    setListings((items) =>
      items.map((job) => (job.id === id ? { ...job, folder: folderName } : job))
    );
    setMessages((m) => [
      ...m,
      { speaker: "Alice", text: `Done. I moved that listing into ${folderName}.` },
    ]);
  };

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
      response = "Understood. I’ll shift the shortlist toward the area you mentioned.";
    }

    setMessages((m) => [...m, nextUser, { speaker: "Alice", text: response }]);
    setComposer("");
  };

  const isDesktop = windowWidth >= 1280;
  const isTablet = windowWidth >= 900 && windowWidth < 1280;

  const gridTemplateColumns = isDesktop
    ? "300px minmax(0, 1fr) 360px"
    : isTablet
    ? "1fr"
    : "1fr";

  const themeLabels: Record<ThemeName, string> = {
    generic_clean: "Generic Clean",
    luxury_tech: "Luxury Tech",
    minimal_cinematic: "Minimal Cinematic",
    futuristic_concierge: "Futuristic Concierge",
  };

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
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={panelStyle(theme)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <div style={{ fontSize: "24px", fontWeight: 700, display: "flex", gap: "8px", alignItems: "center", letterSpacing: "-0.02em", color: theme.heading }}>
                <Sparkles size={20} color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"} />
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

            <p style={{ fontSize: "14px", color: theme.subtext, marginTop: "8px", lineHeight: 1.5 }}>
              Conversational career concierge with swipeable opportunity cards and a premium review flow.
            </p>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
              <Button theme={theme} style={{ flex: 1, minWidth: "120px" }}>
                <Mic size={16} />
                Listen
              </Button>
              <Button theme={theme} variant="outline" style={{ flex: 1, minWidth: "120px" }}>
                <Bell size={16} />
                Digest
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "16px" }}>
              <div
                style={{
                  background: theme.mutedBoxBg,
                  border: theme.mutedBoxBorder,
                  borderRadius: "16px",
                  padding: "12px",
                }}
              >
                <div style={{ fontSize: "12px", color: theme.subtext }}>Visible matches</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: theme.heading }}>{filtered.length}</div>
              </div>
              <div
                style={{
                  background: theme.mutedBoxBg,
                  border: theme.mutedBoxBorder,
                  borderRadius: "16px",
                  padding: "12px",
                }}
              >
                <div style={{ fontSize: "12px", color: theme.subtext }}>Loaded jobs</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: theme.heading }}>{listings.length}</div>
              </div>
            </div>
          </div>

          <div style={panelStyle(theme)}>
            <div style={{ fontWeight: 700, display: "flex", gap: "8px", alignItems: "center", color: theme.heading }}>
              <Brain size={16} color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"} />
              Opportunity Map
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
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
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: theme.heading }}>{track.name}</div>
                      <div style={{ fontSize: "12px", color: theme.subtext, marginTop: "4px" }}>{track.description}</div>
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
            <div style={{ fontWeight: 700, display: "flex", gap: "8px", alignItems: "center", color: theme.heading }}>
              <FolderOpen size={16} color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"} />
              Saved Structure
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
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
                  <div style={{ fontSize: "14px", color: theme.text }}>{folder.name}</div>
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

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
          <div style={panelStyle(theme)}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontWeight: 700, fontSize: "18px", display: "flex", gap: "8px", alignItems: "center", color: theme.heading }}>
                <Search size={16} color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"} />
                Opportunity Feed
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", width: isDesktop ? "auto" : "100%" }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: theme.heading }}>Minimum match score</div>
                  <div style={{ fontSize: "12px", color: theme.subtext }}>Raise or lower shortlist quality live.</div>
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
                style={{ width: "100%", marginTop: "12px", accentColor: theme.sliderAccent }}
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
                  No live jobs loaded yet. Make sure `public/jobs.json` exists and refresh the page.
                </div>
              ) : (
                filtered.map((job) => {
                  const palette = scorePalette(job.score, themeMode);
                  const selectedCard = selectedId === job.id;

                  return (
                    <motion.div
                      key={job.id}
                      whileHover={{ y: -4, scale: 1.01 }}
                      style={{ minWidth: "320px", maxWidth: "320px", scrollSnapAlign: "start" }}
                    >
                      <div
                        onClick={() => setSelectedId(job.id)}
                        style={{
                          ...cardStyle(theme, selectedCard),
                          padding: "16px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          height: "100%",
                        }}
                      >
                        <div style={{ display: "flex", gap: "12px" }}>
                          <div
                            style={{
                              minWidth: "68px",
                              height: "68px",
                              borderRadius: "18px",
                              border: `1px solid ${palette.border}`,
                              background: palette.bg,
                              color: palette.text,
                              boxShadow: palette.glow,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "26px",
                              fontWeight: 700,
                            }}
                          >
                            {job.score}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "16px", lineHeight: 1.2, color: theme.heading }}>{job.title}</div>
                            <div style={{ fontSize: "14px", color: theme.text, marginTop: "4px" }}>{job.company}</div>
                            <div style={{ fontSize: "14px", color: theme.subtext }}>{job.location}</div>

                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                              <span
                                style={{
                                  border: theme.pillBorder,
                                  background: theme.pillBg,
                                  borderRadius: "999px",
                                  padding: "4px 10px",
                                  fontSize: "12px",
                                  color: theme.pillText,
                                }}
                              >
                                {job.track}
                              </span>
                              <span
                                style={{
                                  background: palette.badgeBg,
                                  color: palette.badgeText,
                                  borderRadius: "999px",
                                  padding: "4px 10px",
                                  fontSize: "12px",
                                  border: `1px solid ${palette.border}`,
                                }}
                              >
                                {fitBand(job.score)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: "14px", color: theme.text, flex: 1, lineHeight: 1.5 }}>{job.summary}</div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                          <div
                            style={{
                              border: theme.mutedBoxBorder,
                              borderRadius: "12px",
                              background: theme.mutedBoxBg,
                              padding: "8px",
                            }}
                          >
                            <div style={{ color: theme.subtext }}>Qualifications</div>
                            <div style={{ fontWeight: 700, fontSize: "14px", marginTop: "4px", color: theme.heading }}>{job.qualificationsScore}</div>
                          </div>
                          <div
                            style={{
                              border: theme.mutedBoxBorder,
                              borderRadius: "12px",
                              background: theme.mutedBoxBg,
                              padding: "8px",
                            }}
                          >
                            <div style={{ color: theme.subtext }}>Fast-hire</div>
                            <div style={{ fontWeight: 700, fontSize: "14px", marginTop: "4px", color: theme.heading }}>{job.speedScore}</div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {job.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                background: theme.pillBg,
                                border: theme.pillBorder,
                                borderRadius: "999px",
                                padding: "4px 10px",
                                fontSize: "12px",
                                color: theme.pillText,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: theme.subtext }}>
                          <span>{job.salary}</span>
                          <span>{job.folder}</span>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <Button
                            theme={theme}
                            size="sm"
                            style={{ flex: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveListing(job.id, "Apply Now");
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            theme={theme}
                            size="sm"
                            variant="outline"
                            style={{ flex: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(job.id);
                            }}
                          >
                            Expand
                          </Button>
                          <Button
                            theme={theme}
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              discardListing(job.id);
                            }}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          <div style={panelStyle(theme)}>
            <div style={{ fontWeight: 700, display: "flex", gap: "8px", alignItems: "center", color: theme.heading }}>
              <MessageSquare size={16} color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"} />
              Conversational Queue
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "320px", overflow: "auto", marginTop: "16px" }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: msg.speaker === "Alice" ? "flex-start" : "flex-end" }}>
                  <div
                    style={{
                      maxWidth: "88%",
                      borderRadius: "20px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      background: msg.speaker === "Alice" ? theme.chatAliceBg : theme.chatUserBg,
                      color: msg.speaker === "Alice" ? theme.chatAliceText : theme.chatUserText,
                      border: msg.speaker === "Alice" ? theme.chatAliceBorder : "none",
                    }}
                  >
                    <div style={{ fontSize: "11px", textTransform: "uppercase", opacity: 0.7, marginBottom: "4px" }}>
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
            <div style={{ fontWeight: 700, fontSize: "18px", display: "flex", gap: "8px", alignItems: "center", color: theme.heading }}>
              <Briefcase size={18} color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"} />
              Selected Listing
            </div>

            {selected ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1.2, color: theme.heading, letterSpacing: "-0.02em" }}>
                      {selected.title}
                    </div>
                    <div style={{ fontSize: "14px", color: theme.text, marginTop: "4px" }}>
                      {selected.company} • {selected.location}
                    </div>
                    <div style={{ fontSize: "14px", color: theme.subtext }}>{selected.salary}</div>
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

                <div style={{ border: theme.mutedBoxBorder, borderRadius: "18px", padding: "16px", background: theme.mutedBoxBg }}>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: theme.heading }}>Why it fits</div>
                  <div style={{ fontSize: "14px", color: theme.text, marginTop: "8px", lineHeight: 1.55 }}>{selected.insight}</div>
                </div>

                <div style={{ border: theme.mutedBoxBorder, borderRadius: "18px", padding: "16px", background: theme.mutedBoxBg }}>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: theme.heading }}>Matched skills</div>
                  <div style={{ fontSize: "14px", color: theme.text, marginTop: "8px", lineHeight: 1.55 }}>
                    {selected.tags.join(", ")}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ border: theme.mutedBoxBorder, borderRadius: "16px", padding: "16px", background: theme.mutedBoxBg }}>
                    <div style={{ fontSize: "12px", color: theme.subtext }}>Qualifications match</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "4px", color: theme.heading }}>{selected.qualificationsScore}</div>
                  </div>
                  <div style={{ border: theme.mutedBoxBorder, borderRadius: "16px", padding: "16px", background: theme.mutedBoxBg }}>
                    <div style={{ fontSize: "12px", color: theme.subtext }}>Fast-hire potential</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "4px", color: theme.heading }}>{selected.speedScore}</div>
                  </div>
                </div>

                <div style={{ border: theme.mutedBoxBorder, borderRadius: "18px", padding: "16px", background: theme.mutedBoxBg }}>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: theme.heading }}>Risk factors</div>
                  <div style={{ fontSize: "14px", color: theme.text, marginTop: "8px", lineHeight: 1.55 }}>{selected.risks}</div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Button theme={theme} onClick={() => moveListing(selected.id, "Apply Now")}>
                    <Bookmark size={16} />
                    Apply Now
                  </Button>
                  <Button theme={theme} variant="outline" onClick={() => moveListing(selected.id, "Save for Later")}>
                    <FolderOpen size={16} />
                    Save
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
                  <Button theme={theme} variant="destructive" onClick={() => discardListing(selected.id)}>
                    <X size={16} />
                    Discard
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "14px", color: theme.subtext, marginTop: "16px" }}>
                No listing selected.
              </div>
            )}
          </div>

          <div style={panelStyle(theme)}>
            <div style={{ fontWeight: 700, display: "flex", gap: "8px", alignItems: "center", color: theme.heading }}>
              <SlidersHorizontal size={16} color={themeMode === "generic_clean" ? "#334155" : "#93c5fd"} />
              Selectable Settings
            </div>

            <div style={{ marginTop: "18px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px", color: theme.heading, marginBottom: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
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
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "20px" }}>
              {Object.entries(priorities).map(([key, value]) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "6px", textTransform: "capitalize", color: theme.text }}>
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
                      setPriorities((p) => ({ ...p, [key]: Number(e.target.value) }))
                    }
                    style={{ width: "100%", accentColor: theme.sliderAccent }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}