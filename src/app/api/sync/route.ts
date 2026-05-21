import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchGongScorecards, parseGongToRepScores } from '@/lib/gong';
import { fetchHubspotDeals, parseHubspotToDealSnapshots } from '@/lib/hubspot';
import { generateCoachingBrief } from '@/lib/anthropic';

function getMostRecentMonday(now: Date): Date {
  const day = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export async function GET(request: NextRequest) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET ?? '';
  const authHeader = request.headers.get('authorization');
  const cronHeader = request.headers.get('x-cron-secret');

  const providedSecret =
    authHeader?.replace('Bearer ', '') ?? cronHeader ?? '';

  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekStart = getMostRecentMonday(now);

    // Check if already synced
    const existing = await prisma.weeklySnapshot.findFirst({
      where: { weekStart },
    });

    if (existing) {
      return NextResponse.json({ alreadySynced: true, snapshotId: existing.id });
    }

    // Date range: past 7 days
    const fromDateTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const toDateTime = now.toISOString();

    // Fetch data
    const [gongData, hubspotData] = await Promise.all([
      fetchGongScorecards(fromDateTime, toDateTime),
      fetchHubspotDeals(),
    ]);

    const repScores = parseGongToRepScores(gongData);
    const dealSnapshots = parseHubspotToDealSnapshots(hubspotData);

    // Look up previous week's team average for week-over-week comparison
    const prevSnapshot = await prisma.weeklySnapshot.findFirst({
      where: { weekStart: { lt: weekStart } },
      orderBy: { weekStart: 'desc' },
      include: { repScores: { select: { overallScore: true } } },
    });
    const previousWeekAvg =
      prevSnapshot && prevSnapshot.repScores.length > 0
        ? prevSnapshot.repScores.reduce((sum, r) => sum + r.overallScore, 0) /
          prevSnapshot.repScores.length
        : undefined;

    // Generate AI synthesis
    const synthesis = await generateCoachingBrief(repScores, dealSnapshots, previousWeekAvg);

    // Save to database in a transaction
    const snapshotResult = await prisma.$transaction(async (tx) => {
      const snap = await tx.weeklySnapshot.create({
        data: {
          weekStart,
          isManualUpload: false,
          rawGongJson: gongData as object,
          rawHubspotJson: hubspotData as object,
          aiSynthesis: JSON.stringify(synthesis),
          repScores: {
            create: repScores.map((r) => ({
              repName: r.repName,
              overallScore: r.overallScore,
              scoredCalls: r.scoredCalls,
              q1: r.q1,
              q2: r.q2,
              q3: r.q3,
              q4: r.q4,
              q5: r.q5,
              q6: r.q6,
              q7: r.q7,
              q8: r.q8,
              q9: r.q9,
              q10: r.q10,
              q11: r.q11,
              q12: r.q12,
              q13: r.q13,
              q14: r.q14,
              q15: r.q15,
              q16: r.q16,
              q17: r.q17,
              q18: r.q18,
              q19: r.q19,
              q20: r.q20,
              q21: r.q21,
              q22: r.q22,
              q23: r.q23,
              q24: r.q24,
              q25: r.q25,
              q26: r.q26,
              c3Text: r.c3Text ?? null,
              c4Text: r.c4Text ?? null,
              c5Text: r.c5Text ?? null,
            })),
          },
          dealSnapshots: {
            create: dealSnapshots.map((d) => ({
              dealId: d.dealId,
              salesAgent: d.salesAgent,
              dealStage: d.dealStage,
              createDate: d.createDate ?? null,
              firstMeetingDate: d.firstMeetingDate ?? null,
              closedWonDate: d.closedWonDate ?? null,
              isClosedWon: d.isClosedWon,
              isOpenPrebilling: d.isOpenPrebilling,
              dealAgeDays: d.dealAgeDays ?? null,
            })),
          },
        },
      });
      return snap;
    });

    return NextResponse.json({ success: true, snapshotId: snapshotResult.id });
  } catch (err) {
    console.error('[sync] Error:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
