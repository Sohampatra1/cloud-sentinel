import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');
  const severity = searchParams.get('severity');
  const category = searchParams.get('category');

  if (!scanId) {
    return NextResponse.json({ error: 'scanId required' }, { status: 400 });
  }

  const where = { scanId };
  if (severity && severity !== 'ALL') where.severity = severity;
  if (category && category !== 'ALL') where.category = category;

  const findings = await prisma.finding.findMany({
    where,
    orderBy: [
      { severity: 'asc' },
      { category: 'asc' },
    ],
  });

  // Custom sort: CRITICAL > HIGH > MEDIUM > LOW > INFO
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  findings.sort((a, b) => (order[a.severity] ?? 5) - (order[b.severity] ?? 5));

  return NextResponse.json({ findings });
}
