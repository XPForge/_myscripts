export type AliceStatus = "listening" | "speaking" | "thinking" | "loading";

export function AliceStatusWaveform({ status, compact = false }: { status: AliceStatus; compact?: boolean }) {
  return (
    <span className={`alice-wave alice-wave--${status} ${compact ? "alice-wave--compact" : ""}`} aria-hidden="true">
      {Array.from({ length: compact ? 8 : 18 }, (_, index) => <i key={index} style={{ "--bar": index } as React.CSSProperties} />)}
    </span>
  );
}

export default function AliceAvatar({ status = "listening", size = "md" }: { status?: AliceStatus; size?: "sm" | "md" | "lg" }) {
  const equalizerHeights = [8, 17, 29, 42, 55, 69, 100, 69, 55, 42, 29, 17, 8];
  return (
    <span className={`alice-avatar alice-avatar--${size} alice-avatar--${status}`} role="img" aria-label={`Alice is ${status}`}>
      <span className="alice-avatar__ring" />
      <span className="alice-avatar__glow" />
      <span className="alice-avatar__inner-ring" />
      <span className="alice-avatar__equalizer" aria-hidden="true">
        {equalizerHeights.map((height, index) => <i key={index} style={{ "--eq-index": index, "--eq-height": `${height}%` } as React.CSSProperties} />)}
      </span>
    </span>
  );
}

export function AliceStatusLegend() {
  return <div className="status-legend">{(["listening", "speaking", "thinking", "loading"] as AliceStatus[]).map(status => <div key={status}><span className={`legend-dot legend-dot--${status}`} /><span>{status}</span><AliceStatusWaveform status={status} compact /></div>)}</div>;
}
