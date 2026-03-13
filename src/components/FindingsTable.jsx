'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal, Loader2, Filter, Copy, Check } from 'lucide-react';

const SEVERITY_STYLES = {
  CRITICAL: 'bg-red-500/15 text-red-400 border border-red-500/20',
  HIGH: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  MEDIUM: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  LOW: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  INFO: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
};

const CATEGORIES = ['ALL', 'IAM', 'S3', 'EC2', 'CloudTrail', 'VPC', 'KMS'];
const SEVERITIES = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded-md hover:bg-white/[0.06] transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
    </button>
  );
}

export default function FindingsTable({ findings = [], onFilter }) {
  const [expanded, setExpanded] = useState(null);
  const [remediation, setRemediation] = useState({});
  const [loadingRem, setLoadingRem] = useState(null);
  const [severity, setSeverity] = useState('ALL');
  const [category, setCategory] = useState('ALL');

  const handleFilter = (newSev, newCat) => {
    setSeverity(newSev);
    setCategory(newCat);
    onFilter?.(newSev, newCat);
  };

  const toggleRow = (id) => {
    setExpanded(expanded === id ? null : id);
  };

  const fetchRemediation = async (findingId) => {
    if (remediation[findingId]) return;
    setLoadingRem(findingId);
    try {
      const res = await fetch(`/api/remediate/${findingId}`, { method: 'POST' });
      const data = await res.json();
      setRemediation(prev => ({ ...prev, [findingId]: data.remediation }));
    } catch (e) {
      console.error('Remediation error:', e);
    } finally {
      setLoadingRem(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-900/80 overflow-hidden">
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-white/[0.04]">
        <Filter className="w-4 h-4 text-slate-500" />
        <select
          value={severity}
          onChange={(e) => handleFilter(e.target.value, category)}
          className="bg-slate-800/60 border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-slate-300 outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
        >
          {SEVERITIES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Severities' : s}</option>)}
        </select>
        <select
          value={category}
          onChange={(e) => handleFilter(severity, e.target.value)}
          className="bg-slate-800/60 border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-slate-300 outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>)}
        </select>
        <span className="ml-auto text-[12px] text-slate-500 tabular-nums">{findings.length} findings</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="w-8 p-3"></th>
              <th className="text-left p-3 font-medium text-slate-500 text-[11px] uppercase tracking-wider">Severity</th>
              <th className="text-left p-3 font-medium text-slate-500 text-[11px] uppercase tracking-wider">Category</th>
              <th className="text-left p-3 font-medium text-slate-500 text-[11px] uppercase tracking-wider">Finding</th>
              <th className="text-left p-3 font-medium text-slate-500 text-[11px] uppercase tracking-wider">Resource</th>
              <th className="text-left p-3 font-medium text-slate-500 text-[11px] uppercase tracking-wider">CIS</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <RowGroup
                key={f.id}
                finding={f}
                isExpanded={expanded === f.id}
                onToggle={() => toggleRow(f.id)}
                remediation={remediation[f.id]}
                loadingRem={loadingRem === f.id}
                onRemediate={() => fetchRemediation(f.id)}
              />
            ))}
            {findings.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-600 text-sm">
                  No findings to display. Run a scan to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowGroup({ finding: f, isExpanded, onToggle, remediation, loadingRem, onRemediate }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors group"
      >
        <td className="p-3">
          {isExpanded
            ? <ChevronDown className="w-4 h-4 text-slate-500" />
            : <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
          }
        </td>
        <td className="p-3">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${SEVERITY_STYLES[f.severity]}`}>
            {f.severity}
          </span>
        </td>
        <td className="p-3 text-slate-400">{f.category}</td>
        <td className="p-3 text-slate-200 font-medium max-w-[300px] truncate">{f.title}</td>
        <td className="p-3 text-slate-500 font-mono text-[11px] max-w-[200px] truncate">{f.resource}</td>
        <td className="p-3 text-slate-500">{f.cisBenchmark}</td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-900/40">
          <td colSpan={6} className="p-5">
            <div className="space-y-4 max-w-3xl">
              <p className="text-[13px] text-slate-300 leading-relaxed">{f.description}</p>

              {!remediation && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemediate(); }}
                  disabled={loadingRem}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-medium
                    bg-blue-500/10 text-blue-400 border border-blue-500/20
                    hover:bg-blue-500/20 transition-all disabled:opacity-50"
                >
                  {loadingRem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                  {loadingRem ? 'Generating...' : 'Get AI Remediation'}
                </button>
              )}

              {remediation && (
                <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
                  <div className="rounded-xl bg-slate-950/60 border border-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2">Risk Explanation</p>
                    <p className="text-[13px] text-slate-300 leading-relaxed">{remediation.risk_explanation}</p>
                  </div>

                  <div className="rounded-xl bg-slate-950/60 border border-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2">Steps</p>
                    <ol className="list-decimal list-inside space-y-1">
                      {(remediation.steps || []).map((s, i) => (
                        <li key={i} className="text-[13px] text-slate-300">{s}</li>
                      ))}
                    </ol>
                  </div>

                  {remediation.aws_cli_commands?.length > 0 && (
                    <div className="rounded-xl bg-slate-950/60 border border-white/[0.04] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">AWS CLI Commands</p>
                        <CopyButton text={remediation.aws_cli_commands.join('\n')} />
                      </div>
                      <div className="space-y-1.5">
                        {remediation.aws_cli_commands.map((cmd, i) => (
                          <pre key={i} className="text-[12px] font-mono text-emerald-400/80 bg-black/30 rounded-lg px-3 py-2 overflow-x-auto">{cmd}</pre>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-[12px] text-slate-500">
                    <span>Effort: {remediation.estimated_effort}</span>
                    <span>Downtime: {remediation.requires_downtime ? 'Yes' : 'None'}</span>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
