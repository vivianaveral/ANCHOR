import Anthropic from '@anthropic-ai/sdk';
import type { AISynthesis, RepScoreInput, DealSnapshotInput } from './types';

const MODEL = 'claude-sonnet-4-20250514';

const QUESTION_NAMES: Record<number, string> = {
  1: 'Opening hook / pattern interrupt',
  2: 'Confirming decision-maker on call',
  3: 'Confirming budget holder',
  4: 'Pain discovery depth',
  5: 'Quantifying the pain',
  6: 'Connecting pain to solution',
  7: 'Presenting pricing clearly',
  8: 'Handling price objections',
  9: 'Trial close attempts',
  10: 'Reading buying signals',
  11: 'Competitor handling',
  12: 'Social proof usage',
  13: 'Urgency creation',
  14: 'Next steps commitment',
  15: 'Closing attempt made',
  16: 'Objection handling — general',
  17: 'Follow-up commitment',
  18: 'Call energy and pace',
  19: 'Active listening',
  20: 'Empathy shown',
  21: 'Product knowledge',
  22: 'Value articulation',
  23: 'Question quality',
  24: 'Talk-to-listen ratio',
  25: 'Commitment to close',
  26: 'Overall call quality',
};

function formatRepScoresForPrompt(repScores: RepScoreInput[]): string {
  return repScores
    .map((rep) => {
      const scores: string[] = [];
      for (let q = 1; q <= 26; q++) {
        const key = `q${q}` as keyof RepScoreInput;
        const val = rep[key] as number;
        const name = QUESTION_NAMES[q];
        scores.push(`  - ${name}: ${Math.round(val)}/100`);
      }

      return [
        `Rep: ${rep.repName}`,
        `Overall score: ${Math.round(rep.overallScore)}/100`,
        `Calls scored this week: ${rep.scoredCalls}`,
        `Scores:`,
        scores.join('\n'),
        rep.c3Text ? `Coaching note (key strength): ${rep.c3Text}` : '',
        rep.c4Text ? `Coaching note (improvement area): ${rep.c4Text}` : '',
        rep.c5Text ? `Coaching note (manager comment): ${rep.c5Text}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function formatDealSnapshotsForPrompt(dealSnapshots: DealSnapshotInput[]): string {
  const preBillingDeals = dealSnapshots.filter((d) => d.isOpenPrebilling);
  const closedWonDeals = dealSnapshots.filter((d) => d.isClosedWon);
  const totalDeals = dealSnapshots.length;

  const lines: string[] = [];

  lines.push(`Total deals in dataset: ${totalDeals}`);
  lines.push(`Closed won this period: ${closedWonDeals.length}`);
  lines.push(`Open pre-billing (active pipeline): ${preBillingDeals.length}`);

  if (totalDeals > 0) {
    const winRate = Math.round((closedWonDeals.length / totalDeals) * 100);
    lines.push(`Implied win rate: ${winRate}%`);
  }

  const byRep: Record<string, DealSnapshotInput[]> = {};
  for (const deal of preBillingDeals) {
    if (!byRep[deal.salesAgent]) byRep[deal.salesAgent] = [];
    byRep[deal.salesAgent].push(deal);
  }

  if (Object.keys(byRep).length > 0) {
    lines.push('\nOpen pre-billing deals by rep:');
    for (const [rep, deals] of Object.entries(byRep)) {
      const oldDeals = deals.filter((d) => (d.dealAgeDays ?? 0) > 5);
      lines.push(
        `  ${rep}: ${deals.length} deal(s), ${oldDeals.length} older than 5 days` +
          ` (stages: ${[...new Set(deals.map((d) => d.dealStage))].join(', ')})`,
      );
    }
  }

  return lines.join('\n');
}

export async function generateCoachingBrief(
  repScores: RepScoreInput[],
  dealSnapshots: DealSnapshotInput[],
): Promise<AISynthesis> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const repScoresText = formatRepScoresForPrompt(repScores);
  const dealText = formatDealSnapshotsForPrompt(dealSnapshots);
  const repNames = repScores.map((r) => r.repName);

  const userPrompt = `Here is this week's sales performance data for the BruntWork sales team.

## Rep Scorecard Data
${repScoresText}

## Deal Pipeline Context
${dealText}

## Your Task
Generate a weekly coaching brief as a JSON object matching this exact shape:

{
  "exec_signal": "A single commercial insight for the CRO and Head of Sales framed as a GROWTH OPPORTUNITY — not a warning. Reference specific numbers from the pipeline data: how many open deals are at risk, how many could be recovered if the team fixes the biggest skill gap, and an estimated MRR impact (assume $2,500 MRR per deal if no other data available). Example format: 'Fixing [specific behaviour] across [N] reps could recover an estimated [X] deals this month worth approximately $[Y] in MRR.' Be specific and forward-looking.",
  "team_gaps": [
    {
      "title": "Short phrase naming the gap",
      "why": "One or two sentences explaining why this is hurting deals",
      "affected_count": <number of reps affected>
    }
  ],
  "reps": {
    ${repNames.map((name) => `"${name}": { "doing_well": "...", "focus_on": "...", "this_week": "..." }`).join(',\n    ')}
  }
}

Rules:
- Return valid JSON only. No markdown, no code fences, no extra text.
- Do not use Q-numbers anywhere. Use plain English skill names.
- Do not use the word ANCHOR.
- No percentages anywhere.
- Write in plain conversational English.
- Rep notes must use second person ("You're doing well at...", "Focus on...").
- Be specific and constructive. Reference actual scores and patterns.
- "this_week" must be one concrete, actionable thing the rep can try on their very next call.
- "team_gaps" should list the top 3 patterns affecting multiple reps, tied to deal outcomes.
- "exec_signal" must be framed as a revenue OPPORTUNITY with specific deal counts and estimated MRR — never as a warning or risk statement. Pull numbers from the pipeline data provided.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system:
      'You are an expert sales coach. Your job is to generate a weekly coaching brief for a BruntWork sales team. Be specific, constructive, and forward-looking. Use plain conversational English. Always respond with valid JSON only.',
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const rawContent = response.content[0];
  if (rawContent.type !== 'text') {
    throw new Error('Anthropic returned unexpected content type');
  }

  const text = rawContent.text.trim();

  // Strip code fences if the model included them despite instructions
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as AISynthesis;
    return parsed;
  } catch (err) {
    throw new Error(
      `Failed to parse Anthropic response as JSON. Raw response: ${text.slice(0, 500)}. Parse error: ${String(err)}`,
    );
  }
}
