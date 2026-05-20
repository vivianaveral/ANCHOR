import { csvToObjects } from './csv-parser';
import { normaliseName } from './name-normaliser';
import type { RepScoreInput } from './types';

const GONG_BASE_URL = 'https://api.gong.io/v2';

// Critical questions get weight 7, all others get weight 4
const CRITICAL_QUESTIONS = new Set([1, 4, 6, 13, 15, 22, 25, 26]);
const WEIGHT_CRITICAL = 7;
const WEIGHT_NORMAL = 4;

function getAuthHeader(): string {
  const key = process.env.GONG_ACCESS_KEY ?? '';
  const secret = process.env.GONG_ACCESS_SECRET ?? '';
  const encoded = Buffer.from(`${key}:${secret}`).toString('base64');
  return `Basic ${encoded}`;
}

export async function fetchGongScorecards(
  fromDateTime: string,
  toDateTime: string,
): Promise<unknown> {
  const scorecardId = process.env.GONG_SCORECARD_ID ?? '';
  const params = new URLSearchParams({
    fromDateTime,
    toDateTime,
    scorecardIds: scorecardId,
  });

  const response = await fetch(
    `${GONG_BASE_URL}/stats/activity/scorecards?${params.toString()}`,
    {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Gong API error ${response.status}: ${body}`,
    );
  }

  return response.json();
}

/**
 * Calculate the weighted overall score for a rep.
 * Critical questions (Q1, Q4, Q6, Q13, Q15, Q22, Q25, Q26) weight 7, rest weight 4.
 * Missing scores treated as 0.
 */
function calculateOverallScore(scores: Record<number, number>): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (let q = 1; q <= 26; q++) {
    const weight = CRITICAL_QUESTIONS.has(q) ? WEIGHT_CRITICAL : WEIGHT_NORMAL;
    const score = scores[q] ?? 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

/**
 * Parse Gong API response into RepScoreInput array.
 * Expects the Gong scorecards API response shape.
 */
export function parseGongToRepScores(gongData: unknown): RepScoreInput[] {
  const data = gongData as Record<string, unknown>;
  const scorecards = (data?.scorecards ?? []) as Array<Record<string, unknown>>;

  // Aggregate by rep name
  const repMap: Record<
    string,
    {
      scoredCalls: number;
      qTotals: Record<number, number>;
      qCounts: Record<number, number>;
      c3Texts: string[];
      c4Texts: string[];
      c5Texts: string[];
    }
  > = {};

  for (const scorecard of scorecards) {
    const rawRepName = String(scorecard.repName ?? scorecard.agentName ?? '');
    const repName = normaliseName(rawRepName);
    if (!repName) continue;

    if (!repMap[repName]) {
      repMap[repName] = {
        scoredCalls: 0,
        qTotals: {},
        qCounts: {},
        c3Texts: [],
        c4Texts: [],
        c5Texts: [],
      };
    }

    const entry = repMap[repName];
    entry.scoredCalls += 1;

    const questions = (scorecard.questions ?? []) as Array<Record<string, unknown>>;
    for (const question of questions) {
      const qNum = Number(question.questionNumber ?? question.id ?? 0);
      const score = Number(question.score ?? 0);

      if (qNum >= 1 && qNum <= 26) {
        entry.qTotals[qNum] = (entry.qTotals[qNum] ?? 0) + score;
        entry.qCounts[qNum] = (entry.qCounts[qNum] ?? 0) + 1;
      }

      // Coaching text fields
      const coachingField = Number(question.coachingField ?? 0);
      const textValue = String(question.coachingText ?? question.text ?? '').trim();
      if (textValue) {
        if (coachingField === 3 || question.fieldId === 'c3') entry.c3Texts.push(textValue);
        else if (coachingField === 4 || question.fieldId === 'c4') entry.c4Texts.push(textValue);
        else if (coachingField === 5 || question.fieldId === 'c5') entry.c5Texts.push(textValue);
      }
    }
  }

  return Object.entries(repMap).map(([repName, entry]) => {
    const avgScores: Record<number, number> = {};
    for (let q = 1; q <= 26; q++) {
      const count = entry.qCounts[q] ?? 0;
      avgScores[q] = count > 0 ? (entry.qTotals[q] ?? 0) / count : 0;
    }

    const overallScore = calculateOverallScore(avgScores);

    return {
      repName,
      overallScore,
      scoredCalls: entry.scoredCalls,
      q1: avgScores[1],
      q2: avgScores[2],
      q3: avgScores[3],
      q4: avgScores[4],
      q5: avgScores[5],
      q6: avgScores[6],
      q7: avgScores[7],
      q8: avgScores[8],
      q9: avgScores[9],
      q10: avgScores[10],
      q11: avgScores[11],
      q12: avgScores[12],
      q13: avgScores[13],
      q14: avgScores[14],
      q15: avgScores[15],
      q16: avgScores[16],
      q17: avgScores[17],
      q18: avgScores[18],
      q19: avgScores[19],
      q20: avgScores[20],
      q21: avgScores[21],
      q22: avgScores[22],
      q23: avgScores[23],
      q24: avgScores[24],
      q25: avgScores[25],
      q26: avgScores[26],
      c3Text: entry.c3Texts.length > 0 ? entry.c3Texts.join('\n---\n') : null,
      c4Text: entry.c4Texts.length > 0 ? entry.c4Texts.join('\n---\n') : null,
      c5Text: entry.c5Texts.length > 0 ? entry.c5Texts.join('\n---\n') : null,
    };
  });
}

/**
 * Parse a Gong CSV export into RepScoreInput array.
 * Expected columns: Rep Name, Overall Score, Scored Calls, Q1..Q26, C3, C4, C5
 */
export function parseGongCSV(csvText: string): RepScoreInput[] {
  const rows = csvToObjects(csvText);
  const repMap: Record<
    string,
    {
      scoredCalls: number;
      qTotals: Record<number, number>;
      qCounts: Record<number, number>;
      c3Texts: string[];
      c4Texts: string[];
      c5Texts: string[];
    }
  > = {};

  for (const row of rows) {
    const rawName = row['Rep Name'] ?? row['rep_name'] ?? row['repName'] ?? '';
    if (!rawName.trim()) continue;

    const repName = normaliseName(rawName);

    if (!repMap[repName]) {
      repMap[repName] = {
        scoredCalls: 0,
        qTotals: {},
        qCounts: {},
        c3Texts: [],
        c4Texts: [],
        c5Texts: [],
      };
    }

    const entry = repMap[repName];
    const scoredCallsStr = row['Scored Calls'] ?? row['scored_calls'] ?? row['scoredCalls'] ?? '1';
    entry.scoredCalls += Number(scoredCallsStr) || 1;

    for (let q = 1; q <= 26; q++) {
      const val = row[`Q${q}`] ?? row[`q${q}`] ?? '';
      if (val !== '') {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          entry.qTotals[q] = (entry.qTotals[q] ?? 0) + num;
          entry.qCounts[q] = (entry.qCounts[q] ?? 0) + 1;
        }
      }
    }

    const c3 = (row['C3'] ?? row['c3'] ?? '').trim();
    const c4 = (row['C4'] ?? row['c4'] ?? '').trim();
    const c5 = (row['C5'] ?? row['c5'] ?? '').trim();

    if (c3) entry.c3Texts.push(c3);
    if (c4) entry.c4Texts.push(c4);
    if (c5) entry.c5Texts.push(c5);
  }

  return Object.entries(repMap).map(([repName, entry]) => {
    const avgScores: Record<number, number> = {};
    for (let q = 1; q <= 26; q++) {
      const count = entry.qCounts[q] ?? 0;
      avgScores[q] = count > 0 ? (entry.qTotals[q] ?? 0) / count : 0;
    }

    const overallScore = calculateOverallScore(avgScores);

    return {
      repName,
      overallScore,
      scoredCalls: entry.scoredCalls,
      q1: avgScores[1],
      q2: avgScores[2],
      q3: avgScores[3],
      q4: avgScores[4],
      q5: avgScores[5],
      q6: avgScores[6],
      q7: avgScores[7],
      q8: avgScores[8],
      q9: avgScores[9],
      q10: avgScores[10],
      q11: avgScores[11],
      q12: avgScores[12],
      q13: avgScores[13],
      q14: avgScores[14],
      q15: avgScores[15],
      q16: avgScores[16],
      q17: avgScores[17],
      q18: avgScores[18],
      q19: avgScores[19],
      q20: avgScores[20],
      q21: avgScores[21],
      q22: avgScores[22],
      q23: avgScores[23],
      q24: avgScores[24],
      q25: avgScores[25],
      q26: avgScores[26],
      c3Text: entry.c3Texts.length > 0 ? entry.c3Texts.join('\n---\n') : null,
      c4Text: entry.c4Texts.length > 0 ? entry.c4Texts.join('\n---\n') : null,
      c5Text: entry.c5Texts.length > 0 ? entry.c5Texts.join('\n---\n') : null,
    };
  });
}
