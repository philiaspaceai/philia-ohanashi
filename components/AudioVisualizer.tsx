
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  active: boolean;
  color?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ active, color = 'black' }) => {
  const bars = Array.from({ length: 24 });
  
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {bars.map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full transition-all duration-200"
          style={{
            backgroundColor: color,
            height: active ? `${Math.random() * 100 + 10}%` : '4px',
            opacity: active ? 1 : 0.2,
          }}
        />
      ))}
    </div>
  );
};
