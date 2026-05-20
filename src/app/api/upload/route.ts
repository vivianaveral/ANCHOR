import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseGongCSV } from '@/lib/gong';
import { parseHubspotCSV } from '@/lib/hubspot';
import { generateCoachingBrief } from '@/lib/anthropic';

function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const gongFile = formData.get('gongCsv');
    const hubspotFile = formData.get('hubspotCsv');

    if (!gongFile || typeof gongFile === 'string') {
      return NextResponse.json(
        { error: 'Missing gongCsv file' },
        { status: 400 },
      );
    }

    if (!hubspotFile || typeof hubspotFile === 'string') {
      return NextResponse.json(
        { error: 'Missing hubspotCsv file' },
        { status: 400 },
      );
    }

    const gongText = await (gongFile as File).text();
    const hubspotText = await (hubspotFile as File).text();

    const repScores = parseGongCSV(gongText);
    const dealSnapshots = parseHubspotCSV(hubspotText);

    if (repScores.length === 0) {
      return NextResponse.json(
        { error: 'No rep scores found in Gong CSV. Check the file format.' },
        { status: 400 },
      );
    }

    const weekStart = getMondayOfCurrentWeek();

    // Generate AI synthesis
    const synthesis = await generateCoachingBrief(repScores, dealSnapshots);

    // Save to database in a transaction
    const snapshotResult = await prisma.$transaction(async (tx) => {
      const snap = await tx.weeklySnapshot.create({
        data: {
          weekStart,
          isManualUpload: true,
          rawGongJson: { csvUpload: true, rowCount: repScores.length },
          rawHubspotJson: { csvUpload: true, rowCount: dealSnapshots.length },
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

    return NextResponse.json({ snapshotId: snapshotResult.id });
  } catch (err) {
    console.error('[upload] Error:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
