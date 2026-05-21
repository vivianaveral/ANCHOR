'use client';

import type { RepScoreData, AISynthesis } from '@/lib/types';

interface Props {
  repScores: RepScoreData[];
  synthesis: AISynthesis | null;
}

interface AnchorSection {
  key: string;
  label: string;
  fullName: string;
  questions: Array<keyof RepScoreData>;
}

const ANCHOR_SECTIONS: AnchorSection[] = [
  {
    key: 'A',
    label: 'A',
    fullName: 'Approach',
    questions: ['q1', 'q2', 'q3'],
  },
  {
    key: 'N',
    label: 'N',
    fullName: 'Needs',
    questions: ['q4', 'q5', 'q6'],
  },
  {
    key: 'C',
    label: 'C',
    fullName: 'Challenge',
    questions: ['q7', 'q8', 'q9', 'q10', 'q11', 'q12'],
  },
  {
    key: 'H',
    label: 'H',
    fullName: 'Handle',
    questions: ['q13', 'q14', 'q15', 'q16', 'q17'],
  },
  {
    key: 'O',
    label: 'O',
    fullName: 'Orchestrate',
    questions: ['q18', 'q19', 'q20', 'q21'],
  },
  {
    key: 'R',
    label: 'R',
    fullName: 'Result',
    questions: ['q22', 'q23', 'q24', 'q25', 'q26'],
  },
];

function sectionAvg(rep: RepScoreData, questions: Array<keyof RepScoreData>): number {
  const vals = questions.map((q) => rep[q] as number);
  return vals.reduce((sum, v) => sum + v, 0) / vals.length;
}

function teamSectionAvg(
  repScores: RepScoreData[],
  questions: Array<keyof RepScoreData>,
): number {
  if (repScores.length === 0) return 0;
  return (
    repScores.reduce((sum, rep) => sum + sectionAvg(rep, questions), 0) /
    repScores.length
  );
}

function scoreBadgeClass(score: number): string {
  if (score < 60) return 'bg-red-50 text-red-700 border border-red-200';
  if (score <= 75) return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
  return 'bg-green-50 text-green-700 border border-green-200';
}

export default function RepCoachingCards({ repScores, synthesis }: Props) {
  // Pre-calculate team averages for each ANCHOR section
  const teamAvgs: Record<string, number> = {};
  for (const section of ANCHOR_SECTIONS) {
    teamAvgs[section.key] = teamSectionAvg(repScores, section.questions);
  }

  // Sort by overall score ascending (worst first)
  const sorted = [...repScores].sort((a, b) => a.overallScore - b.overallScore);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {sorted.map((rep) => {
        const repSynth = synthesis?.reps?.[rep.repName];
        const badgeClass = scoreBadgeClass(rep.overallScore);

        return (
          <div
            key={rep.id}
            className="bg-white border border-gray-200 rounded-lg p-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-black font-bold text-base">{rep.repName}</h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  {rep.scoredCalls} call{rep.scoredCalls !== 1 ? 's' : ''} scored
                </p>
              </div>
              <span
                className={`text-sm font-bold px-2.5 py-1 rounded-md ${badgeClass}`}
              >
                {Math.round(rep.overallScore)}
              </span>
            </div>

            {/* ANCHOR section bars */}
            <div className="space-y-2 mb-4">
              {ANCHOR_SECTIONS.map((section) => {
                const repAvg = sectionAvg(rep, section.questions);
                const teamAvg = teamAvgs[section.key];
                const isWeak = repAvg < teamAvg - 5;
                const barColor = isWeak ? 'bg-red-400' : 'bg-blue-400';
                const widthPct = Math.min(100, Math.max(0, repAvg));

                return (
                  <div key={section.key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-500">
                        <span className="text-brand font-bold">
                          {section.label}
                        </span>
                        {' — '}
                        {section.fullName}
                      </span>
                      <span className={`text-xs font-medium ${isWeak ? 'text-red-600' : 'text-gray-500'}`}>
                        {Math.round(repAvg)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${barColor} transition-all`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coaching priority */}
            {repSynth?.this_week ? (
              <div className="bg-brand-50 border border-brand-100 rounded-md px-3 py-2">
                <p className="text-xs font-bold text-brand uppercase tracking-wide mb-1">
                  This week
                </p>
                <p className="text-gray-700 text-xs leading-relaxed">
                  {repSynth.this_week}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-md px-3 py-2">
                <p className="text-gray-400 text-xs italic">
                  No coaching note available.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
