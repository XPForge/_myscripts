// Summarizes estimated metered-service cost from a saved log file containing
// Lighthouse cost-event lines (see api/_lib/costTracking.js).
//
// Cost events are plain console.log JSON lines with `"type":"lighthouse_cost_event"`,
// mixed in with whatever else is on stdout -- this script just greps for
// that marker, so it works against:
//   - a local dev server's output, redirected to a file:
//       npm run dev > /tmp/lighthouse-dev.log 2>&1
//       node scripts/costReport.mjs /tmp/lighthouse-dev.log
//   - a Vercel function log export saved to a file (Vercel dashboard ->
//     Deployments -> a deployment -> Logs -> export/download).
//
// Usage: node scripts/costReport.mjs <path-to-log-file>
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/costReport.mjs <path-to-log-file>");
  process.exit(1);
}
if (!existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

function formatUsd(value) {
  if (typeof value !== "number") return "n/a";
  return `$${value.toFixed(value < 1 ? 6 : 2)}`;
}

function newBucket() {
  return { count: 0, costUsd: 0, hasUnpricedEvents: false };
}
function addToBucket(bucket, event) {
  bucket.count += 1;
  if (typeof event.estimatedCostUsd === "number") bucket.costUsd += event.estimatedCostUsd;
  else bucket.hasUnpricedEvents = true;
}

async function main() {
  const events = [];
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.includes("lighthouse_cost_event")) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === "lighthouse_cost_event") events.push(parsed);
    } catch {
      // Not a clean JSON line (log line got wrapped/prefixed by another
      // tool) -- skip it rather than crash the report.
    }
  }

  if (events.length === 0) {
    console.log(`No cost events found in ${filePath}.`);
    console.log('Looked for lines containing "lighthouse_cost_event". Nothing matched.');
    return;
  }

  const byEnvironment = new Map();
  const byService = new Map();
  const bySession = new Map();
  let grandTotal = newBucket();

  for (const event of events) {
    const envKey = `${event.environment || "unknown"}${event.isTestAccount ? " (test/dev account)" : ""}`;
    addToBucket(byEnvironment.get(envKey) ?? byEnvironment.set(envKey, newBucket()).get(envKey), event);

    const serviceKey = `${event.service || "unknown"} / ${event.kind || "unknown"}`;
    addToBucket(byService.get(serviceKey) ?? byService.set(serviceKey, newBucket()).get(serviceKey), event);

    if (event.sessionId) {
      const bucket = bySession.get(event.sessionId) ?? bySession.set(event.sessionId, { ...newBucket(), kinds: new Set(), completedProfile: false, isTestAccount: Boolean(event.isTestAccount) }).get(event.sessionId);
      addToBucket(bucket, event);
      if (event.kind) bucket.kinds.add(event.kind);
      if (event.kind === "profile_authoring") bucket.completedProfile = true;
    }

    addToBucket(grandTotal, event);
  }

  const printTable = (title, map) => {
    console.log(`\n${title}`);
    console.log("-".repeat(title.length));
    const rows = [...map.entries()].sort((a, b) => b[1].costUsd - a[1].costUsd);
    for (const [key, bucket] of rows) {
      const flag = bucket.hasUnpricedEvents ? "  (some events had no configured price)" : "";
      console.log(`  ${key.padEnd(46)} ${String(bucket.count).padStart(5)} calls   ${formatUsd(bucket.costUsd).padStart(12)}${flag}`);
    }
  };

  console.log(`Lighthouse estimated cost report`);
  console.log(`Source: ${filePath}`);
  console.log(`Events parsed: ${events.length}`);

  printTable("By environment", byEnvironment);
  printTable("By service / call type", byService);

  console.log(`\nBy Discovery session (top 20 by cost)`);
  console.log("-".repeat(38));
  const sessionRows = [...bySession.entries()].sort((a, b) => b[1].costUsd - a[1].costUsd).slice(0, 20);
  if (sessionRows.length === 0) {
    console.log("  No events carried a sessionId (older client, or a non-Discovery call like founder-intel).");
  } else {
    for (const [sessionId, bucket] of sessionRows) {
      const profileFlag = bucket.completedProfile ? "profile generated" : "no profile yet";
      const testFlag = bucket.isTestAccount ? ", test account" : "";
      console.log(`  ${sessionId.padEnd(38)} ${String(bucket.count).padStart(4)} calls   ${formatUsd(bucket.costUsd).padStart(12)}   (${profileFlag}${testFlag})`);
    }
  }

  console.log(`\nGrand total`);
  console.log("-".repeat(11));
  console.log(`  ${String(grandTotal.count).padStart(5)} calls   ${formatUsd(grandTotal.costUsd).padStart(12)}`);
  if (grandTotal.hasUnpricedEvents) {
    console.log(`  Note: some events had no configured price for their service/model and were excluded from the dollar total (still counted above).`);
  }
  console.log(`\nPricing is estimated from api/_lib/costPricing.js -- verify those rates against your actual provider billing before treating totals as exact.`);
}

main();
