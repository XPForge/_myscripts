import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, "..", "..", "..", "src");
const forbidden = [
  "ANTHROPIC_API_KEY",
  "CONFIDENTIALITY INSTRUCTION",
  "You are a Lighthouse Discovery Agent",
  "api.anthropic.com",
];

function walk(path: string): string[] {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  return readdirSync(path).flatMap((entry) => walk(join(path, entry)));
}

let failed = false;
for (const file of [join(scriptDir, "..", "..", "..", "index.html"), ...walk(root)]) {
  const content = readFileSync(file, "utf8");
  for (const token of forbidden) {
    if (content.includes(token)) {
      console.error(`Forbidden token found in client file ${file}: ${token}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("Client prompt/key leak inspection passed.");
