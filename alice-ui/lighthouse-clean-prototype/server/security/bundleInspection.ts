import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const candidates = [join(scriptDir, "..", "..", "public"), join(scriptDir, "..", "..", "..", "public")];
const root = candidates.find((candidate) => existsSync(candidate)) || candidates[0];
const forbidden = [
  "CONFIDENTIALITY INSTRUCTION",
  "You are a Lighthouse Discovery Agent",
  "OPENAI_API_KEY",
  "LIGHTHOUSE_DISCOVERY_SYSTEM_PROMPT",
];

function walk(path: string): string[] {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  return readdirSync(path).flatMap((entry) => walk(join(path, entry)));
}

let failed = false;
for (const file of walk(root)) {
  const content = readFileSync(file, "utf8");
  for (const token of forbidden) {
    if (content.includes(token)) {
      console.error(`Forbidden token found in ${file}: ${token}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("Frontend bundle/static inspection passed.");
