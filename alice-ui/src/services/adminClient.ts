export type DailyCount = { day: string; count: number };

export type AdminRecentUser = { id: string; name: string; email: string; created_at: string; last_login_at: string | null };
export type AdminRecentProfile = { id: string; participant_name: string | null; participant_email: string | null; model: string; created_at: string; user_id: string | null };
export type AdminRecentTestimonial = {
  id: string;
  participant_name: string | null;
  participant_email: string | null;
  input_mode: string;
  consent_to_use_as_testimonial: boolean;
  status: string;
  created_at: string;
  user_id: string | null;
  feedback_preview: string;
};

export type AdminStats = {
  users: { total: number; last7Days: number; daily: DailyCount[] };
  profiles: { total: number; linked: number; daily: DailyCount[] };
  testimonials: { total: number; consented: number; daily: DailyCount[] };
  recent: {
    users: AdminRecentUser[];
    profiles: AdminRecentProfile[];
    testimonials: AdminRecentTestimonial[];
    signedUpNoProfile: AdminRecentUser[];
  };
};

export type AdminStatsResult =
  | { status: "ok"; data: AdminStats }
  | { status: "unauthorized" | "forbidden" | "error" };

export async function getAdminStats(): Promise<AdminStatsResult> {
  try {
    const response = await fetch("/api/admin-stats");
    if (response.status === 401) return { status: "unauthorized" };
    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };
    const data = (await response.json()) as AdminStats;
    return { status: "ok", data };
  } catch {
    return { status: "error" };
  }
}
