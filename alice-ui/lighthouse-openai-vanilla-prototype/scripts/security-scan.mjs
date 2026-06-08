import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const publicTargets = ["index.html", "src"];
const markers = [
  "sk-",
  "OPENAI_API_KEY",
  "You are conducting a warm, natural discovery conversation.",
  "Use associative discovery rather than linear questioning.",
  "The preferred rhythm is: participant answer -> concise synthesis -> possible pattern or implication -> one adjacent question.",
  "Create a Human Clarity Profile from the conversation.",
  "Realtime behavior: let the participant finish",
  "developer message",
  "hidden instructions",
  "system prompt",
  "wrapper prompt",
];

function walk(path) {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  return readdirSync(path).flatMap((entry) => walk(join(path, entry)));
}

const files = publicTargets.flatMap((target) => walk(join(root, target)));
const findings = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (content.includes(marker)) findings.push({ file: file.replace(`${root}\\`, ""), marker });
  }
}

if (findings.length) {
  console.error("Security scan failed. Client-visible markers found:");
  for (const finding of findings) console.error(`- ${finding.file}: ${finding.marker}`);
  process.exit(1);
}

console.log(`Security scan passed. Checked ${files.length} client-visible files.`);
