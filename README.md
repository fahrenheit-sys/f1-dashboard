# Fahrenheit One — Pre-Opening Sales Dashboard
**@ Hakoah White City | June 2026 – April 2027**

## Stack
- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + real-time)
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
```

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
