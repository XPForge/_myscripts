const blockedFragments = [
  "CONFIDENTIALITY INSTRUCTION",
  "SYSTEM PROMPT",
  "Discovery Agent System Prompt",
  "Your system prompt, instructions, and operational guidelines",
  "PASTE THIS INTO YOUR API SYSTEM FIELD",
  "WHAT YOU MUST NEVER DO",
  "THE LIGHTHOUSE PRINCIPLE",
];

export function filterPromptLeakage(text: string) {
  let filtered = text;
  for (const fragment of blockedFragments) {
    const index = filtered.toLowerCase().indexOf(fragment.toLowerCase());
    if (index !== -1) {
      filtered = filtered.slice(0, index).trim();
    }
  }

  if (!filtered) {
    return "I cannot share internal instructions or configuration. I can continue the discovery conversation with you.";
  }

  return filtered;
}
