import { openingDiscoveryMessage } from "./discoveryPrompt";

export type AliceOrbState = "calm" | "happy" | "thoughtful" | "concerned";
export type DiscoveryStage =
  | "threshold"
  | "access"
  | "materials"
  | "preparing"
  | "ready"
  | "session"
  | "profile";
export type ConversationRole = "alice" | "participant";

export type ConversationMessage = {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt: string;
};

export type MaterialItem = {
  id: string;
  label: string;
  detail: string;
  selected: boolean;
};

export type ParticipantAccess = {
  fullName: string;
  email: string;
  phone: string;
  portfolio: string;
  location: string;
};

export type DiscoverySession = {
  stage: DiscoveryStage;
  access: ParticipantAccess;
  materials: MaterialItem[];
  messages: ConversationMessage[];
  notes: string[];
  captions: boolean;
  mode: "Voice" | "Text" | "Voice + Text";
  preferredVoice: string;
  paused: boolean;
};

const materialLabels = [
  "Upload résumé",
  "Paste résumé text",
  "LinkedIn / portfolio link",
  "Work samples",
  "Certifications",
  "Military record / service summary",
  "Personal notes",
  "Other artifact",
];

export function createInitialDiscoverySession(): DiscoverySession {
  return {
    stage: "threshold",
    access: {
      fullName: "",
      email: "",
      phone: "",
      portfolio: "",
      location: "",
    },
    materials: materialLabels.map((label, index) => ({
      id: `material-${index}`,
      label,
      detail: "",
      selected: index < 2,
    })),
    messages: [
      {
        id: "alice-opening",
        role: "alice",
        content: openingDiscoveryMessage,
        createdAt: new Date().toISOString(),
      },
    ],
    notes: [
      "What connects the participant's examples?",
      "Where did useful context appear outside formal titles?",
      "Which source claims need participant confirmation?",
    ],
    captions: true,
    mode: "Voice + Text",
    preferredVoice: "Cedar",
    paused: false,
  };
}
