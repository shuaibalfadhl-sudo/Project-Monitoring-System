"use client";

import React from 'react';

type PieChartProps = {
  data: { id: string; value: number; color: string }[];
  activeId?: string;
};

export default function ProjectPieChart({ data, activeId }: PieChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  
  if (total === 0) {
    return (
      <svg viewBox="-10 -10 120 120" className="w-full h-full overflow-visible">
        <circle cx="50" cy="50" r="50" fill="#f3f4f6" />
      </svg>
    );
  }

  let currentAngle = -90; // Start at 12 o'clock

  const slices = data.map((slice) => {
    if (slice.value === 0) return null;
    
    const angle = (slice.value / total) * 360;
    
    if (angle === 360) {
      return (
        <circle
          key={slice.id}
          cx="50"
          cy="50"
          r="50"
          fill={slice.color}
          style={{
            transformOrigin: '50px 50px',
            transform: activeId === slice.id ? 'scale(1.10)' : 'scale(1)',
            transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        />
      );
    }
    
    const startAngle = (currentAngle * Math.PI) / 180;
    const endAngle = ((currentAngle + angle) * Math.PI) / 180;
    
    const x1 = 50 + 50 * Math.cos(startAngle);
    const y1 = 50 + 50 * Math.sin(startAngle);
    
    const x2 = 50 + 50 * Math.cos(endAngle);
    const y2 = 50 + 50 * Math.sin(endAngle);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `Z`
    ].join(' ');
    
    currentAngle += angle;
    
    return (
      <path
        key={slice.id}
        d={pathData}
        fill={slice.color}
        style={{
          transformOrigin: '50px 50px',
          transform: activeId === slice.id ? 'scale(1.10)' : 'scale(1)',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      />
    );
  });

  return (
    <svg 
      viewBox="-10 -10 120 120" 
      className="w-full h-full overflow-visible drop-shadow-sm"
    >
      {slices}
    </svg>
  );
}
