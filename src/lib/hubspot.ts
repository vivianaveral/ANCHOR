import { csvToObjects } from './csv-parser';
import { normaliseName } from './name-normaliser';
import type { DealSnapshotInput } from './types';

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

const PRE_BILLING_STAGES = [
  'getting billing details (sales pipeline)',
  'missed zoom call (sales pipeline)',
  'zoom call booked (sales pipeline)',
];

const CLOSED_WON_STAGE_KEYWORDS = [
  'recruiting',
  'resumes_sent',
  'resumes sent',
  'interview_scheduled',
  'interview scheduled',
  'agreement_sent',
  'agreement sent',
];

const DEAL_PROPERTIES = [
  'dealname',
  'dealstage',
  'sales_agent',
  'createdate',
  'first_meeting_date',
  'date_entered_zoom_call_booked',
  'hs_date_entered_recruiting',
  'hs_date_entered_resumes_sent',
  'hs_date_entered_interview_scheduled',
  'hs_date_entered_agreement_sent',
  'quick_job',
  'closedate',
];

function isClosedWonDeal(
  stage: string,
  props: Record<string, string | null | undefined>,
): boolean {
  const stageLower = stage.toLowerCase();
  for (const kw of CLOSED_WON_STAGE_KEYWORDS) {
    if (stageLower.includes(kw)) return true;
  }
  // Also check if any hs_date_entered fields are set
  if (
    props.hs_date_entered_recruiting ||
    props.hs_date_entered_resumes_sent ||
    props.hs_date_entered_interview_scheduled ||
    props.hs_date_entered_agreement_sent
  ) {
    return true;
  }
  return false;
}

function isPreBillingDeal(stage: string): boolean {
  const stageLower = stage.toLowerCase();
  return PRE_BILLING_STAGES.some((s) => stageLower.includes(s));
}

function shouldExcludeDeal(
  stage: string,
  quickJob: string | null | undefined,
): boolean {
  if (quickJob === 'true' || quickJob === '1') return true;
  if (stage.toLowerCase().includes('draft')) return true;
  return false;
}

function parseDealAge(createDateStr: string | null | undefined): {
  createDate: Date | null;
  dealAgeDays: number | null;
} {
  if (!createDateStr) return { createDate: null, dealAgeDays: null };
  const createDate = new Date(createDateStr);
  if (isNaN(createDate.getTime())) return { createDate: null, dealAgeDays: null };
  const dealAgeDays = Math.floor(
    (Date.now() - createDate.getTime()) / 86400000,
  );
  return { createDate, dealAgeDays };
}

export async function fetchHubspotDeals(): Promise<unknown> {
  const token = process.env.HUBSPOT_TOKEN ?? '';
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const allResults: unknown[] = [];
  let after: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'hs_lastmodifieddate',
              operator: 'GTE',
              value: sevenDaysAgo,
            },
          ],
        },
      ],
      properties: DEAL_PROPERTIES,
      limit: 100,
    };

    if (after) {
      body.after = after;
    }

    const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HubSpot API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      results: unknown[];
      paging?: { next?: { after?: string } };
    };

    allResults.push(...data.results);
    after = data.paging?.next?.after;
  } while (after);

  return { results: allResults };
}

export function parseHubspotToDealSnapshots(
  hubspotData: unknown,
): DealSnapshotInput[] {
  const data = hubspotData as { results?: Array<Record<string, unknown>> };
  const results = data?.results ?? [];

  const deals: DealSnapshotInput[] = [];

  for (const deal of results) {
    const id = String(deal.id ?? '');
    const props = (deal.properties ?? {}) as Record<
      string,
      string | null | undefined
    >;

    const dealStage = String(props.dealstage ?? '');
    const quickJob = props.quick_job ?? '';

    if (shouldExcludeDeal(dealStage, quickJob)) continue;

    const salesAgent = normaliseName(String(props.sales_agent ?? ''));
    const { createDate, dealAgeDays } = parseDealAge(props.createdate);

    let firstMeetingDate: Date | null = null;
    if (props.first_meeting_date) {
      const d = new Date(props.first_meeting_date);
      if (!isNaN(d.getTime())) firstMeetingDate = d;
    }

    let closedWonDate: Date | null = null;
    const closedWonDateStr =
      props.closedate ??
      props.hs_date_entered_agreement_sent ??
      props.hs_date_entered_interview_scheduled ??
      props.hs_date_entered_resumes_sent ??
      props.hs_date_entered_recruiting;
    if (closedWonDateStr) {
      const d = new Date(closedWonDateStr);
      if (!isNaN(d.getTime())) closedWonDate = d;
    }

    const isClosedWon = isClosedWonDeal(dealStage, props);
    const isOpenPrebilling = isPreBillingDeal(dealStage);

    deals.push({
      dealId: id,
      salesAgent,
      dealStage,
      createDate,
      firstMeetingDate,
      closedWonDate,
      isClosedWon,
      isOpenPrebilling,
      dealAgeDays,
    });
  }

  return deals;
}

export function parseHubspotCSV(csvText: string): DealSnapshotInput[] {
  const rows = csvToObjects(csvText);
  const deals: DealSnapshotInput[] = [];

  for (const row of rows) {
    const dealId =
      row['Deal ID'] ?? row['deal_id'] ?? row['dealId'] ?? row['id'] ?? '';
    const dealStage =
      row['Deal Stage'] ?? row['deal_stage'] ?? row['dealstage'] ?? '';
    const quickJob =
      row['Quick Job'] ?? row['quick_job'] ?? row['quickJob'] ?? '';

    if (shouldExcludeDeal(dealStage, quickJob)) continue;

    const rawAgent =
      row['Sales Agent'] ??
      row['sales_agent'] ??
      row['salesAgent'] ??
      row['Owner'] ??
      '';
    const salesAgent = normaliseName(rawAgent);

    const createDateStr =
      row['Create Date'] ??
      row['create_date'] ??
      row['createdate'] ??
      row['createDate'] ??
      '';
    const { createDate, dealAgeDays } = parseDealAge(createDateStr || null);

    const firstMeetingDateStr =
      row['First Meeting Date'] ??
      row['first_meeting_date'] ??
      row['firstMeetingDate'] ??
      '';
    let firstMeetingDate: Date | null = null;
    if (firstMeetingDateStr) {
      const d = new Date(firstMeetingDateStr);
      if (!isNaN(d.getTime())) firstMeetingDate = d;
    }

    const closedWonDateStr =
      row['Close Date'] ??
      row['close_date'] ??
      row['closedate'] ??
      row['Closed Won Date'] ??
      '';
    let closedWonDate: Date | null = null;
    if (closedWonDateStr) {
      const d = new Date(closedWonDateStr);
      if (!isNaN(d.getTime())) closedWonDate = d;
    }

    const isClosedWon = isClosedWonDeal(dealStage, {
      hs_date_entered_recruiting:
        row['hs_date_entered_recruiting'] ??
        row['Date Entered Recruiting'] ??
        undefined,
      hs_date_entered_resumes_sent:
        row['hs_date_entered_resumes_sent'] ??
        row['Date Entered Resumes Sent'] ??
        undefined,
      hs_date_entered_interview_scheduled:
        row['hs_date_entered_interview_scheduled'] ??
        row['Date Entered Interview Scheduled'] ??
        undefined,
      hs_date_entered_agreement_sent:
        row['hs_date_entered_agreement_sent'] ??
        row['Date Entered Agreement Sent'] ??
        undefined,
    });

    const isOpenPrebilling = isPreBillingDeal(dealStage);

    deals.push({
      dealId: dealId || `csv-${Math.random().toString(36).slice(2)}`,
      salesAgent,
      dealStage,
      createDate,
      firstMeetingDate,
      closedWonDate,
      isClosedWon,
      isOpenPrebilling,
      dealAgeDays,
    });
  }

  return deals;
}
