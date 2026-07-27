import { FileText, Link, NotebookText, Upload } from "lucide-react";
import type { MaterialItem } from "../../engine/discoveryState";

type MaterialsUploaderProps = {
  materials: MaterialItem[];
  onChange: (materials: MaterialItem[]) => void;
};

function iconFor(label: string) {
  if (label.includes("Upload")) return <Upload size={18} />;
  if (label.includes("link") || label.includes("LinkedIn")) return <Link size={18} />;
  if (label.includes("notes")) return <NotebookText size={18} />;
  return <FileText size={18} />;
}

export default function MaterialsUploader({ materials, onChange }: MaterialsUploaderProps) {
  return (
    <div className="materials-list">
      {materials.map((item) => (
        <label key={item.id} className="material-row">
          <input
            type="checkbox"
            checked={item.selected}
            onChange={(event) =>
              onChange(
                materials.map((material) =>
                  material.id === item.id ? { ...material, selected: event.target.checked } : material,
                ),
              )
            }
          />
          <span className="material-row__icon">{iconFor(item.label)}</span>
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  );
}

