import { Moon, Sun } from "lucide-react";

type ThemeToggleProps = {
  theme: "light" | "dark";
  onToggle: () => void;
};

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === "dark";
  return (
    <button className="theme-toggle" type="button" onClick={onToggle} aria-label="Toggle color theme" title="Toggle color theme">
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

