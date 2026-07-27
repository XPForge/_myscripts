import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS discovery_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_name TEXT,
    participant_email TEXT,
    model TEXT NOT NULL,
    profile_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

console.log("discovery_profiles table ready.");
