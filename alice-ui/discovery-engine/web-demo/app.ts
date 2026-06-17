import { runMinimalDiscoveryRuntimeSlice } from "../harness/runtimeSlice/runtimeSlice";
import type { RuntimeSliceResult } from "../harness/runtimeSlice/runtimeSliceTypes";

const inputElement = document.querySelector<HTMLTextAreaElement>("#discovery-input");
const runButton = document.querySelector<HTMLButtonElement>("#run-button");
const validationMessage = document.querySelector<HTMLElement>("#validation-message");
const summaryOutput = document.querySelector<HTMLElement>("#summary-output");
const evidenceOutput = document.querySelector<HTMLElement>("#evidence-output");
const observationOutput = document.querySelector<HTMLElement>("#observation-output");
const alignmentOutput = document.querySelector<HTMLElement>("#alignment-output");
const exportOutput = document.querySelector<HTMLElement>("#export-output");
const checksOutput = document.querySelector<HTMLElement>("#checks-output");

function requireElement<T extends Element>(element: T | null, selector: string): T {
  if (!element) {
    throw new Error(`Missing web demo element: ${selector}`);
  }

  return element;
}

const elements = {
  input: requireElement(inputElement, "#discovery-input"),
  runButton: requireElement(runButton, "#run-button"),
  validationMessage: requireElement(validationMessage, "#validation-message"),
  summaryOutput: requireElement(summaryOutput, "#summary-output"),
  evidenceOutput: requireElement(evidenceOutput, "#evidence-output"),
  observationOutput: requireElement(observationOutput, "#observation-output"),
  alignmentOutput: requireElement(alignmentOutput, "#alignment-output"),
  exportOutput: requireElement(exportOutput, "#export-output"),
  checksOutput: requireElement(checksOutput, "#checks-output"),
};

function setText(element: Element, value: string): void {
  element.textContent = value;
}

function renderDefinitionList(
  container: Element,
  rows: Array<[label: string, value: string | undefined]>
): void {
  container.replaceChildren();

  for (const [label, value] of rows) {
    const term = document.createElement("dt");
    const description = document.createElement("dd");

    term.textContent = label;
    description.textContent = value && value.length > 0 ? value : "Not created";

    container.append(term, description);
  }
}

function renderAlignmentSignals(result: RuntimeSliceResult): void {
  elements.alignmentOutput.replaceChildren();
  const signals = result.alignmentProofSignals ?? [];

  if (signals.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No metadata signals emitted";
    elements.alignmentOutput.append(item);
    return;
  }

  for (const signal of signals) {
    const item = document.createElement("li");
    item.textContent = `${signal.signalType} - ${signal.dimensionId}`;
    elements.alignmentOutput.append(item);
  }
}

function renderChecks(result: RuntimeSliceResult): void {
  elements.checksOutput.replaceChildren();

  for (const check of result.checks) {
    const item = document.createElement("li");
    const status = document.createElement("span");
    const body = document.createElement("span");
    const id = document.createElement("span");
    const message = document.createElement("span");

    item.className = `check ${check.passed ? "pass" : "fail"}`;
    status.className = "check-status";
    body.className = "check-body";
    id.className = "check-id";
    message.className = "check-message";

    status.textContent = check.passed ? "Pass" : "Fail";
    id.textContent = check.id;
    message.textContent = check.message;

    body.append(id, message);
    item.append(status, body);
    elements.checksOutput.append(item);
  }
}

function renderResult(result: RuntimeSliceResult): void {
  const session = result.workspace.sessions.find((item) => item.id === result.sessionId);
  const turn = session?.turns.find((item) => item.id === result.turnId);
  const evidenceReference = turn?.evidenceRefs.find(
    (item) => item.id === result.evidenceReferenceId
  );
  const observation = result.workspace.observations.find(
    (item) => item.id === result.observationId
  );

  renderDefinitionList(elements.summaryOutput, [
    ["Workspace ID", result.workspace.id],
    ["Module ID", result.workspace.moduleId],
    ["Schema Version", result.workspace.schemaVersion],
    ["Session ID", result.sessionId],
    ["Turn ID", result.turnId],
  ]);

  renderDefinitionList(elements.evidenceOutput, [
    ["Evidence ID", result.evidenceReferenceId],
    ["Source ID", evidenceReference?.sourceId],
    ["Turn ID", evidenceReference?.turnId],
    ["Quote", evidenceReference?.quote],
  ]);

  renderDefinitionList(elements.observationOutput, [
    ["Observation ID", result.observationId],
    ["Type", observation?.type],
    ["Inference Level", observation?.inferenceLevel],
    ["Resolution State", observation?.resolutionState],
    ["Boundary", "Deterministic demo/verification behavior only"],
  ]);

  renderAlignmentSignals(result);

  renderDefinitionList(elements.exportOutput, [
    ["Export Bundle ID", result.exportBundle?.id],
    ["Export Version", result.exportBundle?.exportBundleVersion],
    ["Artifacts", String(result.exportBundle?.artifacts.length ?? 0)],
    ["Events", String(result.exportBundle?.events.length ?? 0)],
  ]);

  renderChecks(result);
}

async function runDemo(): Promise<void> {
  const text = elements.input.value.trim();

  if (!text) {
    setText(
      elements.validationMessage,
      "Enter a little text before running the local deterministic slice."
    );
    return;
  }

  setText(elements.validationMessage, "Running deterministic local verification...");
  elements.runButton.disabled = true;

  try {
    const result = await runMinimalDiscoveryRuntimeSlice({
      text,
      sourceLabel: "Web demo local input",
      includeOpportunityFixtureProof: true,
    });

    renderResult(result);
    setText(
      elements.validationMessage,
      "Complete. This is not AI interpretation, profile generation, artifact generation, matching, scoring, or ranking."
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown local demo error";
    setText(elements.validationMessage, message);
  } finally {
    elements.runButton.disabled = false;
  }
}

elements.runButton.addEventListener("click", () => {
  void runDemo();
});
