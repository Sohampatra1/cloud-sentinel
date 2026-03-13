import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const scans = await prisma.scan.findMany({
    orderBy: { timestamp: 'desc' },
    take: 20,
    select: {
      id: true,
      timestamp: true,
      status: true,
      totalFindings: true,
      riskScore: true,
      criticalCount: true,
      highCount: true,
      mediumCount: true,
      lowCount: true,
      region: true,
    },
  });

  return NextResponse.json({ scans });
}
