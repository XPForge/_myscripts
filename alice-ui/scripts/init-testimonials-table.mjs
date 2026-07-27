import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_name TEXT,
    participant_email TEXT,
    feedback_text TEXT NOT NULL,
    input_mode TEXT NOT NULL,
    consent_to_use_as_testimonial BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending_review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

console.log("testimonials table ready.");
