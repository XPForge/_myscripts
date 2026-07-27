import type { AliceOrbState } from "../../engine/discoveryState";

type AliceOrbProps = {
  state?: AliceOrbState;
  size?: "small" | "medium" | "large";
};

export default function AliceOrb({ state = "calm", size = "medium" }: AliceOrbProps) {
  return (
    <div className={`alice-orb alice-orb--${state} alice-orb--${size}`} aria-label={`Alice ${state} signal`}>
      <div className="alice-orb__ring alice-orb__ring--outer" />
      <div className="alice-orb__ring alice-orb__ring--inner" />
      <div className="alice-orb__core">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

