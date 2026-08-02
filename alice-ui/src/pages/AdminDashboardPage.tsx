import { useEffect, useMemo, useState } from "react";
import { getAdminStats, type AdminStats, type DailyCount } from "../services/adminClient";
import { signOut } from "../services/authClient";
import { clearDiscoveryIdentity } from "../services/discoveryIdentity";
import { clearLastVisitedPage } from "../services/lastVisitedPage";
import "./AdminDashboardPage.css";

type LoadState = "loading" | "unauthorized" | "forbidden" | "error" | "ready";

const CHART_COLORS = {
  signups: "#3987e5",
  profiles: "#d95926",
  testimonials: "#199e70",
  exits: "#c0392b",
};

// Builds a dense last-`days`-calendar-days series (ending today, UTC) from
// the server's sparse day/count rows, so the chart never has to guess at
// gaps -- missing days are genuinely zero, not absent data.
function gapFillDaily(daily: DailyCount[], days: number): DailyCount[] {
  const byDay = new Map(daily.map((entry) => [entry.day, entry.count]));
  const out: DailyCount[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, count: byDay.get(key) ?? 0 });
  }
  return out;
}

function formatShortDate(day: string): string {
  const [, month, date] = day.split("-");
  return `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month)]} ${Number(date)}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function TrendLine({ data, color }: { data: DailyCount[]; color: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 320;
  const height = 96;
  const padX = 6;
  const padY = 14;
  const max = Math.max(1, ...data.map((d) => d.count));

  const points = data.map((d, i) => {
    const x = padX + (i / Math.max(1, data.length - 1)) * (width - padX * 2);
    const y = height - padY - (d.count / max) * (height - padY * 2);
    return { x, y, ...d };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  const handleMove = (event: React.MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relX = ((event.clientX - rect.left) / rect.width) * width;
    const idx = Math.round(((relX - padX) / (width - padX * 2)) * (points.length - 1));
    setHoverIndex(Math.min(points.length - 1, Math.max(0, idx)));
  };

  return (
    <svg className="trendline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend over the last 30 days">
      {[0.25, 0.5, 0.75].map((frac) => (
        <line key={frac} className="trendline__grid" x1={padX} x2={width - padX} y1={height - padY - frac * (height - padY * 2)} y2={height - padY - frac * (height - padY * 2)} />
      ))}
      <path className="trendline__path" d={path} stroke={color} />
      {last && <circle className="trendline__dot" cx={last.x} cy={last.y} r={3.5} fill={color} />}
      {hovered && (
        <>
          <line className="trendline__crosshair" x1={hovered.x} x2={hovered.x} y1={padY / 2} y2={height - padY} />
          <circle cx={hovered.x} cy={hovered.y} r={3.5} fill={color} stroke="#0d1b35" strokeWidth={1.5} />
          <g transform={`translate(${Math.min(Math.max(hovered.x - 34, 2), width - 70)}, 2)`}>
            <rect className="trendline__tooltip-bg" width={68} height={26} rx={5} />
            <text className="trendline__tooltip-text" x={6} y={11}>{formatShortDate(hovered.day)}</text>
            <text className="trendline__tooltip-text trendline__tooltip-text--muted" x={6} y={21}>{hovered.count} today</text>
          </g>
        </>
      )}
      <rect className="trendline__hit" x={0} y={0} width={width} height={height} onMouseMove={handleMove} onMouseLeave={() => setHoverIndex(null)} />
    </svg>
  );
}

function StatTile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="admin-tile">
      <div className="admin-tile__label">{label}</div>
      <div className="admin-tile__value">{value}</div>
      {sub && <div className="admin-tile__sub">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, color, daily }: { title: string; color: string; daily: DailyCount[] }) {
  const filled = useMemo(() => gapFillDaily(daily, 30), [daily]);
  return (
    <div className="admin-chart">
      <div className="admin-chart__title">
        <span className="admin-chart__dot" style={{ background: color }} />
        {title} <span className="admin-table__muted">· last 30 days</span>
      </div>
      <TrendLine data={filled} color={color} />
    </div>
  );
}

function ConsentPill({ consented }: { consented: boolean }) {
  return <span className={`admin-pill ${consented ? "admin-pill--yes" : "admin-pill--no"}`}>{consented ? "Consented" : "No consent"}</span>;
}

function ExitOutcomePill({ profileGenerated }: { profileGenerated: boolean }) {
  return <span className={`admin-pill ${profileGenerated ? "admin-pill--yes" : "admin-pill--no"}`}>{profileGenerated ? "Finished" : "Abandoned"}</span>;
}

export default function AdminDashboardPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    getAdminStats().then((result) => {
      if (result.status === "ok") {
        setStats(result.data);
        setState("ready");
      } else {
        // This page must never be the "last visited page" a signed-in,
        // non-admin user gets bounced back into from the landing page --
        // otherwise "Back to Lighthouse" loops right back here.
        clearLastVisitedPage();
        setState(result.status);
      }
    });
  }, []);

  const handleSignOutAndReturn = async () => {
    await signOut().catch(() => undefined);
    clearDiscoveryIdentity();
    clearLastVisitedPage();
    window.location.href = "/";
  };

  if (state !== "ready" || !stats) {
    const copy: Record<Exclude<LoadState, "ready">, { title: string; body: string }> = {
      loading: { title: "Loading…", body: "" },
      unauthorized: { title: "Sign in required", body: "You need to be signed in to view this page." },
      forbidden: { title: "Not authorized", body: "Your account doesn't have access to the admin dashboard." },
      error: { title: "Something went wrong", body: "Couldn't load the dashboard. Try refreshing the page." },
    };
    const { title, body } = copy[state as Exclude<LoadState, "ready">];
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard__state">
          <h2>{title}</h2>
          {body && <p>{body}</p>}
          {state === "forbidden" ? (
            <button type="button" className="admin-dashboard__back" onClick={() => void handleSignOutAndReturn()}>Sign out &amp; return to Lighthouse</button>
          ) : (
            state !== "loading" && <a className="admin-dashboard__back" href="/">Back to Lighthouse</a>
          )}
        </div>
      </div>
    );
  }

  const consentRate = stats.testimonials.total > 0 ? Math.round((stats.testimonials.consented / stats.testimonials.total) * 100) : 0;

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Signups, completed profiles, and feedback across Lighthouse Discovery.</p>
        </div>
        <a className="admin-dashboard__back" href="/">Back to Lighthouse</a>
      </div>

      <div className="admin-tiles">
        <StatTile label="Total Signups" value={stats.users.total} sub={`${stats.users.last7Days} in the last 7 days`} />
        <StatTile label="Profiles Authored" value={stats.profiles.total} sub={`${stats.profiles.linked} linked to an account`} />
        <StatTile label="Feedback Submitted" value={stats.testimonials.total} sub={`${stats.testimonials.consented} consented to use`} />
        <StatTile label="Consent Rate" value={`${consentRate}%`} sub="of feedback submissions" />
        <StatTile label="Discovery Abandoned" value={stats.exits.abandonedTotal} sub={`${stats.exits.avgReadinessAtAbandon}% avg. readiness when they left`} />
      </div>

      <div className="admin-charts">
        <ChartCard title="Signups" color={CHART_COLORS.signups} daily={stats.users.daily} />
        <ChartCard title="Profiles Authored" color={CHART_COLORS.profiles} daily={stats.profiles.daily} />
        <ChartCard title="Feedback Submitted" color={CHART_COLORS.testimonials} daily={stats.testimonials.daily} />
        <ChartCard title="Discovery Exits" color={CHART_COLORS.exits} daily={stats.exits.daily} />
      </div>

      <div className="admin-section">
        <h2 className="admin-section__title">Signed Up, Haven't Finished</h2>
        <p className="admin-section__hint">Accounts with no completed/opted-in Discovery profile yet.</p>
        <div className="admin-table-wrap">
          {stats.recent.signedUpNoProfile.length === 0 ? (
            <div className="admin-table__empty">Everyone who's signed up has a profile on file.</div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Email</th><th>Signed Up</th><th>Last Login</th></tr></thead>
              <tbody>
                {stats.recent.signedUpNoProfile.map((u) => (
                  <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{formatDateTime(u.created_at)}</td><td>{formatDateTime(u.last_login_at)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section__title">Recent Signups</h2>
        <div className="admin-table-wrap">
          {stats.recent.users.length === 0 ? (
            <div className="admin-table__empty">No signups yet.</div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Email</th><th>Signed Up</th><th>Last Login</th></tr></thead>
              <tbody>
                {stats.recent.users.map((u) => (
                  <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{formatDateTime(u.created_at)}</td><td>{formatDateTime(u.last_login_at)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section__title">Recent Profiles</h2>
        <div className="admin-table-wrap">
          {stats.recent.profiles.length === 0 ? (
            <div className="admin-table__empty">No profiles authored yet.</div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Participant</th><th>Email</th><th>Model</th><th>Linked</th><th>Created</th></tr></thead>
              <tbody>
                {stats.recent.profiles.map((p) => (
                  <tr key={p.id}>
                    <td>{p.participant_name ?? "—"}</td>
                    <td>{p.participant_email ?? "—"}</td>
                    <td className="admin-table__muted">{p.model}</td>
                    <td><span className={`admin-pill ${p.user_id ? "admin-pill--yes" : "admin-pill--no"}`}>{p.user_id ? "Linked" : "Unlinked"}</span></td>
                    <td>{formatDateTime(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section__title">Recent Feedback</h2>
        <div className="admin-table-wrap">
          {stats.recent.testimonials.length === 0 ? (
            <div className="admin-table__empty">No feedback submitted yet.</div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Participant</th><th>Email</th><th>Mode</th><th>Consent</th><th>Feedback</th><th>Submitted</th></tr></thead>
              <tbody>
                {stats.recent.testimonials.map((t) => (
                  <tr key={t.id}>
                    <td>{t.participant_name ?? "—"}</td>
                    <td>{t.participant_email ?? "—"}</td>
                    <td className="admin-table__muted">{t.input_mode}</td>
                    <td><ConsentPill consented={t.consent_to_use_as_testimonial} /></td>
                    <td>{t.feedback_preview}</td>
                    <td>{formatDateTime(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section__title">Recent Discovery Exits</h2>
        <p className="admin-section__hint">Where participants were in the conversation when they left — "Finished" means a profile had already been generated before they exited.</p>
        <div className="admin-table-wrap">
          {stats.recent.exits.length === 0 ? (
            <div className="admin-table__empty">No exit events recorded yet.</div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Participant</th><th>Email</th><th>Readiness</th><th>Turns</th><th>Outcome</th><th>Trigger</th><th>Left</th></tr></thead>
              <tbody>
                {stats.recent.exits.map((e) => (
                  <tr key={e.id}>
                    <td>{e.participant_name ?? "—"}</td>
                    <td>{e.participant_email ?? "—"}</td>
                    <td>{e.profile_readiness_percentage ?? "—"}%</td>
                    <td className="admin-table__muted">{e.turn_count ?? "—"}</td>
                    <td><ExitOutcomePill profileGenerated={e.profile_generated} /></td>
                    <td className="admin-table__muted">{e.exit_reason}</td>
                    <td>{formatDateTime(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
