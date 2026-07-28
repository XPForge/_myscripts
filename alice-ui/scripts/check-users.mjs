import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT id, name, email, password_hash, created_at, last_login_at FROM users ORDER BY created_at DESC LIMIT 5`;
console.log(JSON.stringify(rows, null, 2));
