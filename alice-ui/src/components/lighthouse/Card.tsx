import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`lh-card ${className}`.trim()} {...props} />;
}

