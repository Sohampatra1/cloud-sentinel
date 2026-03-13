'use client';
import { History, TrendingDown, TrendingUp, Minus, Eye } from 'lucide-react';

function TrendIcon({ current, previous }) {
  if (previous == null) return <Minus className="w-3.5 h-3.5 text-slate-600" />;
  if (current < previous) return <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />;
  if (current > previous) return <TrendingUp className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-600" />;
}

export default function ScanHistory({ scans = [], onViewScan }) {
  if (scans.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-900/80 p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-slate-500" />
          <p className="text-[13px] font-medium text-slate-400">Scan History</p>
        </div>
        <p className="text-sm text-slate-600 text-center py-6">No previous scans</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-900/80 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-white/[0.04]">
        <History className="w-4 h-4 text-slate-500" />
        <p className="text-[13px] font-medium text-slate-400">Scan History</p>
        <span className="ml-auto text-[11px] text-slate-600 tabular-nums">{scans.length} scans</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="text-left p-3 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Date</th>
              <th className="text-left p-3 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Risk</th>
              <th className="text-left p-3 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Trend</th>
              <th className="text-left p-3 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Findings</th>
              <th className="text-left p-3 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Crit</th>
              <th className="text-left p-3 font-medium text-slate-500 text-[10px] uppercase tracking-wider">High</th>
              <th className="text-center p-3 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan, i) => (
              <tr key={scan.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="p-3 text-slate-400 whitespace-nowrap">
                  {new Date(scan.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="p-3 tabular-nums">
                  <span className={`font-semibold ${
                    scan.riskScore >= 80 ? 'text-red-400' :
                    scan.riskScore >= 60 ? 'text-orange-400' :
                    scan.riskScore >= 30 ? 'text-yellow-400' : 'text-emerald-400'
                  }`}>
                    {scan.riskScore}
                  </span>
                </td>
                <td className="p-3">
                  <TrendIcon current={scan.riskScore} previous={scans[i + 1]?.riskScore} />
                </td>
                <td className="p-3 text-slate-300 tabular-nums">{scan.totalFindings}</td>
                <td className="p-3 text-red-400 tabular-nums">{scan.criticalCount}</td>
                <td className="p-3 text-orange-400 tabular-nums">{scan.highCount}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => onViewScan?.(scan.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
