# ANCHOR Coaching Intelligence

Internal sales coaching tool for BruntWork, used by Elizna Wright and Renier Linde to run weekly rep coaching sessions.

---

## What it does

Every week, the app pulls call scoring data from Gong and deal pipeline data from HubSpot, runs both through Claude (Anthropic) to generate a plain-English coaching brief, and presents it in three views:

1. **Weekly Brief** — An executive signal for the CRO, the top team-wide patterns dragging deals down, and a per-rep coaching note. Each rep card shows what they are doing well, where their deals are slipping, and one concrete action for the week ahead. The "Share with rep" button generates a ready-to-send Google Chat message.

2. **Deal Risk Radar** — Highlights reps who have open pre-billing deals but are scoring below the team average on the eight skills that most directly influence whether a deal closes. Red border = critical gap (>10pp below team average). Amber = watch (5–10pp below).

3. **Rep Coaching Cards** — ANCHOR section breakdown (Approach, Needs, Challenge, Handle, Orchestrate, Result) as horizontal bars for each rep. Bars turn red when a rep is more than 5pp below the team average for that section. Includes the one-line weekly coaching priority from the AI brief.

---

## Running locally

```bash
npm install
cp .env.example .env
# Fill in your credentials in .env
npm run db:migrate   # Creates the database schema
npm run dev          # Starts on http://localhost:3000
```

---

## Weekly sync

A Railway cron service hits the sync endpoint every Saturday at 00:00 UTC:

```
GET /api/sync
Header: x-cron-secret: <your CRON_SECRET>
```

The endpoint:
1. Calculates the Monday of the current week as the snapshot identifier
2. Fetches the past 7 days of Gong scorecard data
3. Fetches recently modified HubSpot deals
4. Generates the AI brief
5. Saves everything to Postgres
6. Returns `{ success: true, snapshotId }` or `{ alreadySynced: true }` if already run

---

## CSV fallback

If the API connections are unavailable, you can upload data manually from the dashboard. Click "Upload Gong CSV + HubSpot CSV" at the top of the page, select both files, and hit "Generate Brief". The app will parse the CSVs, run the AI brief, and save a snapshot tagged as "Manual".

### Expected Gong CSV columns
`Rep Name, Scored Calls, Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14, Q15, Q16, Q17, Q18, Q19, Q20, Q21, Q22, Q23, Q24, Q25, Q26, C3, C4, C5`

### Expected HubSpot CSV columns
`Deal ID, Deal Stage, Sales Agent, Create Date, First Meeting Date, Close Date, Quick Job, hs_date_entered_recruiting, hs_date_entered_resumes_sent, hs_date_entered_interview_scheduled, hs_date_entered_agreement_sent`

---

## API credentials

### Gong API key
1. Log in to Gong → Settings → API → Create API Key
2. Copy the Access Key and Access Secret
3. Find your scorecard ID from the Gong scorecards page URL

### HubSpot token
1. Log in to HubSpot → Settings → Integrations → Private Apps
2. Create a private app with CRM read access
3. Copy the token

### Anthropic API key
1. Log in to [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create key

---

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Railway provides this automatically) |
| `GONG_ACCESS_KEY` | Gong API access key |
| `GONG_ACCESS_SECRET` | Gong API access secret |
| `GONG_SCORECARD_ID` | The ID of the ANCHOR scorecard in Gong |
| `HUBSPOT_TOKEN` | HubSpot private app token |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `CRON_SECRET` | Random secret to protect the /api/sync endpoint |
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployed app (used for internal references) |

---

## Deploy to Railway

1. Create a new Railway project
2. Add a **Postgres** plugin to the project
3. Add a new service pointing at this repository
4. Set **Build command**: `npm run build`
5. Set **Start command**: `npm start`
6. Add all environment variables from the table above (Railway auto-sets `DATABASE_URL` from the Postgres plugin)
7. Deploy

### Add the weekly cron

In Railway, add a **Cron** service with:
- **Schedule**: `0 0 * * 6` (Saturdays at 00:00 UTC)
- **Command**: `curl -s -H "x-cron-secret: $CRON_SECRET" https://your-app.railway.app/api/sync`

---

## Auth note

This MVP has no authentication. The app is intended for internal use only — keep the URL private or add Railway IP allowlisting. Before any wider rollout, add authentication (e.g. NextAuth with Google OAuth restricted to `@bruntwork.co` emails).

---

## Name normalisation

The app automatically maps Gong display names to canonical names. Current mappings:

| Gong name | Display name |
|---|---|
| Mateo Salazar Ocampo | Mateo Salazar |
| Thais Meisel Dobrzanska | Thais Meisel |
| Allan Christopher Barcelona | Ace Barcelona |
| Liezl Bothma | Liezl Jacobs |
| Mevashan Kyle Gounden | Kyle Gounden |
| Rameez Frederics | Rameez Fredericks |

To add a new mapping, edit `src/lib/name-normaliser.ts`.

---

## Score weighting

The ANCHOR scorecard has 26 questions. Critical questions carry more weight in the overall score:

- **Weight 7 (critical)**: Q1, Q4, Q6, Q13, Q15, Q22, Q25, Q26
- **Weight 4 (standard)**: All other questions

Overall score = `sum(score × weight) / sum(weights)`
