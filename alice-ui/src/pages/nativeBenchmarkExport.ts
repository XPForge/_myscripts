export const NATIVE_BENCHMARK_VERSION = "native-benchmark-v0.1";

export type NativeBenchmarkSessionType = "fixed-a" | "fixed-b" | "free-form";

export type NativeBenchmarkTurnRole = "system" | "user" | "assistant";

export type NativeBenchmarkTurn = {
  id: string;
  role: NativeBenchmarkTurnRole;
  timestamp: string;
  text: string;
  mode?: "typed" | "spoken" | "model" | "system";
  source?: string;
  fixedQuestionIndex?: number;
};

export type NativeBenchmarkExport = {
  version: typeof NATIVE_BENCHMARK_VERSION;
  sessionId: string;
  sessionType: NativeBenchmarkSessionType;
  createdAt: string;
  exportedAt: string;
  modelProviderLabel: string;
  fixedQuestionSetId: "A" | "B" | null;
  notes: string;
  turns: NativeBenchmarkTurn[];
};

export function createNativeBenchmarkExport(args: {
  sessionId: string;
  sessionType: NativeBenchmarkSessionType;
  createdAt: string;
  modelProviderLabel: string;
  turns: NativeBenchmarkTurn[];
}): NativeBenchmarkExport {
  return {
    version: NATIVE_BENCHMARK_VERSION,
    sessionId: args.sessionId,
    sessionType: args.sessionType,
    createdAt: args.createdAt,
    exportedAt: new Date().toISOString(),
    modelProviderLabel: args.modelProviderLabel,
    fixedQuestionSetId:
      args.sessionType === "fixed-a" ? "A" : args.sessionType === "fixed-b" ? "B" : null,
    notes: "",
    turns: args.turns,
  };
}

export function serializeNativeBenchmarkMarkdown(payload: NativeBenchmarkExport) {
  const lines = [
    `# Lighthouse Native Verbal Benchmark Transcript`,
    ``,
    `- Version: ${payload.version}`,
    `- Session ID: ${payload.sessionId}`,
    `- Session type: ${payload.sessionType}`,
    `- Fixed question set: ${payload.fixedQuestionSetId ?? "none"}`,
    `- Created: ${payload.createdAt}`,
    `- Exported: ${payload.exportedAt}`,
    `- Model/provider: ${payload.modelProviderLabel}`,
    `- Notes: ${payload.notes}`,
    ``,
    `## Turns`,
    ``,
  ];

  for (const turn of payload.turns) {
    const meta = [
      turn.mode ? `mode=${turn.mode}` : null,
      turn.source ? `source=${turn.source}` : null,
      turn.fixedQuestionIndex !== undefined ? `fixedQuestionIndex=${turn.fixedQuestionIndex}` : null,
    ]
      .filter(Boolean)
      .join("; ");

    lines.push(`### ${turn.role} - ${turn.timestamp}`);
    if (meta) lines.push(`_${meta}_`);
    lines.push(``, turn.text, ``);
  }

  return lines.join("\n");
}
