import { profileSectionTitles } from "./profileSections";
import type { ConversationMessage, MaterialItem } from "./discoveryState";

export function generateProfileSections(messages: ConversationMessage[], materials: MaterialItem[]) {
  const participantText = messages
    .filter((message) => message.role === "participant")
    .map((message) => message.content)
    .join(" ");
  const evidenceCount = materials.filter((item) => item.selected).length;
  const hasConversation = participantText.trim().length > 0;

  return profileSectionTitles.map((title) => ({
    title,
    body: hasConversation
      ? buildSectionText(title, evidenceCount)
      : "Discovery has started, but this section needs more participant context before it can be described responsibly.",
  }));
}

function buildSectionText(title: string, evidenceCount: number) {
  if (title === "Open Questions") {
    return "These items should remain open until the participant confirms them directly in Discovery.";
  }
  if (title === "Potential Blind Spots") {
    return "This section is held as context to explore, not as a flaw or grade. It should only include patterns the participant has had a chance to review.";
  }
  return `Drafted from conversation context and ${evidenceCount} shared source material${evidenceCount === 1 ? "" : "s"}. This is a representation to review, refine, and version with the participant.`;
}

