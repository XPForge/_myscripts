type SafeMeta = Record<string, string | number | boolean | null | undefined>;

function serialize(meta?: SafeMeta) {
  if (!meta) return "";
  const safe = Object.fromEntries(
    Object.entries(meta).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value) || value === null),
  );
  return ` ${JSON.stringify(safe)}`;
}

export function safeLog(event: string, meta?: SafeMeta) {
  console.log(`[safe-event] ${event}${serialize(meta)}`);
}

export function safeWarn(event: string, meta?: SafeMeta) {
  console.log(`[safe-event] ${event}${serialize(meta)}`);
}
