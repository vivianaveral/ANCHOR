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
    return { label: 'Priority Coaching', classes: 'bg-red-50 text-red-700 border border-red-200' };
  } else if (score <= 75) {
    return { label: 'Needs Attention', classes: 'bg-yellow-50 text-yellow-700 border border-yellow-200' };
  } else {
    return { label: 'On Track', classes: 'bg-green-50 text-green-700 border border-green-200' };
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
      {/* Revenue Opportunity block */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-6">
        <h2 className="text-xs font-bold text-brand uppercase tracking-widest mb-5">
          Revenue Opportunity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Q1 — Score this week */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] font-bold text-black uppercase tracking-widest mb-1.5">
              Score This Week
            </p>
            <p className="text-gray-700 text-sm leading-relaxed">
              {synthesis.revenue_opportunity.score_comparison}
            </p>
          </div>
          {/* Q2 — Dollar value */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] font-bold text-black uppercase tracking-widest mb-1.5">
              What It&apos;s Worth
            </p>
            <p className="text-gray-700 text-sm leading-relaxed">
              {synthesis.revenue_opportunity.dollar_value}
            </p>
          </div>
          {/* Q3 — Top constraint */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] font-bold text-black uppercase tracking-widest mb-1.5">
              What&apos;s Blocking It
            </p>
            <p className="text-gray-700 text-sm leading-relaxed">
              {synthesis.revenue_opportunity.top_constraint}
            </p>
          </div>
          {/* Q4 — Action needed */}
          <div className="bg-brand border border-brand-600 rounded-lg p-4">
            <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-1.5">
              Action Needed
            </p>
            <p className="text-white text-sm leading-relaxed font-medium">
              {synthesis.revenue_opportunity.action_needed}
            </p>
          </div>
        </div>
      </div>

      {/* Team gaps */}
      <div>
        <h2 className="text-black font-bold text-xs uppercase tracking-widest mb-3">
          Where Deals Are Slipping
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {synthesis.team_gaps.map((gap, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <h3 className="font-bold text-black text-sm mb-2">{gap.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{gap.why}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rep cards */}
      <div>
        <h2 className="text-black font-bold text-xs uppercase tracking-widest mb-3">
          Rep Coaching Notes
        </h2>
        <div className="space-y-4">
          {sortedReps.map((rep) => {
            const badge = scoreBadge(rep.overallScore);
            const repSynth = synthesis.reps[rep.repName];

            return (
              <div
                key={rep.id}
                className="bg-white border border-gray-200 rounded-lg p-5"
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-black font-bold text-base">
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
                    <span className="text-gray-900 font-medium">
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
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                          Doing well
                        </p>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {repSynth.doing_well}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                          Where deals are slipping
                        </p>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {repSynth.focus_on}
                        </p>
                      </div>
                    </div>

                    {/* This week focus */}
                    <div className="bg-brand-50 border border-brand-100 rounded-md px-4 py-3 mb-4">
                      <p className="text-xs font-bold text-brand uppercase tracking-wide mb-1">
                        This week&apos;s focus
                      </p>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {repSynth.this_week}
                      </p>
                    </div>

                    {/* Share button */}
                    <button
                      onClick={() =>
                        setShareModal({ repName: rep.repName, repSynthesis: repSynth })
                      }
                      className="text-sm border border-brand text-brand px-4 py-1.5 rounded-md hover:bg-brand hover:text-white transition-colors"
                    >
                      Share with rep
                    </button>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm italic">
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
