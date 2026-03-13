'use client';
import { Shield, Scan, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function Header({ onScan, scanning, scanStatus }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-white">CloudSentinel</h1>
            <p className="text-[11px] text-slate-500 font-medium -mt-0.5">AI-Powered CSPM</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {scanStatus && (
            <div className="flex items-center gap-2 text-[13px]">
              {scanStatus === 'complete' && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-400">Scan complete</span>
                </>
              )}
              {scanStatus === 'failed' && (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-slate-400">Scan failed</span>
                </>
              )}
              {(scanStatus === 'scanning' || scanStatus === 'analyzing') && (
                <>
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-slate-400">
                    {scanStatus === 'scanning' ? 'Scanning AWS...' : 'AI analyzing...'}
                  </span>
                </>
              )}
            </div>
          )}

          <button
            onClick={onScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium
              bg-blue-500 hover:bg-blue-400 text-white
              shadow-lg shadow-blue-500/25 hover:shadow-blue-400/30
              transition-all duration-200 active:scale-[0.97]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
          >
            {scanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Scan className="w-4 h-4" />
            )}
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>
    </header>
  );
}
