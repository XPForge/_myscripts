export function SingleProgressRing({ percentage, label }: { percentage: number; label: string }) {
  const size = 140;
  const center = size / 2;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, percentage)) / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${percentage} percent.`}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth={12} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#a78bfa"
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text x={center} y={center - 2} textAnchor="middle" fontSize="24" fontWeight={800} fill="#f8fafc">
        {percentage}%
      </text>
      <text x={center} y={center + 20} textAnchor="middle" fontSize="10" fill="#c4b5fd">
        {label}
      </text>
    </svg>
  );
}

export function ConcentricProgressRings({
  outerPercentage,
  innerPercentage,
}: {
  outerPercentage: number;
  innerPercentage: number;
}) {
  const size = 140;
  const center = size / 2;
  const outerRadius = 58;
  const innerRadius = 40;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const outerOffset = outerCircumference * (1 - Math.min(100, Math.max(0, outerPercentage)) / 100);
  const innerOffset = innerCircumference * (1 - Math.min(100, Math.max(0, innerPercentage)) / 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Schema coverage ${outerPercentage} percent. Profile readiness ${innerPercentage} percent.`}
    >
      <circle cx={center} cy={center} r={outerRadius} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth={10} />
      <circle
        cx={center}
        cy={center}
        r={outerRadius}
        fill="none"
        stroke="#38bdf8"
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={outerCircumference}
        strokeDashoffset={outerOffset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <circle cx={center} cy={center} r={innerRadius} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={9} />
      <circle
        cx={center}
        cy={center}
        r={innerRadius}
        fill="none"
        stroke="#a78bfa"
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={innerCircumference}
        strokeDashoffset={innerOffset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text x={center} y={center - 2} textAnchor="middle" fontSize="22" fontWeight={800} fill="#f8fafc">
        {outerPercentage}%
      </text>
      <text x={center} y={center + 18} textAnchor="middle" fontSize="10" fill="#c4b5fd">
        profile {innerPercentage}%
      </text>
    </svg>
  );
}
