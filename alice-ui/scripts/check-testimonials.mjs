import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT id, participant_name, participant_email, feedback_text, input_mode, consent_to_use_as_testimonial, status, created_at
  FROM testimonials
  ORDER BY created_at DESC
  LIMIT 5
`;
console.log(JSON.stringify(rows, null, 2));
