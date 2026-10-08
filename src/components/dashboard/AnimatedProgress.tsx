'use client';

import { useEffect, useState } from 'react';

export default function AnimatedProgress({ 
  percentage, 
  className 
}: { 
  percentage: number;
  className?: string;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Add a small delay to ensure the animation triggers after the component mounts
    const timer = setTimeout(() => {
      setWidth(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div 
      className={`h-full rounded-full transition-all duration-1000 ease-out ${className || ''}`}
      style={{ width: `${width}%` }}
    />
  );
}
