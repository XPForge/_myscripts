export type InsightDetailKey = "risks" | "strengths" | "growth";

export type InsightDetails = {
  insight: string;
  risks: string;
  strengths: string;
  growthPotential: string;
};

type InsightInput = {
  title: string;
  company: string;
  description: string;
  salary: string;
  alignment: string;
};

function hasKeyword(text: string, keys: string[]) {
  return keys.some((key) => text.includes(key));
}

function parseCompensationSignal(salary: string) {
  return /\$|salary|compensation|competitive|high pay|high compensation/i.test(salary);
}

function parseAutonomySignal(text: string) {
  return hasKeyword(text, ["autonomy", "independent", "self-directed", "remote", "distributed"]);
}

function parseLeadershipSignal(text: string) {
  return hasKeyword(text, ["lead", "manager", "director", "head", "principal", "senior"]);
}

function parseSystemsSignal(text: string) {
  return hasKeyword(text, ["systems", "platform", "architecture", "infrastructure", "operations"]);
}

function parseCreativeSignal(text: string) {
  return hasKeyword(text, ["creative", "design", "brand", "content", "ux", "product"]);
}

function parseStrategySignal(text: string) {
  return hasKeyword(text, ["strategy", "strategic", "roadmap", "planning"]);
}

export function deriveStrategicInsights(
  input: InsightInput
): InsightDetails {
  const source = `${input.title} ${input.company} ${input.description}`.toLowerCase();
  const highPay = parseCompensationSignal(input.salary);
  const autonomy = parseAutonomySignal(source);
  const leadership = parseLeadershipSignal(source);
  const systems = parseSystemsSignal(source);
  const creative = parseCreativeSignal(source);
  const strategy = parseStrategySignal(source);

  let insight = "Fast-fit tactical alignment with premium operational upside.";
  if (systems && autonomy) {
    insight = "Strong systems-thinking alignment with high autonomy signals.";
  } else if (creative && highPay) {
    insight = "High compensation and strong creative scope, but execution may be process-heavy.";
  } else if (leadership && strategy) {
    insight = "Excellent transitional opportunity with leadership growth and strategic visibility.";
  } else if (creative) {
    insight = "Creative flexibility appears limited despite strong salary.";
  } else if (highPay) {
    insight = "High compensation but likely heavy meeting load.";
  }

  const risks = highPay
    ? "Higher pay often comes with heavier coordination and meeting load."
    : autonomy
    ? "Flexible execution is likely, but accountability may feel intense."
    : systems
    ? "Strong systems focus may mean process and compliance pressure."
    : "Requires fast adaptation to shifting team priorities.";

  const strengths = leadership
    ? "Clear leadership runway and strategic visibility in the role."
    : systems
    ? "Robust technical and systems thinking fit are evident."
    : creative
    ? "Creative and product-oriented thinking should land well here."
    : "Solid tactical alignment with reliable execution signals.";

  const growthPotential = strategy
    ? "Meaningful growth through strategy, planning, and cross-functional influence."
    : leadership
    ? "Strong chance for career advancement through team and project ownership."
    : autonomy
    ? "Independent delivery could accelerate your uptake and impact."
    : "Good runway for learning and moving into broader ownership.";

  return {
    insight,
    risks,
    strengths,
    growthPotential,
  };
}
