import { neon } from "@neondatabase/serverless";
import { requireAdminSession } from "./_lib/auth.js";

function sanitizeSecret(value) {
  if (!value) return value;
  return value
    .split("")
    .filter((ch) => ch.charCodeAt(0) !== 0xfeff)
    .join("")
    .trim();
}

const DATABASE_URL = sanitizeSecret(process.env.DATABASE_URL);

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

// Postgres returns `day` as a Date object from date_trunc; normalize to
// YYYY-MM-DD so the client can gap-fill/merge series without a date parser.
function normalizeDaily(rows) {
  return rows.map((row) => ({
    day: new Date(row.day).toISOString().slice(0, 10),
    count: Number(row.count),
  }));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!DATABASE_URL) {
    sendJson(res, 500, { error: "Account storage is not configured" });
    return;
  }

  const { status } = requireAdminSession(req);
  if (status !== 200) {
    sendJson(res, status, { error: status === 401 ? "Sign in required" : "Not authorized" });
    return;
  }

  try {
    const sql = neon(DATABASE_URL);

    const [
      usersTotal,
      usersLast7Days,
      usersDaily,
      profilesTotal,
      profilesLinked,
      profilesDaily,
      testimonialsTotal,
      testimonialsConsented,
      testimonialsDaily,
      exitsTotal,
      exitsAbandonedTotal,
      exitsAvgReadinessAtAbandon,
      exitsDaily,
      recentUsers,
      recentProfiles,
      recentTestimonials,
      signedUpNoProfile,
      recentExits,
    ] = await Promise.all([
      sql`SELECT count(*)::int AS count FROM users`,
      sql`SELECT count(*)::int AS count FROM users WHERE created_at >= now() - interval '7 days'`,
      sql`SELECT date_trunc('day', created_at) AS day, count(*)::int AS count FROM users WHERE created_at >= now() - interval '30 days' GROUP BY 1 ORDER BY 1`,
      sql`SELECT count(*)::int AS count FROM discovery_profiles`,
      sql`SELECT count(*)::int AS count FROM discovery_profiles WHERE user_id IS NOT NULL`,
      sql`SELECT date_trunc('day', created_at) AS day, count(*)::int AS count FROM discovery_profiles WHERE created_at >= now() - interval '30 days' GROUP BY 1 ORDER BY 1`,
      sql`SELECT count(*)::int AS count FROM testimonials`,
      sql`SELECT count(*)::int AS count FROM testimonials WHERE consent_to_use_as_testimonial = true`,
      sql`SELECT date_trunc('day', created_at) AS day, count(*)::int AS count FROM testimonials WHERE created_at >= now() - interval '30 days' GROUP BY 1 ORDER BY 1`,
      sql`SELECT count(*)::int AS count FROM discovery_exit_events`,
      sql`SELECT count(*)::int AS count FROM discovery_exit_events WHERE profile_generated = false`,
      sql`SELECT coalesce(round(avg(profile_readiness_percentage)), 0)::int AS avg FROM discovery_exit_events WHERE profile_generated = false`,
      sql`SELECT date_trunc('day', created_at) AS day, count(*)::int AS count FROM discovery_exit_events WHERE created_at >= now() - interval '30 days' GROUP BY 1 ORDER BY 1`,
      sql`SELECT id, name, email, created_at, last_login_at FROM users ORDER BY created_at DESC LIMIT 20`,
      sql`SELECT id, participant_name, participant_email, model, created_at, user_id FROM discovery_profiles ORDER BY created_at DESC LIMIT 20`,
      sql`SELECT id, participant_name, participant_email, input_mode, consent_to_use_as_testimonial, status, created_at, user_id, left(feedback_text, 160) AS feedback_preview FROM testimonials ORDER BY created_at DESC LIMIT 20`,
      sql`SELECT u.id, u.name, u.email, u.created_at, u.last_login_at
          FROM users u
          LEFT JOIN discovery_profiles dp ON dp.user_id = u.id
          WHERE dp.id IS NULL
          ORDER BY u.created_at DESC
          LIMIT 50`,
      sql`SELECT id, participant_name, participant_email, schema_coverage_percentage, profile_readiness_percentage, turn_count, profile_generated, exit_reason, created_at, user_id
          FROM discovery_exit_events ORDER BY created_at DESC LIMIT 20`,
    ]);

    sendJson(res, 200, {
      users: {
        total: usersTotal[0].count,
        last7Days: usersLast7Days[0].count,
        daily: normalizeDaily(usersDaily),
      },
      profiles: {
        total: profilesTotal[0].count,
        linked: profilesLinked[0].count,
        daily: normalizeDaily(profilesDaily),
      },
      testimonials: {
        total: testimonialsTotal[0].count,
        consented: testimonialsConsented[0].count,
        daily: normalizeDaily(testimonialsDaily),
      },
      exits: {
        total: exitsTotal[0].count,
        abandonedTotal: exitsAbandonedTotal[0].count,
        avgReadinessAtAbandon: exitsAvgReadinessAtAbandon[0].avg,
        daily: normalizeDaily(exitsDaily),
      },
      recent: {
        users: recentUsers,
        profiles: recentProfiles,
        testimonials: recentTestimonials,
        signedUpNoProfile,
        exits: recentExits,
      },
    });
  } catch (err) {
    console.error("admin-stats error:", err);
    sendJson(res, 500, { error: "Unable to load admin stats" });
  }
}
