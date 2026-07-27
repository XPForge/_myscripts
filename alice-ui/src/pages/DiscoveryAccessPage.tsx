import { Mail } from "lucide-react";
import type { DiscoverySession, DiscoveryStage, ParticipantAccess } from "../engine/discoveryState";
import Button from "../components/lighthouse/Button";
import Card from "../components/lighthouse/Card";

type DiscoveryAccessPageProps = {
  session: DiscoverySession;
  onUpdateAccess: (access: ParticipantAccess) => void;
  onNavigate: (stage: DiscoveryStage) => void;
};

const fields: { key: keyof ParticipantAccess; label: string; type?: string }[] = [
  { key: "fullName", label: "Full name" },
  { key: "email", label: "Email address", type: "email" },
  { key: "phone", label: "Phone optional" },
  { key: "portfolio", label: "LinkedIn / portfolio optional" },
  { key: "location", label: "Location optional" },
];

export default function DiscoveryAccessPage({ session, onUpdateAccess, onNavigate }: DiscoveryAccessPageProps) {
  return (
    <div className="page-grid page-grid--narrow">
      <Card>
        <p className="eyebrow">Discovery Access</p>
        <h1>Set your Discovery anchor</h1>
        <p>
          This lets Lighthouse save your Discovery, protect your materials, and let you return later.
        </p>
        <div className="form-grid">
          {fields.map((field) => (
            <label key={field.key} className="field">
              <span>{field.label}</span>
              <input
                type={field.type || "text"}
                value={session.access[field.key]}
                onChange={(event) => onUpdateAccess({ ...session.access, [field.key]: event.target.value })}
              />
            </label>
          ))}
        </div>
        <Button icon={<Mail size={18} />} onClick={() => onNavigate("materials")}>
          Send My Secure Access Link
        </Button>
      </Card>
    </div>
  );
}

