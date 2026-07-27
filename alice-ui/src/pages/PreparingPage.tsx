import { ArrowRight } from "lucide-react";
import type { DiscoveryStage } from "../engine/discoveryState";
import Button from "../components/lighthouse/Button";
import Card from "../components/lighthouse/Card";
import LPIdentifier from "../components/lighthouse/LPIdentifier";
import PreparationStatus from "../components/lighthouse/PreparationStatus";

type PreparingPageProps = {
  onNavigate: (stage: DiscoveryStage) => void;
};

export default function PreparingPage({ onNavigate }: PreparingPageProps) {
  return (
    <div className="page-grid">
      <Card>
        <p className="eyebrow">Preparing Discovery</p>
        <h1>Preparing your Discovery</h1>
        <p>Lighthouse is reading shared materials and preparing open questions.</p>
        <PreparationStatus />
        <Button icon={<ArrowRight size={18} />} onClick={() => onNavigate("ready")}>
          Continue to Ready Room
        </Button>
      </Card>
      <Card className="signal-card">
        <LPIdentifier />
      </Card>
    </div>
  );
}

