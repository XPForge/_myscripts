import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL
  .split("")
  .filter((ch) => ch.charCodeAt(0) !== 0xfeff)
  .join("")
  .trim();
const sql = neon(databaseUrl);

const profiles = await sql`SELECT id, participant_name, user_id, created_at FROM discovery_profiles ORDER BY created_at DESC LIMIT 3`;
console.log("PROFILES:", JSON.stringify(profiles, null, 2));

const testimonials = await sql`SELECT id, participant_name, user_id, created_at FROM testimonials ORDER BY created_at DESC LIMIT 3`;
console.log("TESTIMONIALS:", JSON.stringify(testimonials, null, 2));
