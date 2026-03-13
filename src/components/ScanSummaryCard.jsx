'use client';
import { AlertTriangle, Globe, Clock, ShieldCheck } from 'lucide-react';

export default function ScanSummaryCard({ scan, cisCompliance }) {
  const items = [
    {
      icon: AlertTriangle,
      label: 'Total Findings',
      value: scan?.totalFindings ?? '—',
      color: 'text-orange-400',
    },
    {
      icon: Globe,
      label: 'Region',
      value: scan?.region || 'ap-south-1',
      color: 'text-blue-400',
    },
    {
      icon: Clock,
      label: 'Last Scan',
      value: scan?.timestamp
        ? new Date(scan.timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })
        : '—',
      color: 'text-slate-400',
    },
    {
      icon: ShieldCheck,
      label: 'CIS Compliance',
      value: cisCompliance != null ? `${cisCompliance}%` : '—',
      color: cisCompliance > 70 ? 'text-emerald-400' : cisCompliance > 40 ? 'text-yellow-400' : 'text-red-400',
    },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-900/80 p-6">
      <p className="text-[13px] font-medium text-slate-400 mb-4">Scan Summary</p>
      <div className="space-y-4">
        {items.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-[13px] text-slate-400">{label}</span>
            </div>
            <span className={`text-[14px] font-semibold ${color} tabular-nums`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
