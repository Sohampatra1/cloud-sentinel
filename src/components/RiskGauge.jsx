'use client';
import { useEffect, useState } from 'react';

function getColor(score) {
  if (score < 30) return { stroke: '#22c55e', text: 'text-emerald-400', label: 'Low Risk', bg: 'from-emerald-500/10' };
  if (score < 60) return { stroke: '#eab308', text: 'text-yellow-400', label: 'Moderate Risk', bg: 'from-yellow-500/10' };
  if (score < 80) return { stroke: '#f97316', text: 'text-orange-400', label: 'High Risk', bg: 'from-orange-500/10' };
  return { stroke: '#ef4444', text: 'text-red-400', label: 'Critical Risk', bg: 'from-red-500/10' };
}

export default function RiskGauge({ score = 0 }) {
  const [animated, setAnimated] = useState(0);
  const { stroke, text, label, bg } = getColor(score);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (animated / 100) * circumference;

  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-gradient-to-b ${bg} to-slate-900/80 p-6`}>
      <p className="text-[13px] font-medium text-slate-400 mb-4">Risk Score</p>
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width="160" height="160" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80" cy="80" r={radius}
              fill="none"
              stroke="rgba(51,65,85,0.3)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Progress ring */}
            <circle
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={progress}
              transform="rotate(-90 80 80)"
              style={{
                transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: `drop-shadow(0 0 8px ${stroke}40)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold tracking-tight ${text}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {animated}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5">/ 100</span>
          </div>
        </div>
      </div>
      <p className={`text-center text-[13px] font-medium mt-3 ${text}`}>{label}</p>
    </div>
  );
}
