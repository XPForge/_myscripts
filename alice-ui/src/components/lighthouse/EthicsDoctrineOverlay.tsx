import { X } from "lucide-react";
import Button from "./Button";

type EthicsDoctrineOverlayProps = {
  open: boolean;
  onClose: () => void;
};

const doctrineItems = [
  "We do not score human worth.",
  "We do not rank people as more or less valuable.",
  "We do not treat a profile as the total person.",
  "We do not sell hidden participant vulnerability.",
  "We do not let employers control participant identity.",
  "We preserve participant authority.",
  "We use evidence, context, and open questions instead of false certainty.",
];

export default function EthicsDoctrineOverlay({ open, onClose }: EthicsDoctrineOverlayProps) {
  if (!open) return null;

  return (
    <div className="ethics-overlay" role="dialog" aria-modal="false" aria-label="Project Lighthouse Ethics Doctrine">
      <div className="ethics-overlay__header">
        <div>
          <p className="eyebrow">Project Lighthouse</p>
          <h2>Ethics Doctrine</h2>
        </div>
        <Button variant="ghost" icon={<X size={18} />} onClick={onClose} aria-label="Close ethics doctrine">
          Close
        </Button>
      </div>
      <div className="ethics-overlay__body">
        <p>Lighthouse exists to help people become more accurately understood.</p>
        <p>
          We do not believe a person should be reduced to a résumé, keyword list, job title, personality type,
          compatibility score, or hidden ranking.
        </p>
        <h3>Discovery comes first.</h3>
        <ul>
          {doctrineItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>The profile is a representation. The participant remains the authority.</p>
        <p>Lighthouse informs decisions. Humans decide.</p>
        <p className="doctrine-line">Lighthouse must never make people smaller in order to make them easier to process.</p>
      </div>
    </div>
  );
}
