import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "node:fs";

function stripBom(value) {
  return value.split("").filter((ch) => ch.charCodeAt(0) !== 0xfeff).join("").trim();
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return stripBom(process.env.DATABASE_URL);
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    const match = text.match(/DATABASE_URL=("?)([^"\r\n]+)\1/);
    if (match) return stripBom(match[2]);
  }
  throw new Error("DATABASE_URL not found in environment or .env.local/.env");
}

const sql = neon(loadDatabaseUrl());

// One workspace per account for v1 -- see the plan for why this doesn't
// attempt to fully normalize evidence/themes/signals into their own tables:
// turns_json/oz_capture_json reuse the exact shapes already computed
// client-side every turn (OzDiscoveryCapture's schemaAreaMappings already
// is a 10-domain resolution tracker), so there's nothing new to track, just
// somewhere durable to put it.
await sql`
  CREATE TABLE IF NOT EXISTS discovery_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    lifecycle_state TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS discovery_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES discovery_workspaces(id),
    session_number INT NOT NULL,
    turns_json JSONB NOT NULL,
    oz_capture_json JSONB,
    checkpoint_announced BOOLEAN NOT NULL DEFAULT false,
    profile_generated BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

console.log("discovery_workspaces and discovery_sessions tables ready.");
