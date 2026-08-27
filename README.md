# Fahrenheit One — Pre-Opening Sales Dashboard
**@ Hakoah Paddington | June 2026 – April 2027**

## Stack
- **Next.js 16** (App Router) + **React 19**
- **Supabase** (PostgreSQL + Auth)
- **Vercel** (deployment)
- **Recharts** (data visualisation)

## Setup

### 1. Supabase
1. Create a new Supabase project at supabase.com
2. Run `supabase-schema.sql` in the SQL editor
3. Copy your project URL and anon key

### 2. Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GHL_WEBHOOK_SECRET=your_chosen_secret
SESSION_SECRET=any_long_random_string   # signs the login session cookie
```
All five are required at runtime (the same set must be set in Vercel → Project → Environment Variables).

### 3. Local Development
```bash
npm install
npm run dev
```

### 4. Deploy to Vercel
```bash
# Push to GitHub, then connect repo in Vercel
# Add environment variables in Vercel dashboard
# Deploy automatically on push to main
```

### 5. GHL Webhook
In GoHighLevel:
- Go to Settings → Integrations → Webhooks
- Add webhook URL: `https://your-vercel-url.vercel.app/api/webhook/ghl`
- Add header: `x-ghl-secret: your_chosen_secret`
- Select triggers: Contact Created, Contact Updated, Opportunity Stage Changed

## Dashboard Sections
1. **Executive Overview** — KPIs, pipeline, weekly trend
2. **Marketing Performance** — Channel ROI and conversion rates
3. **Market Intelligence** — Generation × Tribe × Membership lenses
4. **Cross Analysis** — Heat map intersections
5. **Sales Performance** — Consultant metrics and funnel
6. **Membership Products** — Product demand and conversion
7. **Opening Readiness** — Capacity forecast and milestone tracker
8. **Team Access** (admin only) — grant / suspend / delete dashboard access

## Access & Login
- The dashboard is gated; users sign in at `/login` (signed httpOnly session cookie, 7-day expiry, enforced by `proxy.ts`).
- Accounts live in **Supabase Auth**. Admins manage them from the in-app **Team Access** section — grant access (email + temp password + role), change role, suspend, or delete.
- Roles: `admin` (full access incl. Team Access) and `member` (view-only of the dashboard).
- Suspend/delete take effect on the user's **next request** (status is re-checked live, not just at login).
- Requires the `SESSION_SECRET` env var (see above) in addition to the Supabase keys.

## Managing the dashboard via Supabase
Most content is editable directly in the **Supabase Table Editor** — no code change, no redeploy (the dashboard reads it on each load):

| What you change | Table | Notes |
|---|---|---|
| Leads & all their attributes | `leads` | Drives every chart, MRR, and conversion |
| Membership products: name, `$`/mo, target, track, visibility | `membership_products` | `is_active = false` hides a product; chart labels follow `name`; cards join to leads by `slug` |
| Opening-day milestones (the timeline) | `milestones` | Set `actual_date` to mark one **done**; ordered by `target_date` |
| Opening-day targets (1,200 / 600 / 600) + opening date | `settings` (single row) | Falls back to those defaults if the table/row is absent |
| Team / user access | Supabase Auth (or the **Team Access** UI) | — |

**Still code-only** (require an edit + push to `main`): display labels for generation / tribe / lead-source / stage (`lib/constants.ts`), brand colors, and the Sales-team consultants (currently placeholder data).

See `supabase-schema.sql` — the **MIGRATIONS** section at the bottom holds the one-time scripts to bring an existing database up to date (settings table, membership-taxonomy reconciliation).

## Data Flow
```
GHL Form Submission
       ↓
GHL Webhook → /api/webhook/ghl
       ↓
Supabase leads table
       ↓
Dashboard (real-time)
```

## Manual Data Entry
Use the "Add Lead" button in the sidebar for walk-ins and manual entries.
When GHL webhook is live, this becomes the backup method only.
