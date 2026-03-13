import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { IAMScanner } from '@/lib/scanners/iam';
import { S3Scanner } from '@/lib/scanners/s3';
import { EC2Scanner } from '@/lib/scanners/ec2';
import { CloudTrailScanner } from '@/lib/scanners/cloudtrail';
import { VPCScanner } from '@/lib/scanners/vpc';
import { KMSScanner } from '@/lib/scanners/kms';
import { calculateRiskScore, getSeverityCounts } from '@/lib/risk-scorer';
import { analyzeFindings, identifyAttackPaths, generateExecutiveSummary } from '@/lib/groq';

export async function POST() {
  let scan;
  try {
    scan = await prisma.scan.create({ data: { status: 'scanning' } });

    // Run all scanners
    const scanners = [
      new IAMScanner(),
      new S3Scanner(),
      new EC2Scanner(),
      new CloudTrailScanner(),
      new VPCScanner(),
      new KMSScanner(),
    ];

    const results = await Promise.allSettled(scanners.map(s => s.scan()));
    const allFindings = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    // Save findings
    if (allFindings.length > 0) {
      await prisma.finding.createMany({
        data: allFindings.map(f => ({ ...f, scanId: scan.id })),
      });
    }

    const riskScore = calculateRiskScore(allFindings);
    const counts = getSeverityCounts(allFindings);

    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: 'analyzing',
        totalFindings: allFindings.length,
        riskScore,
        criticalCount: counts.CRITICAL,
        highCount: counts.HIGH,
        mediumCount: counts.MEDIUM,
        lowCount: counts.LOW,
      },
    });

    // Run LLM analysis
    let analysis = null;
    let attackPaths = null;
    let executive = null;

    try {
      [analysis, attackPaths, executive] = await Promise.all([
        analyzeFindings(allFindings),
        identifyAttackPaths(allFindings),
        generateExecutiveSummary(allFindings, riskScore, counts),
      ]);
    } catch (e) {
      console.error('LLM analysis error:', e.message);
    }

    if (analysis || attackPaths || executive) {
      await prisma.analysis.create({
        data: {
          scanId: scan.id,
          categorySummary: analysis?.category_summary || {},
          topUrgent: analysis?.top_3_urgent || [],
          quickWins: analysis?.quick_wins || [],
          cisPosture: analysis?.cis_posture || {},
          attackPaths: attackPaths?.attack_paths || [],
          executiveReport: executive || {},
        },
      });
    }

    await prisma.scan.update({
      where: { id: scan.id },
      data: { status: 'complete' },
    });

    return NextResponse.json({
      scanId: scan.id,
      status: 'complete',
      riskScore,
      totalFindings: allFindings.length,
      counts,
    });
  } catch (e) {
    console.error('Scan error:', e);
    if (scan) {
      await prisma.scan.update({
        where: { id: scan.id },
        data: { status: 'failed' },
      }).catch(() => {});
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
