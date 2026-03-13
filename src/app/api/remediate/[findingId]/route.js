import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateRemediation } from '@/lib/groq';

export async function POST(request, { params }) {
  const { findingId } = await params;

  if (!findingId) {
    return NextResponse.json({ error: 'findingId required' }, { status: 400 });
  }

  const finding = await prisma.finding.findUnique({ where: { id: findingId } });
  if (!finding) {
    return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
  }

  try {
    const remediation = await generateRemediation(finding);
    return NextResponse.json({ remediation });
  } catch (e) {
    console.error('Remediation error:', e.message);
    return NextResponse.json({ error: 'Failed to generate remediation' }, { status: 500 });
  }
}
