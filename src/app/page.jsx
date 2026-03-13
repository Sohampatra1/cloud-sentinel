'use client';
import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import RiskGauge from '@/components/RiskGauge';
import SeverityChart from '@/components/SeverityChart';
import ScanSummaryCard from '@/components/ScanSummaryCard';
import FindingsTable from '@/components/FindingsTable';
import AttackPaths from '@/components/AttackPaths';
import ExecutiveSummary from '@/components/ExecutiveSummary';
import ScanHistory from '@/components/ScanHistory';

export default function Dashboard() {
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [scanId, setScanId] = useState(null);
  const [scanData, setScanData] = useState(null);
  const [findings, setFindings] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [attackPaths, setAttackPaths] = useState([]);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data.scans || []);
    } catch (e) {
      console.error('History fetch error:', e);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const loadScan = useCallback(async (id) => {
    setScanId(id);
    setScanStatus('complete');
    try {
      const [findingsRes, analysisRes, attackRes, reportRes] = await Promise.all([
        fetch(`/api/findings?scanId=${id}`).then(r => r.json()),
        fetch(`/api/analysis?scanId=${id}`).then(r => r.json()).catch(() => null),
        fetch(`/api/attack-paths?scanId=${id}`).then(r => r.json()).catch(() => null),
        fetch(`/api/report?scanId=${id}`).then(r => r.json()).catch(() => null),
      ]);

      setFindings(findingsRes.findings || []);

      if (analysisRes?.analysis) {
        setAnalysis(analysisRes.analysis);
      }
      if (attackRes?.attackPaths) {
        setAttackPaths(Array.isArray(attackRes.attackPaths) ? attackRes.attackPaths : []);
      }
      if (reportRes?.report) {
        setReport(reportRes.report);
      }

      // Get scan metadata from history
      const scanMeta = history.find(s => s.id === id);
      if (scanMeta) setScanData(scanMeta);
    } catch (e) {
      console.error('Load scan error:', e);
    }
  }, [history]);

  const runScan = async () => {
    setScanning(true);
    setScanStatus('scanning');
    setFindings([]);
    setAnalysis(null);
    setAttackPaths([]);
    setReport(null);

    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setScanId(data.scanId);
      setScanData({
        id: data.scanId,
        totalFindings: data.totalFindings,
        riskScore: data.riskScore,
        region: 'ap-south-1',
        timestamp: new Date().toISOString(),
        criticalCount: data.counts?.CRITICAL || 0,
        highCount: data.counts?.HIGH || 0,
        mediumCount: data.counts?.MEDIUM || 0,
        lowCount: data.counts?.LOW || 0,
      });
      setScanStatus('complete');

      // Load full results
      await loadScan(data.scanId);
      await fetchHistory();
    } catch (e) {
      console.error('Scan error:', e);
      setScanStatus('failed');
    } finally {
      setScanning(false);
    }
  };

  const handleFilter = async (severity, category) => {
    if (!scanId) return;
    try {
      const params = new URLSearchParams({ scanId });
      if (severity !== 'ALL') params.set('severity', severity);
      if (category !== 'ALL') params.set('category', category);
      const res = await fetch(`/api/findings?${params}`);
      const data = await res.json();
      setFindings(data.findings || []);
    } catch (e) {
      console.error('Filter error:', e);
    }
  };

  const counts = scanData ? {
    CRITICAL: scanData.criticalCount || 0,
    HIGH: scanData.highCount || 0,
    MEDIUM: scanData.mediumCount || 0,
    LOW: scanData.lowCount || 0,
  } : {};

  const cisCompliance = analysis?.cisPosture?.estimated_compliance_percentage ?? null;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Header onScan={runScan} scanning={scanning} scanStatus={scanStatus} />

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* Hero metrics row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RiskGauge score={scanData?.riskScore || 0} />
          <SeverityChart counts={counts} />
          <ScanSummaryCard scan={scanData} cisCompliance={cisCompliance} />
        </div>

        {/* Findings table */}
        <FindingsTable findings={findings} onFilter={handleFilter} />

        {/* AI insights row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AttackPaths paths={attackPaths} />
          <ExecutiveSummary report={report} />
        </div>

        {/* History */}
        <ScanHistory scans={history} onViewScan={loadScan} />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-6 mt-8">
        <p className="text-center text-[11px] text-slate-600">
          CloudSentinel — AI-Powered Cloud Security Posture Management
        </p>
      </footer>
    </div>
  );
}
