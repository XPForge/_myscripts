import { Mic, Pause, Play, Subtitles, Volume2 } from "lucide-react";
import type { DiscoverySession } from "../../engine/discoveryState";
import Button from "./Button";

type VoiceControlsProps = {
  session: DiscoverySession;
  onChange: (updates: Partial<DiscoverySession>) => void;
  compact?: boolean;
};

const modes = ["Voice", "Text", "Voice + Text"] as const;
const voices = ["Cedar", "Marin", "Vale"] as const;

export default function VoiceControls({ session, onChange, compact = false }: VoiceControlsProps) {
  return (
    <div className={compact ? "voice-controls voice-controls--compact" : "voice-controls"}>
      <div className="segmented-control" aria-label="Discovery mode">
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            className={session.mode === mode ? "is-active" : ""}
            onClick={() => onChange({ mode })}
          >
            {mode}
          </button>
        ))}
      </div>
      <label className="field field--inline">
        <Volume2 size={17} />
        <span>Preferred voice</span>
        <select value={session.preferredVoice} onChange={(event) => onChange({ preferredVoice: event.target.value })}>
          {voices.map((voice) => (
            <option key={voice}>{voice}</option>
          ))}
        </select>
      </label>
      <label className="toggle-row">
        <input type="checkbox" checked={session.captions} onChange={(event) => onChange({ captions: event.target.checked })} />
        <Subtitles size={17} />
        <span>Captions</span>
      </label>
      <Button variant="secondary" icon={<Mic size={17} />} type="button">
        Microphone test
      </Button>
      <Button
        variant="ghost"
        icon={session.paused ? <Play size={17} /> : <Pause size={17} />}
        type="button"
        onClick={() => onChange({ paused: !session.paused })}
      >
        {session.paused ? "Resume" : "Pause"}
      </Button>
    </div>
  );
}

