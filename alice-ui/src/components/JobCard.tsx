import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

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

function scorePalette(score: number, themeName?: ThemeName) {
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

function SmallButton({
  children,
  onClick,
  variant = "default",
  style = {},
}: {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: "default" | "outline";
  style?: React.CSSProperties;
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
    padding: "8px 12px",
    fontSize: "13px",
  };

  const variants = {
    default: {
      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
      color: "#ffffff",
      borderColor: "rgba(96,165,250,0.28)",
      boxShadow: "0 10px 25px rgba(37,99,235,0.22)",
    },
    outline: {
      background: "rgba(255,255,255,0.03)",
      color: "#e2e8f0",
      borderColor: "rgba(148,163,184,0.18)",
    },
  };

  return (
    <button
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

type JobCardProps = {
  job: Job;
  selected: boolean;
  onSelect: (id: string) => void;
  onSave?: (id: string) => void;
  onExpand?: (id: string) => void;
  onDiscard?: (id: string) => void;
  theme: Theme;
  themeMode?: ThemeName;
};

export default function JobCard({
  job,
  selected,
  onSelect,
  onSave,
  onExpand,
  onDiscard,
  theme,
  themeMode,
}: JobCardProps) {
  const palette = scorePalette(job.score, themeMode);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      style={{ minWidth: "320px", maxWidth: "320px", scrollSnapAlign: "start" }}
    >
      <div
        onClick={() => onSelect(job.id)}
        style={{
          ...cardStyle(theme, selected),
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
            <div
              style={{
                fontWeight: 700,
                fontSize: "16px",
                lineHeight: 1.2,
                color: theme.heading,
              }}
            >
              {job.title}
            </div>
            <div
              style={{ fontSize: "14px", color: theme.text, marginTop: "4px" }}
            >
              {job.company}
            </div>
            <div style={{ fontSize: "14px", color: theme.subtext }}>
              {job.location}
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "8px",
              }}
            >
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

        <div
          style={{
            fontSize: "14px",
            color: theme.text,
            flex: 1,
            lineHeight: 1.5,
          }}
        >
          {job.summary}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            fontSize: "12px",
          }}
        >
          <div
            style={{
              border: theme.mutedBoxBorder,
              borderRadius: "12px",
              background: theme.mutedBoxBg,
              padding: "8px",
            }}
          >
            <div style={{ color: theme.subtext }}>Qualifications</div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "14px",
                marginTop: "4px",
                color: theme.heading,
              }}
            >
              {job.qualificationsScore}
            </div>
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
            <div
              style={{
                fontWeight: 700,
                fontSize: "14px",
                marginTop: "4px",
                color: theme.heading,
              }}
            >
              {job.speedScore}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {job.tags.map((tag) => {
            const cleanTag = tag.includes(":") ? tag.split(":")[1] : tag;

            return (
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
                {cleanTag}
              </span>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: theme.subtext,
          }}
        >
          <span>{job.salary}</span>
          <span>{job.folder}</span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <SmallButton
            style={{ flex: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              onSave?.(job.id);
            }}
          >
            Save
          </SmallButton>
          <SmallButton
            variant="outline"
            style={{ flex: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              onExpand?.(job.id);
            }}
          >
            Expand
          </SmallButton>
          <SmallButton
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDiscard?.(job.id);
            }}
          >
            <X size={16} />
          </SmallButton>
        </div>
      </div>
    </motion.div>
  );
}
