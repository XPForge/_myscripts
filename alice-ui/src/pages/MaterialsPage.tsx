import { ArrowRight } from "lucide-react";
import type { DiscoverySession, DiscoveryStage, MaterialItem } from "../engine/discoveryState";
import Button from "../components/lighthouse/Button";
import Card from "../components/lighthouse/Card";
import MaterialsUploader from "../components/lighthouse/MaterialsUploader";

type MaterialsPageProps = {
  session: DiscoverySession;
  onUpdateMaterials: (materials: MaterialItem[]) => void;
  onNavigate: (stage: DiscoveryStage) => void;
};

export default function MaterialsPage({ session, onUpdateMaterials, onNavigate }: MaterialsPageProps) {
  return (
    <div className="page-grid">
      <Card>
        <p className="eyebrow">Materials Intake</p>
        <h1>Add materials for Alice to review</h1>
        <p>
          You can upload or paste anything that may help Lighthouse understand your background. These materials are not
          your profile. They help Discovery begin with better context.
        </p>
        <MaterialsUploader materials={session.materials} onChange={onUpdateMaterials} />
        <div className="action-row">
          <Button icon={<ArrowRight size={18} />} onClick={() => onNavigate("preparing")}>
            Prepare Discovery
          </Button>
          <Button variant="ghost" onClick={() => onNavigate("preparing")}>
            Skip for now
          </Button>
        </div>
      </Card>
      <Card className="context-card">
        <h2>Source evidence, not replacement</h2>
        <p>
          Uploaded artifacts are context. Alice uses them to ask better open questions, not to define or replace the
          participant.
        </p>
      </Card>
    </div>
  );
}

