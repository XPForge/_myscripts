import { CheckCircle2, Circle, Search } from "lucide-react";

const statuses = [
  ["Reading materials", "Prepared"],
  ["Extracting useful text", "Prepared"],
  ["Identifying source claims", "In progress"],
  ["Finding possible patterns", "In progress"],
  ["Preparing open questions", "Open question detected"],
  ["Building Alice briefing", "Needs confirmation later"],
] as const;

export default function PreparationStatus() {
  return (
    <div className="prep-status">
      {statuses.map(([label, state], index) => (
        <div key={label} className="prep-status__row">
          {index < 2 ? <CheckCircle2 size={18} /> : index < 4 ? <Search size={18} /> : <Circle size={18} />}
          <span>{label}</span>
          <strong>{state}</strong>
        </div>
      ))}
    </div>
  );
}

