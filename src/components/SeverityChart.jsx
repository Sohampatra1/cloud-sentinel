'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#ef4444', label: 'Critical' },
  HIGH: { color: '#f97316', label: 'High' },
  MEDIUM: { color: '#eab308', label: 'Medium' },
  LOW: { color: '#22c55e', label: 'Low' },
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const d = payload[0];
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm border border-white/[0.08] rounded-xl px-3 py-2 shadow-xl">
        <p className="text-[12px] font-medium text-white">{d.name}: {d.value}</p>
      </div>
    );
  }
  return null;
};

export default function SeverityChart({ counts = {} }) {
  const data = Object.entries(SEVERITY_CONFIG)
    .map(([key, config]) => ({
      name: config.label,
      value: counts[key] || 0,
      color: config.color,
    }))
    .filter(d => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-900/80 p-6">
        <p className="text-[13px] font-medium text-slate-400 mb-4">Severity Breakdown</p>
        <div className="flex items-center justify-center h-[180px] text-slate-600 text-sm">
          No findings yet
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-900/80 p-6">
      <p className="text-[13px] font-medium text-slate-400 mb-4">Severity Breakdown</p>
      <div className="flex items-center gap-4">
        <div className="w-[140px] h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={62}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-[12px] text-slate-400">{d.name}</span>
              <span className="text-[12px] font-semibold text-slate-200 ml-auto tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
