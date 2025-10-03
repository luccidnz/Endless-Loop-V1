import React from 'react';
import { useLoopStore } from '../store/useLoopStore';

interface SpinnerProps {
  message?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message }) => {
  const progress = useLoopStore((s) => s.progress);

  return (
    <div className="fixed inset-0 bg-cosmic-blue bg-opacity-80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div className="relative h-40 w-40">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            className="text-deep-purple"
            strokeWidth="5"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
          />
          <circle
            className="text-star-gold animate-subtleGlow"
            strokeWidth="5"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={2 * Math.PI * 45 * (1 - progress / 100)}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
            style={{transition: 'stroke-dashoffset 0.3s ease-out', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-glow-cyan">
          {Math.round(progress)}%
        </div>
      </div>
      {message && <p className="text-glow-cyan text-lg mt-8 text-center max-w-sm">{message}</p>}
    </div>
  );
};

export default Spinner;
