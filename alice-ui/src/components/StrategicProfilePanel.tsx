import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { loadOnboardingProfile } from "../services/onboardingProfile";
import { summarizeProfile } from "../services/profileInspector";
import { calculateProfileConfidence } from "../services/profileConfidence";
import ProfileSignalGroup from "./ProfileSignalGroup";

type StrategicProfilePanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function StrategicProfilePanel({ isOpen, onClose }: StrategicProfilePanelProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(loadOnboardingProfile(user?.id));

  useEffect(() => {
    setProfile(loadOnboardingProfile(user?.id));
  }, [user?.id, isOpen]);

  const summary = useMemo(
    () => (profile ? summarizeProfile(profile) : null),
    [profile]
  );
  const confidence = useMemo(
    () => (profile ? calculateProfileConfidence(profile) : null),
    [profile]
  );

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(12px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Strategic profile panel"
      onClick={onClose}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "24px",
          borderRadius: "28px",
          background: "rgba(10,20,40,0.96)",
          border: "1px solid rgba(96,165,250,0.18)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "18px", marginBottom: "18px" }}>
          <div>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#eef2ff" }}>
              Strategic profile inspector
            </div>
            <div style={{ marginTop: "8px", color: "rgba(148,163,184,0.88)", fontSize: "0.92rem" }}>
              A live view of what ALICE currently believes about your strategic identity.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: "16px",
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(255,255,255,0.04)",
              color: "#e2e8f0",
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Close
          </button>
        </div>

        {!profile ? (
          <div style={{ color: "rgba(226,232,240,0.9)", lineHeight: 1.7 }}>
            ALICE has not yet built a strategic profile for this session.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "18px" }}>
            <section style={{ display: "grid", gap: "12px" }}>
              <div style={{ fontSize: "0.85rem", letterSpacing: "0.12em", color: "rgba(148,163,184,0.78)", textTransform: "uppercase", fontWeight: 700 }}>
                Current identity signals
              </div>
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "grid", gap: "8px" }}>
                  <div style={{ color: "rgba(226,232,240,0.94)", fontWeight: 700 }}>Onboarding mode</div>
                  <div style={{ color: "#c7d2fe", fontSize: "0.96rem" }}>{profile.mode}</div>
                </div>

                <div style={{ display: "grid", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(226,232,240,0.92)", fontWeight: 700 }}>
                    <span>Confidence</span>
                    <span>{Math.round((confidence?.profileConfidence ?? 0) * 100)}%</span>
                  </div>
                  <div style={{ height: "12px", borderRadius: "999px", background: "rgba(148,163,184,0.14)" }}>
                    <div
                      style={{
                        width: `${Math.round((confidence?.profileConfidence ?? 0) * 100)}%`,
                        height: "100%",
                        borderRadius: "999px",
                        background: "linear-gradient(90deg, rgba(59,130,246,0.92), rgba(34,211,153,0.78))",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(226,232,240,0.92)", fontWeight: 700 }}>
                    <span>Exploration level</span>
                    <span>{Math.round(profile.explorationLevel * 100)}%</span>
                  </div>
                  <div style={{ height: "12px", borderRadius: "999px", background: "rgba(148,163,184,0.14)" }}>
                    <div
                      style={{
                        width: `${Math.round(profile.explorationLevel * 100)}%`,
                        height: "100%",
                        borderRadius: "999px",
                        background: "linear-gradient(90deg, rgba(234,179,8,0.9), rgba(16,185,129,0.78))",
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <ProfileSignalGroup
              title="Top strategic cluster affinities"
              items={Object.entries(profile.clusterAffinities)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([clusterId, value]) => ({
                  label: clusterId.replace(/-/g, " "),
                  value,
                }))}
            />

            <section style={{ display: "grid", gap: "10px", padding: "18px", borderRadius: "18px", background: "rgba(15,23,42,0.94)", border: "1px solid rgba(148,163,184,0.12)" }}>
              <div style={{ fontSize: "0.88rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(148,163,184,0.82)", fontWeight: 700 }}>
                Industry signals
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {profile.preferredIndustries.length > 0 ? (
                  profile.preferredIndustries.map((industry) => (
                    <span
                      key={industry}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        background: "rgba(59,130,246,0.12)",
                        color: "#dbeafe",
                        fontSize: "0.88rem",
                        border: "1px solid rgba(59,130,246,0.18)",
                      }}
                    >
                      {industry}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "rgba(148,163,184,0.8)" }}>
                    No preferred industries recorded yet.
                  </span>
                )}
              </div>
              {profile.excludedIndustries.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {profile.excludedIndustries.map((industry) => (
                    <span
                      key={industry}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        background: "rgba(248,113,113,0.14)",
                        color: "#fde2e2",
                        fontSize: "0.88rem",
                        border: "1px solid rgba(248,113,113,0.16)",
                      }}
                    >
                      {industry}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <section style={{ display: "grid", gap: "12px", padding: "18px", borderRadius: "18px", background: "rgba(15,23,42,0.94)", border: "1px solid rgba(148,163,184,0.12)" }}>
              <div style={{ fontSize: "0.88rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(148,163,184,0.82)", fontWeight: 700 }}>
                Profile narrative
              </div>
              {summary?.details.map((line) => (
                <div key={line} style={{ color: "rgba(226,232,240,0.9)", lineHeight: 1.7, fontSize: "0.95rem" }}>
                  {line}
                </div>
              ))}
            </section>

            {summary?.recommendations.length ? (
              <section style={{ display: "grid", gap: "10px", padding: "18px", borderRadius: "18px", background: "rgba(15,23,42,0.94)", border: "1px solid rgba(148,163,184,0.12)" }}>
                <div style={{ fontSize: "0.88rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(148,163,184,0.82)", fontWeight: 700 }}>
                  Recommendations for signal refinement
                </div>
                {summary.recommendations.map((item) => (
                  <div key={item} style={{ color: "rgba(226,232,240,0.9)", lineHeight: 1.7, fontSize: "0.95rem" }}>
                    • {item}
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
