import { ArrowRight, ShieldCheck } from "lucide-react";
import type { DiscoveryStage } from "../engine/discoveryState";
import AliceOrb from "../components/lighthouse/AliceOrb";
import Button from "../components/lighthouse/Button";
import Card from "../components/lighthouse/Card";

type ThresholdPageProps = {
  onNavigate: (stage: DiscoveryStage) => void;
};

export default function ThresholdPage({ onNavigate }: ThresholdPageProps) {
  return (
    <div className="threshold-page">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Project Lighthouse</p>
          <h1>
            You are more than a <span>résumé.</span>
          </h1>
          <p className="lead">
            Lighthouse helps you create a clearer explanation of how you think, work, solve problems, and create value so
            you are not limited to what a résumé can show.
          </p>
          <div className="promise-row">
            <ShieldCheck size={20} />
            <p>
              Participant Discovery is free for all participants.
              <br />
              It will always be free.
            </p>
          </div>
          <div className="hero-actions">
            <Button icon={<ArrowRight size={18} />} onClick={() => onNavigate("access")}>
              Create Your Discovery Access
            </Button>
            <Button variant="secondary" onClick={() => onNavigate("access")}>
              Sign In
            </Button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <AliceOrb size="large" state="calm" />
          <div className="lighthouse-beam" />
        </div>
      </section>
      <Card className="next-card">
        <h2>What happens next?</h2>
        <p>
          You'll create private access, choose what materials to share, and begin a guided Discovery session with Alice.
          The goal is to help describe how you think, learn, solve problems, communicate, and work best.
        </p>
      </Card>
    </div>
  );
}
