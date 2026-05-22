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
  previousWeekAvg?: number,
): Promise<AISynthesis> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Calculate this week's team average for the prompt
  const thisWeekAvg =
    repScores.length > 0
      ? Math.round(repScores.reduce((sum, r) => sum + r.overallScore, 0) / repScores.length)
      : 0;

  const prevWeekLine =
    previousWeekAvg !== undefined
      ? `Previous week team average: ${Math.round(previousWeekAvg)}/100`
      : 'Previous week team average: not available (first snapshot)';

  const repScoresText = formatRepScoresForPrompt(repScores);
  const dealText = formatDealSnapshotsForPrompt(dealSnapshots);
  const repNames = repScores.map((r) => r.repName);

  const userPrompt = `You are generating a weekly sales coaching brief for BruntWork. Respond with a single valid JSON object — no markdown, no code fences, no extra text before or after the JSON.

## DATA

Team score this week: ${thisWeekAvg}/100
${prevWeekLine}

Pipeline:
${dealText}

Rep scorecards:
${repScoresText}

## REQUIRED JSON SHAPE

Return exactly this structure with all fields populated:

{
  "revenue_opportunity": {
    "score_this_week": "REPLACE: One sentence. State the team average score (${thisWeekAvg}/100) and compare to last week if available. Example: 'The team averaged 47/100 this week, down 6 points from last week.' If no prior week data, say: 'The team averaged ${thisWeekAvg}/100 this week — no prior week to compare.'",
    "what_its_worth": "REPLACE: Dollar estimate with range. Use the real pipeline numbers above. Formula: open pre-billing deals × estimated conversion improvement × $1,200 AUD avg placement value. State assumption. Example: 'Based on 14 open deals and a realistic 2-deal conversion improvement, fixing the top gap is worth an estimated $2,400–$4,800 AUD in monthly recurring revenue. Assumes $1,200 AUD avg placement value per FTE.'",
    "one_blocker": "REPLACE: One sentence only. The single highest-impact behaviour the team is failing to do — the one thing that, if fixed, moves the most deals. No jargon. Plain English. Example: 'Reps are not asking for a direct yes or no commitment before ending the call.'",
    "one_action": "REPLACE: One specific action, assigned to a person, with a timeframe. Example: 'Elizna to run a 10-minute role-play drill on closing language before this Friday's team standup.'"
  },
  "team_gaps": [
    { "title": "REPLACE: short gap name", "why": "REPLACE: 1-2 sentences on why this costs deals", "affected_count": 0 },
    { "title": "REPLACE: short gap name", "why": "REPLACE: 1-2 sentences on why this costs deals", "affected_count": 0 },
    { "title": "REPLACE: short gap name", "why": "REPLACE: 1-2 sentences on why this costs deals", "affected_count": 0 }
  ],
  "reps": {
    ${repNames.map((name) => `"${name}": { "doing_well": "REPLACE: second person, specific strength", "focus_on": "REPLACE: second person, what is costing them deals", "this_week": "REPLACE: one concrete action for their next call" }`).join(',\n    ')}
  }
}

## RULES
- Return valid JSON only. No markdown. No code fences. No text before or after the JSON.
- Replace every "REPLACE: ..." value with the real answer.
- Never use Q-numbers. Use plain English skill names.
- Never use the word ANCHOR.
- rep notes: second person ("You're doing well at...", "Focus on...").
- team_gaps: exactly 3 items.
- one_blocker: one sentence, plain English, no jargon.
- one_action: name a specific person and a specific deadline.
- what_its_worth: must include a dollar range and state the $1,200 AUD assumption.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: 'You are a sales coaching assistant. You output only valid JSON. Never output markdown, code fences, or explanatory text. Only output the raw JSON object.',
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
