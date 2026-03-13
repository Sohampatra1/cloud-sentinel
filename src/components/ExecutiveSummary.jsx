'use client';
import { useState } from 'react';
import { FileText, Copy, Check, Star } from 'lucide-react';

const MATURITY_COLORS = {
  Initial: 'text-red-400 bg-red-500/10',
  Developing: 'text-orange-400 bg-orange-500/10',
  Defined: 'text-yellow-400 bg-yellow-500/10',
  Managed: 'text-emerald-400 bg-emerald-500/10',
  Optimized: 'text-blue-400 bg-blue-500/10',
};

export default function ExecutiveSummary({ report }) {
  const [copied, setCopied] = useState(false);

  if (!report || !report.executive_summary) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-900/80 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-blue-400" />
          <p className="text-[13px] font-medium text-slate-400">Executive Summary</p>
        </div>
        <p className="text-sm text-slate-600 text-center py-8">Run a scan to generate an executive report</p>
      </div>
    );
  }

  const handleCopy = () => {
    const text = [
      'EXECUTIVE SUMMARY',
      report.executive_summary,
      '',
      'KEY RISKS',
      ...(report.key_risks || []).map(r => `- ${r.risk}: ${r.business_impact} (${r.urgency})`),
      '',
      'RECOMMENDATIONS',
      ...(report.recommendations || []).map((r, i) => `${i + 1}. ${r.action} — ${r.timeline} (${r.owner})`),
      '',
      `Maturity Rating: ${report.maturity_rating}`,
      '',
      report.next_steps,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maturityStyle = MATURITY_COLORS[report.maturity_rating] || 'text-slate-400 bg-slate-500/10';

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-900/80 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <p className="text-[13px] font-medium text-slate-400">Executive Summary</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${maturityStyle}`}>
            <Star className="w-3 h-3" />
            {report.maturity_rating}
          </span>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-line">
          {report.executive_summary}
        </div>

        {report.key_risks?.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2">Key Risks</p>
            <div className="space-y-2">
              {report.key_risks.map((r, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-slate-950/40 border border-white/[0.03] p-3">
                  <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    r.urgency === 'immediate' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'
                  }`}>
                    {r.urgency?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-slate-200 font-medium">{r.risk}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">{r.business_impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.recommendations?.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2">Recommendations</p>
            <div className="space-y-1.5">
              {report.recommendations.map((r, i) => (
                <div key={i} className="flex items-baseline gap-2 text-[12px]">
                  <span className="text-blue-400 font-semibold shrink-0">{i + 1}.</span>
                  <span className="text-slate-300">{r.action}</span>
                  <span className="text-slate-600 shrink-0">— {r.timeline}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.compliance_gaps?.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2">Compliance Gaps</p>
            <div className="flex flex-wrap gap-1.5">
              {report.compliance_gaps.map((gap, i) => (
                <span key={i} className="inline-flex px-2.5 py-1 rounded-lg bg-red-500/8 border border-red-500/15 text-[11px] text-red-400">
                  {gap}
                </span>
              ))}
            </div>
          </div>
        )}

        {report.next_steps && (
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-3">
            <p className="text-[11px] uppercase tracking-wider text-blue-400 font-medium mb-1">Next Steps</p>
            <p className="text-[12px] text-slate-300 leading-relaxed">{report.next_steps}</p>
          </div>
        )}
      </div>
    </div>
  );
}
