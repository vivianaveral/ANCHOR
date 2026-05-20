import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const snapshots = await prisma.weeklySnapshot.findMany({
      orderBy: { weekStart: 'desc' },
      select: {
        id: true,
        weekStart: true,
        createdAt: true,
        isManualUpload: true,
      },
    });

    return NextResponse.json(snapshots);
  } catch (err) {
    console.error('[snapshots] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
