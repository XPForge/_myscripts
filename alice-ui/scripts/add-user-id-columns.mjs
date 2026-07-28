import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL
  .split("")
  .filter((ch) => ch.charCodeAt(0) !== 0xfeff)
  .join("")
  .trim();
const sql = neon(databaseUrl);

await sql`ALTER TABLE discovery_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)`;
await sql`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)`;

console.log("user_id columns added to discovery_profiles and testimonials.");
