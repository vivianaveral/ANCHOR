import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const snapshot = await prisma.weeklySnapshot.findUnique({
      where: { id: params.id },
      include: {
        repScores: true,
        dealSnapshots: true,
      },
    });

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    return NextResponse.json(snapshot);
  } catch (err) {
    console.error('[snapshot/id] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
