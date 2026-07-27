import { RotateCcw } from "lucide-react";
import type { DiscoverySession, DiscoveryStage } from "../engine/discoveryState";
import Button from "../components/lighthouse/Button";
import Card from "../components/lighthouse/Card";
import LPIdentifier from "../components/lighthouse/LPIdentifier";
import ProfileReview from "../components/lighthouse/ProfileReview";

type LighthouseProfilePageProps = {
  session: DiscoverySession;
  onNavigate: (stage: DiscoveryStage) => void;
};

export default function LighthouseProfilePage({ session, onNavigate }: LighthouseProfilePageProps) {
  return (
    <div className="profile-layout">
      <Card className="profile-intro">
        <div>
          <p className="eyebrow">Human Clarity Profile Preview</p>
          <h1>A versioned discovery artifact, not the person.</h1>
          <p>
            This profile presents discovered information, not a judgment. The participant remains the authority.
          </p>
          <Button variant="secondary" icon={<RotateCcw size={17} />} onClick={() => onNavigate("session")}>
            Return to Discovery
          </Button>
        </div>
        <LPIdentifier />
      </Card>
      <ProfileReview messages={session.messages} materials={session.materials} />
    </div>
  );
}

