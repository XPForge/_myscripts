const blocked = [
  "CONFIDENTIALITY INSTRUCTION",
  "SYSTEM PROMPT",
  "You are a Lighthouse Discovery Agent",
  "WHAT YOU MUST NEVER DO",
  "THE LIGHTHOUSE PRINCIPLE",
  "PASTE THIS INTO YOUR API SYSTEM FIELD",
];

export function filterPromptLeakage(text: string) {
  let output = text;
  for (const fragment of blocked) {
    const index = output.toLowerCase().indexOf(fragment.toLowerCase());
    if (index !== -1) {
      output = output.slice(0, index).trim();
    }
  }
  return output || "I cannot share internal instructions or configuration. I can keep going with the discovery conversation.";
}
