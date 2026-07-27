import { ArrowRight, CheckCircle2, RotateCcw, Settings } from "lucide-react";
import type { DiscoverySession, DiscoveryStage } from "../engine/discoveryState";
import AliceOrb from "../components/lighthouse/AliceOrb";
import Button from "../components/lighthouse/Button";
import Card from "../components/lighthouse/Card";
import LPIdentifier from "../components/lighthouse/LPIdentifier";
import VoiceControls from "../components/lighthouse/VoiceControls";

type ReadyPageProps = {
  session: DiscoverySession;
  onUpdate: (updates: Partial<DiscoverySession>) => void;
  onNavigate: (stage: DiscoveryStage) => void;
};

const readyItems = ["Privacy active", "Materials prepared", "Alice ready", "You can pause anytime"];

export default function ReadyPage({ session, onUpdate, onNavigate }: ReadyPageProps) {
  return (
    <div className="ready-layout">
      <Card className="ready-primary">
        <p className="eyebrow">Ready Room</p>
        <h1>You're ready to begin</h1>
        <div className="ready-signals">
          <AliceOrb size="medium" state="happy" />
          <LPIdentifier />
        </div>
        <blockquote>
          I've reviewed the materials you shared. I won't treat them as the whole story. I'll use them to ask better
          questions and help bring the person behind the materials into clearer view.
        </blockquote>
        <VoiceControls session={session} onChange={onUpdate} />
        <Button icon={<ArrowRight size={18} />} onClick={() => onNavigate("session")}>
          Begin Discovery
        </Button>
      </Card>
      <Card>
        <h2>Session checks</h2>
        <div className="check-list">
          {readyItems.map((item) => (
            <div key={item}>
              <CheckCircle2 size={18} />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="stacked-actions">
          <Button variant="secondary" icon={<RotateCcw size={17} />} onClick={() => onNavigate("materials")}>
            Add More Materials
          </Button>
          <Button variant="secondary" icon={<Settings size={17} />} type="button">
            Change Settings
          </Button>
          <Button variant="ghost" onClick={() => onNavigate("threshold")}>
            Return Later
          </Button>
        </div>
      </Card>
    </div>
  );
}

