'use client';

import type { RepScoreData, DealSnapshotData } from '@/lib/types';

interface Props {
  repScores: RepScoreData[];
  dealSnapshots: DealSnapshotData[];
}

const CRITICAL_QUESTIONS: Array<{ key: keyof RepScoreData; label: string }> = [
  { key: 'q1', label: 'Opening hook / pattern interrupt' },
  { key: 'q4', label: 'Pain discovery depth' },
  { key: 'q6', label: 'Connecting pain to solution' },
  { key: 'q13', label: 'Urgency creation' },
  { key: 'q15', label: 'Closing attempt made' },
  { key: 'q22', label: 'Value articulation' },
  { key: 'q25', label: 'Commitment to close' },
  { key: 'q26', label: 'Overall call quality' },
];

function getCriticalAvg(rep: RepScoreData): number {
  const scores = CRITICAL_QUESTIONS.map((q) => rep[q.key] as number);
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

interface RepRisk {
  rep: RepScoreData;
  criticalAvg: number;
  deltaFromTeam: number;
  riskLevel: 'red' | 'amber' | null;
  weakestSkills: string[];
  openDeals: DealSnapshotData[];
  oldDeals: DealSnapshotData[];
}

export default function DealRiskRadar({ repScores, dealSnapshots }: Props) {
  // Calculate team critical average
  const teamCriticalAvg =
    repScores.length > 0
      ? repScores.reduce((sum, r) => sum + getCriticalAvg(r), 0) / repScores.length
      : 0;

  // Group pre-billing deals by sales agent
  const preBillingByRep: Record<string, DealSnapshotData[]> = {};
  for (const deal of dealSnapshots) {
    if (deal.isOpenPrebilling) {
      if (!preBillingByRep[deal.salesAgent]) preBillingByRep[deal.salesAgent] = [];
      preBillingByRep[deal.salesAgent].push(deal);
    }
  }

  // Build risk entries only for reps with pre-billing deals
  const riskReps: RepRisk[] = [];

  for (const rep of repScores) {
    const openDeals = preBillingByRep[rep.repName] ?? [];
    if (openDeals.length === 0) continue;

    const criticalAvg = getCriticalAvg(rep);
    const delta = criticalAvg - teamCriticalAvg;

    let riskLevel: 'red' | 'amber' | null = null;
    if (delta < -10) riskLevel = 'red';
    else if (delta < -5) riskLevel = 'amber';

    // Find weakest critical skills (most below team average per question)
    const weakestSkills: string[] = [];
    if (riskLevel) {
      const questionDeltas = CRITICAL_QUESTIONS.map((q) => ({
        label: q.label,
        delta:
          (rep[q.key] as number) -
          (repScores.reduce((sum, r) => sum + (r[q.key] as number), 0) /
            repScores.length),
      })).sort((a, b) => a.delta - b.delta);

      // Take the 3 most below average
      questionDeltas.slice(0, 3).forEach((q) => {
        if (q.delta < 0) weakestSkills.push(q.label);
      });
    }

    const oldDeals = openDeals.filter((d) => (d.dealAgeDays ?? 0) > 5);

    riskReps.push({
      rep,
      criticalAvg,
      deltaFromTeam: delta,
      riskLevel,
      weakestSkills,
      openDeals,
      oldDeals,
    });
  }

  // Sort: red first, then amber, then null
  riskReps.sort((a, b) => {
    const order = { red: 0, amber: 1, null: 2 } as Record<string, number>;
    return (order[String(a.riskLevel)] ?? 2) - (order[String(b.riskLevel)] ?? 2);
  });

  if (riskReps.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-400">No open pre-billing deals found this week.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <p className="text-gray-500 text-sm">
          Team critical skill average:{' '}
          <span className="text-gray-900 font-medium">
            {Math.round(teamCriticalAvg)}/100
          </span>
        </p>
        <span className="text-gray-400 text-xs">
          (Opening, Pain discovery, Connecting pain, Urgency, Close attempt, Value, Commitment, Call quality)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {riskReps.map(
          ({ rep, criticalAvg, deltaFromTeam, riskLevel, weakestSkills, openDeals, oldDeals }) => {
            const borderClass =
              riskLevel === 'red'
                ? 'border-red-400'
                : riskLevel === 'amber'
                  ? 'border-amber-400'
                  : 'border-gray-200';

            const badgeClass =
              riskLevel === 'red'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : riskLevel === 'amber'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-gray-100 text-gray-500 border border-gray-200';

            const badgeLabel =
              riskLevel === 'red'
                ? 'High Risk'
                : riskLevel === 'amber'
                  ? 'Watch'
                  : 'Monitoring';

            return (
              <div
                key={rep.id}
                className={`bg-white border-2 ${borderClass} rounded-lg p-5`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-900 font-semibold">{rep.repName}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
                    {badgeLabel}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Critical avg</p>
                    <p className="text-gray-900 font-medium">{Math.round(criticalAvg)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">vs team</p>
                    <p
                      className={`font-medium ${deltaFromTeam < 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {deltaFromTeam > 0 ? '+' : ''}
                      {Math.round(deltaFromTeam)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Open deals</p>
                    <p className="text-gray-900 font-medium">{openDeals.length}</p>
                  </div>
                </div>

                {oldDeals.length > 0 && (
                  <p className="text-amber-600 text-xs mb-3">
                    {oldDeals.length} deal{oldDeals.length !== 1 ? 's' : ''} older than 5 days
                  </p>
                )}

                {weakestSkills.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      Skills to watch
                    </p>
                    <ul className="space-y-1">
                      {weakestSkills.map((skill) => (
                        <li key={skill} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5">&#9679;</span>
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    Deal stages
                  </p>
                  <p className="text-xs text-gray-500">
                    {[...new Set(openDeals.map((d) => d.dealStage))].join(', ')}
                  </p>
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}
