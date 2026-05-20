'use client';

import { useState } from 'react';
import type { AISynthesis, RepScoreData, RepSynthesis } from '@/lib/types';
import ShareModal from './ShareModal';

interface Props {
  synthesis: AISynthesis | null;
  repScores: RepScoreData[];
}

function scoreBadge(score: number): { label: string; classes: string } {
  if (score < 60) {
    return { label: 'Priority Coaching', classes: 'bg-red-900 text-red-300 border border-red-700' };
  } else if (score <= 75) {
    return { label: 'Needs Attention', classes: 'bg-amber-900 text-amber-300 border border-amber-700' };
  } else {
    return { label: 'On Track', classes: 'bg-green-900 text-green-300 border border-green-700' };
  }
}

export default function WeeklyBrief({ synthesis, repScores }: Props) {
  const [shareModal, setShareModal] = useState<{
    repName: string;
    repSynthesis: RepSynthesis;
  } | null>(null);

  if (!synthesis) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500">No coaching brief generated yet.</p>
      </div>
    );
  }

  // Sort reps worst-first by overall score
  const sortedReps = [...repScores].sort((a, b) => a.overallScore - b.overallScore);

  return (
    <div className="space-y-6">
      {/* Exec signal banner */}
      <div className="bg-black border-l-4 border-amber-400 px-5 py-4 rounded-r-lg">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">
          CRO Signal
        </p>
        <p className="text-gray-100 italic text-base">{synthesis.exec_signal}</p>
      </div>

      {/* Team gaps */}
      <div>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
          Where deals are dying
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {synthesis.team_gaps.map((gap, idx) => (
            <div
              key={idx}
              className="bg-gray-900 border border-gray-700 rounded-lg p-4"
            >
              <h3 className="font-semibold text-white text-sm mb-2">{gap.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{gap.why}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rep cards */}
      <div>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
          Rep Coaching Notes
        </h2>
        <div className="space-y-4">
          {sortedReps.map((rep) => {
            const badge = scoreBadge(rep.overallScore);
            const repSynth = synthesis.reps[rep.repName];

            return (
              <div
                key={rep.id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-5"
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-semibold text-base">
                      {rep.repName}
                    </h3>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.classes}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">
                    Score:{' '}
                    <span className="text-white font-medium">
                      {Math.round(rep.overallScore)}
                    </span>
                    /100 &bull; {rep.scoredCalls} call{rep.scoredCalls !== 1 ? 's' : ''}
                  </span>
                </div>

                {repSynth ? (
                  <>
                    {/* Two-column grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Doing well
                        </p>
                        <p className="text-gray-200 text-sm leading-relaxed">
                          {repSynth.doing_well}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Where deals are slipping
                        </p>
                        <p className="text-gray-200 text-sm leading-relaxed">
                          {repSynth.focus_on}
                        </p>
                      </div>
                    </div>

                    {/* This week focus */}
                    <div className="bg-gray-800 rounded-md px-4 py-3 mb-4">
                      <p className="text-xs text-amber-400 uppercase tracking-wide mb-1">
                        This week&apos;s focus
                      </p>
                      <p className="text-gray-200 text-sm leading-relaxed">
                        {repSynth.this_week}
                      </p>
                    </div>

                    {/* Share button */}
                    <button
                      onClick={() =>
                        setShareModal({ repName: rep.repName, repSynthesis: repSynth })
                      }
                      className="text-sm border border-amber-400 text-amber-400 px-4 py-1.5 rounded-md hover:bg-amber-400 hover:text-gray-950 transition-colors"
                    >
                      Share with rep
                    </button>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm italic">
                    No AI coaching note available for this rep.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Share modal */}
      {shareModal && (
        <ShareModal
          repName={shareModal.repName}
          synthesis={shareModal.repSynthesis}
          onClose={() => setShareModal(null)}
        />
      )}
    </div>
  );
}
