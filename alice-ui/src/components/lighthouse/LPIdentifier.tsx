export default function LPIdentifier() {
  const rings = Array.from({ length: 7 }, (_, index) => index);
  const nodes = Array.from({ length: 18 }, (_, index) => index);

  return (
    <div className="lp-identifier" aria-label="Lightprint identifier signal mark">
      {rings.map((ring) => (
        <div key={ring} className="lp-identifier__ring" style={{ inset: `${ring * 8 + 12}px` }} />
      ))}
      {nodes.map((node) => (
        <span
          key={node}
          className="lp-identifier__node"
          style={{
            transform: `rotate(${node * 21}deg) translateX(${34 + (node % 5) * 15}px)`,
          }}
        />
      ))}
      <div className="lp-identifier__print" />
    </div>
  );
}

