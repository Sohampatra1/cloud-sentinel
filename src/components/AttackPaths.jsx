'use client';
import { AlertTriangle, Zap, Target } from 'lucide-react';

const RISK_STYLES = {
  CRITICAL: { border: 'border-red-500/20', bg: 'bg-red-500/5', badge: 'bg-red-500/15 text-red-400', icon: 'text-red-400' },
  HIGH: { border: 'border-orange-500/20', bg: 'bg-orange-500/5', badge: 'bg-orange-500/15 text-orange-400', icon: 'text-orange-400' },
  MEDIUM: { border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', badge: 'bg-yellow-500/15 text-yellow-400', icon: 'text-yellow-400' },
};

export default function AttackPaths({ paths = [] }) {
  if (!paths || paths.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-900/80 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          <p className="text-[13px] font-medium text-slate-400">Attack Paths</p>
        </div>
        <p className="text-sm text-slate-600 text-center py-8">Run a scan to discover attack chains</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-900/80 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Zap className="w-4 h-4 text-amber-400" />
        <p className="text-[13px] font-medium text-slate-400">Attack Paths</p>
        <span className="ml-auto text-[11px] text-slate-600 tabular-nums">{paths.length} chains identified</span>
      </div>
      <div className="space-y-4">
        {paths.map((path, i) => {
          const style = RISK_STYLES[path.risk_level] || RISK_STYLES.MEDIUM;
          return (
            <div
              key={i}
              className={`rounded-xl border ${style.border} ${style.bg} p-4 transition-all hover:bg-opacity-10`}
            >
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className={`w-4 h-4 mt-0.5 ${style.icon} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-[14px] font-semibold text-white truncate">{path.name}</h4>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${style.badge} shrink-0`}>
                      {path.risk_level}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400 leading-relaxed">{path.narrative}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-7 mt-2">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3 h-3 text-slate-500" />
                  <span className="text-[11px] text-slate-500">Impact: {path.business_impact}</span>
                </div>
              </div>

              {path.mitigation_priority && (
                <div className="ml-7 mt-2 inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/15 rounded-lg px-2.5 py-1">
                  <span className="text-[11px] text-blue-400 font-medium">{path.mitigation_priority}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
