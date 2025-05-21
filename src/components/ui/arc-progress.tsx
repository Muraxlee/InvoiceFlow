
"use client";

import * as React from 'react';

interface ArcProgressProps {
  percentage: number; // 0-100
  color: string; // e.g., "hsl(var(--primary))"
  size?: number;
  strokeWidth?: number;
  backgroundColor?: string; // e.g., "hsl(var(--muted))"
}

const ArcProgress: React.FC<ArcProgressProps> = ({
  percentage,
  color,
  size = 40,
  strokeWidth = 4,
  backgroundColor = "hsl(var(--muted))",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 transform">
      <circle
        stroke={backgroundColor}
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: offset,
        }}
      />
    </svg>
  );
};

export default ArcProgress;
