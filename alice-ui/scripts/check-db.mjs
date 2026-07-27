import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT id, participant_name, participant_email, model, created_at
  FROM discovery_profiles
  ORDER BY created_at DESC
  LIMIT 5
`;
console.log(JSON.stringify(rows, null, 2));
