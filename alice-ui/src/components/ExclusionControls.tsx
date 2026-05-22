import { X } from "lucide-react";

type Theme = {
  heading: string;
  text: string;
  subtext: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
};

type ExclusionControlsProps = {
  theme: Theme;
  excludedKeywordInput: string;
  setExcludedKeywordInput: (value: string) => void;
  excludedKeywords: string[];
  addExcludedKeyword: () => void;
  removeExcludedKeyword: (keyword: string) => void;
  excludedIndustries: string[];
  toggleExcludedIndustry: (industry: string) => void;
};

const INDUSTRY_OPTIONS = [
  "insurance",
  "retail",
  "hospitality",
  "healthcare",
  "sales",
];

export default function ExclusionControls({
  theme,
  excludedKeywordInput,
  setExcludedKeywordInput,
  excludedKeywords,
  addExcludedKeyword,
  removeExcludedKeyword,
  excludedIndustries,
  toggleExcludedIndustry,
}: ExclusionControlsProps) {
  return (
    <>
      <div style={{ marginTop: "20px" }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: "14px",
            color: theme.heading,
            marginBottom: "8px",
          }}
        >
          Excluded keywords
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "10px",
            flexWrap: "wrap",
          }}
        >
          <input
            value={excludedKeywordInput}
            onChange={(e) => setExcludedKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addExcludedKeyword();
              }
            }}
            placeholder="Add keyword to exclude"
            style={{
              border: theme.inputBorder,
              background: theme.inputBg,
              color: theme.inputText,
              borderRadius: "14px",
              padding: "10px 12px",
              flex: 1,
              minWidth: "180px",
              outline: "none",
            }}
          />
          <button
            onClick={addExcludedKeyword}
            style={{
              border: theme.pillBorder,
              background: theme.pillBg,
              color: theme.pillText,
              borderRadius: "14px",
              padding: "10px 12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Add
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {excludedKeywords.map((keyword) => (
            <span
              key={keyword}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: theme.pillBg,
                border: theme.pillBorder,
                color: theme.pillText,
                borderRadius: "999px",
                padding: "6px 10px",
                fontSize: "12px",
              }}
            >
              {keyword}
              <button
                onClick={() => removeExcludedKeyword(keyword)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.pillText,
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: "14px",
            color: theme.heading,
            marginBottom: "8px",
          }}
        >
          Excluded industries
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {INDUSTRY_OPTIONS.map((industry) => {
            const active = excludedIndustries.includes(industry);

            return (
              <button
                key={industry}
                onClick={() => toggleExcludedIndustry(industry)}
                style={{
                  border: theme.pillBorder,
                  background: active ? theme.heading : theme.pillBg,
                  color: active ? "#ffffff" : theme.pillText,
                  borderRadius: "999px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {industry}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}