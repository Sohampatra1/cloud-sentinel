import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');

  if (!scanId) {
    return NextResponse.json({ error: 'scanId required' }, { status: 400 });
  }

  const analysis = await prisma.analysis.findUnique({ where: { scanId } });
  if (!analysis) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  return NextResponse.json({ report: analysis.executiveReport });
}
