export interface RevenueOpportunity {
  /** Team ANCHOR score this week vs last week */
  score_this_week: string;
  /** Dollar estimate with range and stated ACV assumption */
  what_its_worth: string;
  /** Single highest-impact skill the team is missing */
  one_blocker: string;
  /** One specific assigned action with timeframe */
  one_action: string;
}

export interface AISynthesis {
  revenue_opportunity?: RevenueOpportunity;
  /** @deprecated — old snapshots only. Use revenue_opportunity instead. */
  exec_signal?: string;
  team_gaps: Array<{
    title: string;
    why: string;
    affected_count: number;
  }>;
  reps: Record<string, {
    doing_well: string;
    focus_on: string;
    this_week: string;
  }>;
}

export interface RepSynthesis {
  doing_well: string;
  focus_on: string;
  this_week: string;
}

export interface SnapshotListItem {
  id: string;
  weekStart: Date;
  createdAt: Date;
  isManualUpload: boolean;
}

export interface RepScoreData {
  id: string;
  snapshotId: string;
  repName: string;
  overallScore: number;
  scoredCalls: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
  q11: number;
  q12: number;
  q13: number;
  q14: number;
  q15: number;
  q16: number;
  q17: number;
  q18: number;
  q19: number;
  q20: number;
  q21: number;
  q22: number;
  q23: number;
  q24: number;
  q25: number;
  q26: number;
  c3Text?: string | null;
  c4Text?: string | null;
  c5Text?: string | null;
}

export interface DealSnapshotData {
  id: string;
  snapshotId: string;
  dealId: string;
  salesAgent: string;
  dealStage: string;
  createDate?: Date | null;
  firstMeetingDate?: Date | null;
  closedWonDate?: Date | null;
  isClosedWon: boolean;
  isOpenPrebilling: boolean;
  dealAgeDays?: number | null;
}

export interface RepScoreInput {
  repName: string;
  overallScore: number;
  scoredCalls: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
  q11: number;
  q12: number;
  q13: number;
  q14: number;
  q15: number;
  q16: number;
  q17: number;
  q18: number;
  q19: number;
  q20: number;
  q21: number;
  q22: number;
  q23: number;
  q24: number;
  q25: number;
  q26: number;
  c3Text?: string | null;
  c4Text?: string | null;
  c5Text?: string | null;
}

export interface DealSnapshotInput {
  dealId: string;
  salesAgent: string;
  dealStage: string;
  createDate?: Date | null;
  firstMeetingDate?: Date | null;
  closedWonDate?: Date | null;
  isClosedWon: boolean;
  isOpenPrebilling: boolean;
  dealAgeDays?: number | null;
}

export interface FullSnapshotData {
  id: string;
  weekStart: Date;
  createdAt: Date;
  isManualUpload: boolean;
  rawGongJson: unknown;
  rawHubspotJson: unknown;
  aiSynthesis?: string | null;
  repScores: RepScoreData[];
  dealSnapshots: DealSnapshotData[];
}
