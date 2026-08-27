'use client'
import { useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import type { Stats } from '@/lib/stats'
import type { SessionUser } from '@/lib/session'
import type { DashboardConfig, Product, Milestone } from '@/lib/config'
import { addLead, type AddLeadInput } from './actions'
import { logout } from './auth-actions'
import { UI } from '@/lib/theme'
import {
  GENERATION_LABELS, TRIBE_LABELS,
  SOURCE_LABELS, STAGE_LABELS, GENERATION_COLORS,
  TRIBE_COLORS, MEMBERSHIP_COLORS, BRAND,
  PLUM_SEQUENTIAL, PLUM_ORDINAL, GENERATION_ORDER, TRIBE_ORDER,
} from '@/lib/constants'

// Clay stepped down so it clears 4.5:1 as small text on a light surface.
const ACCENT_TEXT = BRAND.accentText

// Order a dimension by its canonical sequence (generations oldest→youngest,
// tribes through the day) rather than by value, so neighbouring bars and donut
// slices are always the pairs the palette was validated against.
function byOrder<T extends { key: string }>(rows: T[], order: string[]): T[] {
  return [...rows].sort((a, b) => {
    const ia = order.indexOf(a.key), ib = order.indexOf(b.key)
    return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib)
  })
}

// Pick a step from a magnitude ramp for a 0–1 intensity.
function rampStep(ramp: readonly string[], intensity: number) {
  return ramp[Math.min(ramp.length - 1, Math.max(0, Math.round(intensity * (ramp.length - 1))))]
}

// ── Icons ─────────────────────────────────────────────────
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const Icons = {
  overview:    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  marketing:   "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z",
  sales:       "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  intel:       "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  product:     "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  readiness:   "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  addlead:     "M12 4v16m8-8H4",
  cross:       "M4 6h16M4 12h16M4 18h7",
  team:        "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  logout:      "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
}

// ── Shared input styles ───────────────────────────────────
const inputStyle: CSSProperties = {
  width: '100%', background: UI.surface, border: `1px solid ${UI.borderStrong}`,
  borderRadius: UI.radiusSm, padding: '9px 12px', color: UI.text, fontSize: 13, outline: 'none',
}
const labelStyle: CSSProperties = {
  fontSize: 11, color: UI.textMuted, letterSpacing: '0.02em', display: 'block', marginBottom: 5,
}

// ── Helpers ───────────────────────────────────────────────
function pct(n: number, total: number) { return total > 0 ? ((n / total) * 100).toFixed(1) : '0.0' }
function fmt(n: number) { return n.toLocaleString() }
function fmtMRR(n: number) { return `$${Math.round(n).toLocaleString()}` }
function fmtDate(s: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: UI.surface, border: `1px solid ${UI.border}`, borderRadius: 10, padding: '10px 14px', boxShadow: UI.shadow }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: UI.textFaint, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontSize: 12, color: UI.text }}>
          <span style={{ color: p.color || UI.textMuted }}>●</span> {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

const AXIS_TICK = { fill: UI.textFaint, fontSize: 10 }
const AXIS_TICK_STRONG = { fill: UI.textMuted, fontSize: 11 }

// Legend labels wear text tokens, never the series colour — the swatch beside
// them already carries identity.
const legendLabel = (v: string) => <span style={{ fontSize: 11, color: UI.textMuted }}>{v}</span>

// ── KPI Card ──────────────────────────────────────────────
function KPICard({ label, value, sub, accent, progress, target }: {
  label: string; value: string; sub?: string
  accent?: 'community' | 'local' | 'accent' | 'neutral'
  progress?: number; target?: string
}) {
  return (
    <div className={`kpi-card ${accent ?? 'neutral'}`}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div className="serif" style={{ fontSize: 34, fontWeight: 500, color: UI.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: UI.textMuted, marginTop: 6 }}>{sub}</div>}
      {progress !== undefined && (
        <div style={{ marginTop: 12 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{
              width: `${Math.min(progress, 100)}%`,
              background: accent === 'community' ? BRAND.community : accent === 'local' ? BRAND.local : accent === 'accent' ? BRAND.accent : BRAND.neutral
            }} />
          </div>
          {target && <div style={{ fontSize: 10, color: UI.textFaint, marginTop: 5, fontFamily: 'var(--mono)' }}>{Math.round(progress ?? 0)}% of {target} target</div>}
        </div>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="serif" style={{ fontSize: 27, fontWeight: 400, color: UI.text }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: UI.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Dimension Bar ─────────────────────────────────────────
function DimBar({ label, value, total, color, sold }: { label: string; value: number; total: number; color: string; sold?: number }) {
  const w = total > 0 ? (value / total) * 100 : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, color: UI.text }}>{label}</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {sold !== undefined && <span style={{ fontSize: 10, color: ACCENT_TEXT, fontFamily: 'var(--mono)' }}>{sold} sold</span>}
          <span style={{ fontSize: 12, color: UI.textMuted, fontFamily: 'var(--mono)' }}>{value} <span style={{ opacity: 0.6 }}>({pct(value, total)}%)</span></span>
        </div>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${w}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Add Lead Modal ────────────────────────────────────────
function AddLeadModal({ onClose, products }: { onClose: () => void; products: Product[] }) {
  const router = useRouter()
  // Selectable membership interests follow the Supabase product catalog, plus "Not sure".
  const membershipOptions: [string, string][] = [...products.map(p => [p.slug, p.name] as [string, string]), ['not_sure', 'Not sure']]
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', mobile: '',
    track: 'community', membership_interest: 'not_sure',
    preferred_time: 'early_morning', year_of_birth: '',
    lead_source: 'hakoah_newsletter', is_hakoah_member: false,
    stage: 'vip_waitlist',
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await addLead(form as AddLeadInput)
      if (!result.ok) { setError(result.error); return }
      router.refresh()
      onClose()
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: UI.surface, border: `1px solid ${UI.border}`, borderRadius: UI.radius, padding: 30, width: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: UI.shadow }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div className="serif" style={{ fontSize: 23, fontWeight: 500, color: UI.text }}>Add New Lead</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: UI.textFaint, cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[['first_name','First Name'],['last_name','Last Name'],['email','Email'],['mobile','Mobile']].map(([k,l]) => (
            <div key={k} style={{ gridColumn: k === 'email' || k === 'mobile' ? '1/-1' : 'auto' }}>
              <label style={labelStyle}>{l}</label>
              <input value={(form as any)[k]} onChange={e => set(k, e.target.value)} style={inputStyle} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>Track</label>
            <select value={form.track} onChange={e => set('track', e.target.value)} style={inputStyle}>
              <option value="community">Community</option>
              <option value="local">Local</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Year of Birth</label>
            <input type="number" placeholder="1985" value={form.year_of_birth} onChange={e => set('year_of_birth', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Membership Interest</label>
            <select value={form.membership_interest} onChange={e => set('membership_interest', e.target.value)} style={inputStyle}>
              {membershipOptions.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Preferred Time</label>
            <select value={form.preferred_time} onChange={e => set('preferred_time', e.target.value)} style={inputStyle}>
              <option value="early_morning">Early Morning (5–8am)</option>
              <option value="mid_morning">Mid Morning (8–11am)</option>
              <option value="lunchtime">Lunchtime (11am–2pm)</option>
              <option value="afternoon">Afternoon (2–5pm)</option>
              <option value="evening">Evening (5–8pm)</option>
              <option value="weekends">Weekends</option>
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Lead Source</label>
            <select value={form.lead_source} onChange={e => set('lead_source', e.target.value)} style={inputStyle}>
              {Object.entries(SOURCE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="hakoah" checked={form.is_hakoah_member} onChange={e => set('is_hakoah_member', e.target.checked)} />
            <label htmlFor="hakoah" style={{ fontSize: 13, color: UI.text }}>Existing Hakoah Club member</label>
          </div>
        </div>
        {error && (
          <div style={{ marginTop: 16, padding: '10px 12px', background: '#FBEFE9', border: `1px solid ${BRAND.clay}`, borderRadius: UI.radiusSm, fontSize: 12.5, color: BRAND.clayDeep }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} disabled={pending} style={{ flex: 1, padding: '11px', background: UI.surface, border: `1px solid ${UI.borderStrong}`, borderRadius: UI.radiusSm, color: UI.textMuted, cursor: pending ? 'default' : 'pointer', fontSize: 13.5 }}>Cancel</button>
          <button onClick={submit} disabled={pending}
            style={{ flex: 2, padding: '11px', background: BRAND.clayHover, border: 'none', borderRadius: UI.radiusSm, color: '#fff', cursor: pending ? 'default' : 'pointer', fontSize: 13.5, fontWeight: 600, opacity: pending ? 0.6 : 1 }}>
            {pending ? 'Adding…' : 'Add to Pipeline'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// DASHBOARD SECTIONS
// ══════════════════════════════════════════════════════════

function ExecutiveOverview({ stats }: { stats: Stats }) {
  const communityFounders = stats.soldByTrack.community ?? 0
  const localFounders     = stats.soldByTrack.local ?? 0

  const stageData = Object.entries(stats.byStage)
    .map(([k, v]) => ({ name: STAGE_LABELS[k] ?? k, value: v }))
    .sort((a, b) => b.value - a.value)

  const weeklyData = stats.weekly

  return (
    <div className="fade-up">
      <SectionHead title="Executive Overview" sub="One-screen summary of pre-opening pipeline performance" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
        <KPICard label="Total Leads" value={fmt(stats.total)} sub="All tracks combined" accent="neutral"
          progress={(stats.total / 1000) * 100} target="1,000" />
        <KPICard label="Founding Members" value={fmt(stats.sold)} sub="Agreements signed" accent="accent"
          progress={(stats.sold / stats.targetTotal) * 100} target={fmt(stats.targetTotal)} />
        <KPICard label="Projected MRR" value={fmtMRR(stats.mrr)} sub="At founding rates" accent="accent" />
        <KPICard label="Days to Opening" value={fmt(stats.daysToOpen)} sub="April 2027" accent="neutral" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 26 }}>
        <KPICard label="Community Leads" value={fmt(stats.community)} sub={`${pct(stats.community, stats.total)}% of pipeline`} accent="community"
          progress={(communityFounders / stats.targetCommunity) * 100} target={`${stats.targetCommunity} members`} />
        <KPICard label="Community Members" value={fmt(communityFounders)} accent="community"
          progress={(communityFounders / stats.targetCommunity) * 100} target={String(stats.targetCommunity)} />
        <KPICard label="Local Leads" value={fmt(stats.local)} sub={`${pct(stats.local, stats.total)}% of pipeline`} accent="local"
          progress={(localFounders / stats.targetLocal) * 100} target={`${stats.targetLocal} members`} />
        <KPICard label="Local Members" value={fmt(localFounders)} accent="local"
          progress={(localFounders / stats.targetLocal) * 100} target={String(stats.targetLocal)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>PIPELINE BY STAGE</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageData} layout="vertical">
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={AXIS_TICK_STRONG} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(42,24,48,0.05)' }} />
              {/* One series — bar length already encodes magnitude, so a single
                  hue does the job. Colouring by rank would spend the identity
                  channel re-saying what the bars say. */}
              <Bar dataKey="value" fill={BRAND.community} radius={[0, 3, 3, 0]} name="Leads" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>WEEKLY LEAD TREND</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyData}>
              <CartesianGrid stroke={UI.border} vertical={false} />
              <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="plainline" iconSize={12} formatter={legendLabel} />
              <Line type="monotone" dataKey="leads" stroke={BRAND.community} strokeWidth={2} dot={false} name="Leads" isAnimationActive={false} />
              <Line type="monotone" dataKey="sold" stroke={BRAND.accent} strokeWidth={2} dot={false} name="Sold" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14 }}>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 8 }}>OVERALL CONVERSION</div>
          <div className="serif" style={{ fontSize: 38, color: ACCENT_TEXT, fontWeight: 500 }}>{stats.convRate.toFixed(1)}%</div>
          <div style={{ fontSize: 11.5, color: UI.textMuted, marginTop: 4 }}>Lead → Founding Member</div>
        </div>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 8 }}>OPENING DAY PROGRESS</div>
          <div className="serif" style={{ fontSize: 38, color: UI.text, fontWeight: 500 }}>{pct(stats.sold, stats.targetTotal)}%</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${Math.min((stats.sold / stats.targetTotal) * 100, 100)}%`, background: `linear-gradient(90deg, ${BRAND.community}, ${BRAND.accent})` }} />
          </div>
          <div style={{ fontSize: 11.5, color: UI.textMuted, marginTop: 6 }}>{fmt(stats.sold)} of {fmt(stats.targetTotal)} target members</div>
        </div>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 8 }}>PROJECTED ANNUAL REVENUE</div>
          <div className="serif" style={{ fontSize: 38, color: UI.text, fontWeight: 500 }}>{fmtMRR(stats.mrr * 12)}</div>
          <div style={{ fontSize: 11.5, color: UI.textMuted, marginTop: 4 }}>Based on founding member MRR × 12</div>
        </div>
      </div>
    </div>
  )
}

function MarketingPerformance({ stats }: { stats: Stats }) {
  const srcData = Object.entries(stats.bySrc)
    .map(([k, v]) => {
      const sold = stats.soldBySrc[k] ?? 0
      return { name: SOURCE_LABELS[k] ?? k, leads: v, sold, conv: v > 0 ? +((sold / v) * 100).toFixed(1) : 0 }
    })
    .sort((a, b) => b.leads - a.leads)

  return (
    <div className="fade-up">
      <SectionHead title="Marketing Performance" sub="Which channels are generating the best leads and conversions" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>LEADS BY CHANNEL</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={srcData}>
              <CartesianGrid stroke={UI.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: UI.textFaint, fontSize: 9 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={60} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(42,24,48,0.05)' }} />
              <Legend iconType="circle" iconSize={8} formatter={legendLabel} />
              <Bar dataKey="leads" fill={BRAND.community} radius={[3, 3, 0, 0]} name="Leads" isAnimationActive={false} />
              <Bar dataKey="sold" fill={BRAND.accent} radius={[3, 3, 0, 0]} name="Sold" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>CONVERSION RATE BY CHANNEL</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={srcData} layout="vertical">
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: UI.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(42,24,48,0.05)' }} />
              {/* Single hue — bar length is the rate. The SIGNAL column in the
                  table below carries the high/on-target/review call as text. */}
              <Bar dataKey="conv" fill={BRAND.accent} radius={[0, 3, 3, 0]} name="Conv %" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 12 }}>CHANNEL PERFORMANCE TABLE</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>CHANNEL</th><th>LEADS</th><th>SOLD</th><th>CONV RATE</th><th>TRACK MIX</th><th>SIGNAL</th>
            </tr>
          </thead>
          <tbody>
            {srcData.map(row => (
              <tr key={row.name}>
                <td style={{ fontWeight: 500, color: UI.text }}>{row.name}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{row.leads}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: ACCENT_TEXT }}>{row.sold}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: row.conv > 15 ? ACCENT_TEXT : row.conv > 8 ? UI.text : UI.textFaint }}>{row.conv}%</td>
                <td>
                  <span className="track-pill community" style={{ marginRight: 4 }}>C</span>
                  <span className="track-pill local">L</span>
                </td>
                <td style={{ fontSize: 11, color: row.conv > 15 ? ACCENT_TEXT : UI.textMuted }}>
                  {row.conv > 15 ? '↑ High performer' : row.conv > 8 ? '→ On target' : '↓ Review'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MarketIntelligence({ stats, membershipLabels }: { stats: Stats; membershipLabels: Record<string, string> }) {
  const [lens, setLens] = useState<'generation' | 'tribe' | 'membership'>('generation')

  // Rendered in canonical order (generations oldest→youngest, tribes through
  // the day) rather than by value, so a colour always belongs to the same entity
  // and neighbouring slices are the pairs the palette was validated against.
  const genData  = byOrder(Object.entries(stats.byGen).map(([k, v]) => ({
    key: k, name: GENERATION_LABELS[k] ?? k, value: v,
    sold: stats.soldByGen[k] ?? 0,
    color: GENERATION_COLORS[k] ?? BRAND.neutral,
  })), GENERATION_ORDER)

  const tribeData = byOrder(Object.entries(stats.byTribe).map(([k, v]) => ({
    key: k, name: TRIBE_LABELS[k] ?? k, value: v,
    sold: stats.soldByTribe[k] ?? 0,
    color: TRIBE_COLORS[k] ?? BRAND.neutral,
  })), TRIBE_ORDER)

  const memData = Object.entries(stats.byMem).map(([k, v]) => ({
    key: k, name: membershipLabels[k] ?? k, value: v,
    sold: stats.soldByMem[k] ?? 0,
    color: MEMBERSHIP_COLORS[k] ?? BRAND.neutral,
  })).sort((a, b) => b.value - a.value)

  const activeData = lens === 'generation' ? genData : lens === 'tribe' ? tribeData : memData

  const pill = (active: boolean): CSSProperties => ({
    padding: '7px 16px', borderRadius: 999, border: `1px solid ${active ? BRAND.plum : UI.borderStrong}`,
    background: active ? BRAND.plum : UI.surface, color: active ? '#fff' : UI.textMuted,
    cursor: 'pointer', fontSize: 12, fontFamily: 'var(--mono)', letterSpacing: '0.04em', textTransform: 'uppercase',
  })

  return (
    <div className="fade-up">
      <SectionHead title="Market Intelligence" sub="Who is joining — viewed through three strategic lenses" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['generation','tribe','membership'] as const).map(l => (
          <button key={l} onClick={() => setLens(l)} style={pill(lens === l)}>
            {l === 'generation' ? 'Generation' : l === 'tribe' ? 'Tribe' : 'Membership'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>
            {lens === 'generation' ? 'LEAD MIX BY GENERATION' : lens === 'tribe' ? 'LEAD MIX BY TRIBE' : 'LEAD MIX BY MEMBERSHIP TYPE'}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={activeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={52} paddingAngle={1.5} isAnimationActive={false}>
                {activeData.map((d, i) => <Cell key={i} fill={d.color} stroke={UI.surface} strokeWidth={2} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={legendLabel} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>LEADS & CONVERSIONS</div>
          <div style={{ paddingTop: 4 }}>
            {activeData.map(d => (
              <DimBar key={d.name} label={d.name} value={d.value} total={stats.total} color={d.color} sold={d.sold} />
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>
          COMMUNITY vs LOCAL SPLIT — {lens.toUpperCase()}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={activeData.slice(0, 6)}>
            <CartesianGrid stroke={UI.border} vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(42,24,48,0.05)' }} />
            <Legend iconType="circle" iconSize={8} formatter={legendLabel} />
            <Bar dataKey="value" name="Total Leads" fill={BRAND.community} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="sold" name="Converted" fill={BRAND.accent} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CrossAnalysis({ stats, membershipLabels, products }: { stats: Stats; membershipLabels: Record<string, string>; products: Product[] }) {
  const [xAxis, setXAxis] = useState<'generation' | 'tribe'>('generation')

  const LABELS = xAxis === 'generation' ? GENERATION_LABELS : TRIBE_LABELS
  const COLORS_MAP = xAxis === 'generation' ? GENERATION_COLORS : TRIBE_COLORS
  const crossData = xAxis === 'generation' ? stats.crossGenMem : stats.crossTribeMem

  const allMems = products.map(p => p.slug)
  const rows = Object.entries(crossData).map(([dim, memMap]) => ({
    dim: LABELS[dim] ?? dim,
    color: COLORS_MAP[dim] ?? BRAND.neutral,
    ...Object.fromEntries(allMems.map(m => [m, memMap[m] ?? 0])),
    total: Object.values(memMap).reduce((s, v) => s + v, 0),
  }))

  const pill = (active: boolean): CSSProperties => ({
    padding: '6px 14px', borderRadius: 999, border: `1px solid ${active ? BRAND.plum : UI.borderStrong}`,
    background: active ? BRAND.plum : UI.surface, color: active ? '#fff' : UI.textMuted,
    cursor: 'pointer', fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase',
  })

  return (
    <div className="fade-up">
      <SectionHead title="Cross Analysis" sub="Intersecting dimensions to reveal hidden insights" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, color: UI.textMuted }}>View:</span>
        {(['generation','tribe'] as const).map(x => (
          <button key={x} onClick={() => setXAxis(x)} style={pill(xAxis === x)}>
            {x} × Membership
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>
          {xAxis.toUpperCase()} × MEMBERSHIP TYPE — HEAT MAP
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 130 }}>{xAxis.toUpperCase()}</th>
                {allMems.map(m => <th key={m} style={{ textAlign: 'center' }}>{membershipLabels[m] ?? m}</th>)}
                <th style={{ textAlign: 'center' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const max = Math.max(...allMems.map(m => (row as any)[m]))
                return (
                  <tr key={row.dim}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: UI.text }}>{row.dim}</span>
                      </div>
                    </td>
                    {allMems.map(m => {
                      const v = (row as any)[m] as number
                      const intensity = max > 0 ? v / max : 0
                      return (
                        <td key={m} style={{ textAlign: 'center' }}>
                          {/* Magnitude = one hue, light→dark. A second hue at the
                              top of the ramp would read as a different category. */}
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 38, height: 28, borderRadius: 6,
                            background: v ? rampStep(PLUM_SEQUENTIAL, intensity) : 'transparent',
                            fontFamily: 'var(--mono)', fontSize: 12,
                            color: !v ? UI.textFaint : intensity > 0.4 ? '#fff' : UI.text
                          }}>{v || '—'}</div>
                        </td>
                      )
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 600, fontFamily: 'var(--mono)', color: ACCENT_TEXT }}>{row.total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>
          {xAxis.toUpperCase()} × MEMBERSHIP — STACKED VIEW
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows}>
            <CartesianGrid stroke={UI.border} vertical={false} />
            <XAxis dataKey="dim" tick={AXIS_TICK_STRONG} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(42,24,48,0.05)' }} />
            <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 10, color: UI.textMuted }}>{membershipLabels[v] ?? v}</span>} />
            {/* 2px surface stroke keeps a visible gap between stacked segments */}
            {allMems.map(m => (
              <Bar key={m} dataKey={m} stackId="a" fill={MEMBERSHIP_COLORS[m]} name={m}
                stroke={UI.surface} strokeWidth={2} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function SalesPerformance({ stats }: { stats: Stats }) {
  const consultants = [
    { name: 'Sarah K.', assigned: 142, contacted: 118, conversations: 89, tours: 34, sold: 22, revenue: 22 * 129 },
    { name: 'Michael R.', assigned: 115, contacted: 98, conversations: 71, tours: 28, sold: 17, revenue: 17 * 119 },
    { name: 'Emma L.', assigned: 130, contacted: 110, conversations: 82, tours: 31, sold: 19, revenue: 19 * 124 },
  ]

  const pipelineStages = ['awareness','vip_waitlist','event_attended','proposal','founding_member','member']
  const funnelData = pipelineStages.map(s => ({
    stage: STAGE_LABELS[s] ?? s,
    count: stats.byStage[s] ?? 0,
  }))

  return (
    <div className="fade-up">
      <SectionHead title="Sales Performance" sub="Pre-sales team activity and pipeline management" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <KPICard label="Total Pipeline Value" value={fmtMRR(stats.mrr * 12)} sub="Annualised MRR" accent="accent" />
        <KPICard label="Avg Response Time" value="< 4 hrs" sub="Target: same day" accent="community" />
        <KPICard label="Follow-up Compliance" value="94%" sub="Tasks completed on time" accent="community" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 12 }}>CONSULTANT PERFORMANCE</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>CONSULTANT</th><th>ASSIGNED</th><th>CONTACTED</th>
              <th>CONVERSATIONS</th><th>TOURS</th><th>SOLD</th>
              <th>CONV RATE</th><th>REVENUE</th>
            </tr>
          </thead>
          <tbody>
            {consultants.map(c => (
              <tr key={c.name}>
                <td style={{ fontWeight: 600, color: UI.text }}>{c.name}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.assigned}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.contacted}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.conversations}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.tours}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: ACCENT_TEXT, fontWeight: 600 }}>{c.sold}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: UI.text }}>{pct(c.sold, c.assigned)}%</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmtMRR(c.revenue)}/mo</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>PIPELINE FUNNEL</div>
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', height: 180 }}>
          {funnelData.map((d, i) => {
            const maxVal = Math.max(...funnelData.map(f => f.count))
            const h = maxVal > 0 ? (d.count / maxVal) * 160 : 0
            return (
              <div key={d.stage} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: ACCENT_TEXT }}>{d.count}</div>
                {/* Funnel position is ordinal — one hue, stepping lighter as the
                    pipeline narrows, so the order reads in the colour. */}
                <div style={{ width: '78%', height: h, background: PLUM_ORDINAL[Math.min(i, PLUM_ORDINAL.length - 1)], borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: UI.textFaint, textAlign: 'center', letterSpacing: '0.04em' }}>{d.stage}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MembershipIntelligence({ stats, products }: { stats: Stats; products: Product[] }) {
  return (
    <div className="fade-up">
      <SectionHead title="Membership Product Intelligence" sub="Which products are generating demand and converting" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
        {products.map(p => {
          const leads = stats.byMem[p.slug] ?? 0
          const sold  = stats.soldByMem[p.slug] ?? 0
          const convR = leads > 0 ? (sold / leads) * 100 : 0
          const progress = p.target > 0 ? (sold / p.target) * 100 : 0
          const color = MEMBERSHIP_COLORS[p.slug] ?? BRAND.neutral
          return (
            <div key={p.slug} className="card" style={{ borderLeft: `3px solid ${color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5, color: UI.text }}>{p.name}</div>
                  <span className={`track-pill ${p.track === 'both' ? 'both' : p.track}`} style={{ marginTop: 6, display: 'inline-flex' }}>
                    {p.track === 'community' ? 'Community Only' : p.track === 'local' ? 'Local' : 'Both Tracks'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 18, color: ACCENT_TEXT, fontWeight: 600 }}>${p.rate}<span style={{ fontSize: 10, opacity: 0.6 }}>/mo</span></div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {[['Leads', leads], ['Sold', sold], ['Conv %', `${convR.toFixed(1)}%`]].map(([l, v]) => (
                  <div key={l as string} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontFamily: 'var(--mono)', color: UI.text, fontWeight: 600 }}>{v}</div>
                    <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: UI.textFaint, letterSpacing: '0.1em' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: color }} />
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: UI.textFaint, marginTop: 5 }}>
                {sold} of {p.target} target
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OpeningReadiness({ stats, milestones }: { stats: Stats; milestones: Milestone[] }) {
  const tribeCapacity = Object.entries(stats.byTribe).map(([k, v]) => ({
    name: TRIBE_LABELS[k] ?? k,
    members: stats.soldByTribe[k] ?? 0,
    demand: v,
    color: TRIBE_COLORS[k] ?? BRAND.neutral,
  }))

  const genMix = Object.entries(stats.byGen)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      name: GENERATION_LABELS[k] ?? k,
      value: v,
      color: GENERATION_COLORS[k] ?? BRAND.neutral,
    }))

  return (
    <div className="fade-up">
      <SectionHead title="Opening Readiness" sub="Operational forecast for April 2027 — staffing, capacity, and demand" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KPICard label="Days to Opening" value={fmt(stats.daysToOpen)} sub="15 April 2027" accent="accent" />
        <KPICard label="Members Confirmed" value={fmt(stats.sold)} sub={`of ${stats.targetTotal} target`} accent="community"
          progress={(stats.sold / stats.targetTotal) * 100} target={fmt(stats.targetTotal)} />
        <KPICard label="Peak Demand Tribe" value="6AM Crew" sub={`${pct(stats.byTribe['early_bird'] ?? 0, stats.sold)} of members`} accent="neutral" />
        <KPICard label="Projected Opening MRR" value={fmtMRR(stats.mrr)} sub="Founding member rates" accent="accent" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>PROJECTED USAGE BY TIME SLOT</div>
          <div>
            {tribeCapacity.sort((a,b) => b.members - a.members).map(t => (
              <div key={t.name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, color: UI.text }}>{t.name}</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: ACCENT_TEXT }}>{t.members} members</span>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: UI.textFaint }}>{t.demand} interested</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(t.members / Math.max(...tribeCapacity.map(x => x.members), 1)) * 100}%`, background: t.color }} />
                </div>
                {t.members > 40 && (
                  <div style={{ fontSize: 10, color: BRAND.clayDeep, fontFamily: 'var(--mono)', marginTop: 3 }}>⚠ High demand — check capacity</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>OPENING DAY GENERATION MIX</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={genMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={42} paddingAngle={1.5} isAnimationActive={false}>
                {genMix.map((d, i) => <Cell key={i} fill={d.color} stroke={UI.surface} strokeWidth={2} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={legendLabel} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 20 }}>CAMPAIGN MILESTONE TRACKER</div>
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 1, background: UI.border }} />
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, position: 'relative' }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                background: m.done ? BRAND.accent : UI.surface,
                border: `2px solid ${m.done ? BRAND.accent : m.track === 'community' ? BRAND.community : m.track === 'local' ? BRAND.local : BRAND.neutral}`,
                position: 'absolute', left: -16
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingLeft: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: m.done ? UI.text : UI.textMuted }}>{m.name}</span>
                  <span className={`track-pill ${m.track}`}>{m.track === 'community' ? 'Community' : m.track === 'local' ? 'Local' : 'Both'}</span>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: m.done ? ACCENT_TEXT : UI.textFaint }}>{m.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════
type Section = 'overview' | 'marketing' | 'intel' | 'cross' | 'sales' | 'product' | 'readiness'

export default function Dashboard(
  { stats, user, config, mode, testCount }:
  { stats: Stats; user: SessionUser; config: DashboardConfig; mode: 'live' | 'test'; testCount: number },
) {
  const isTestMode = mode === 'test'
  const router = useRouter()
  const [section, setSection] = useState<Section>('overview')
  const [showAddLead, setShowAddLead] = useState(false)
  const isAdmin = user.role === 'admin' // dashboard admin → can reach suite Team Access

  const nav: { id: Section; label: string; icon: string }[] = [
    { id: 'overview',   label: 'Executive Overview',  icon: Icons.overview },
    { id: 'marketing',  label: 'Marketing',            icon: Icons.marketing },
    { id: 'intel',      label: 'Market Intelligence',  icon: Icons.intel },
    { id: 'cross',      label: 'Cross Analysis',       icon: Icons.cross },
    { id: 'sales',      label: 'Sales Performance',    icon: Icons.sales },
    { id: 'product',    label: 'Membership Products',  icon: Icons.product },
    { id: 'readiness',  label: 'Opening Readiness',    icon: Icons.readiness },
  ]
  const visibleNav = nav

  const doLogout = async () => { await logout(); router.replace('/login'); router.refresh() }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="sidebar on-plum">
        <div style={{ padding: '26px 20px 20px', borderBottom: `1px solid ${UI.plumLine}` }}>
          {/* Cream wordmark — the clay one disappears against the plum chrome */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/f1-wordmark-cream.png" alt="Fahrenheit One" style={{ height: 46, width: 'auto', display: 'block' }} />
          <div style={{ fontSize: 10, fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.16em', marginTop: 10 }}>@ HAKOAH PADDINGTON</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            <span className="track-pill community">Community</span>
            <span className="track-pill local">Local</span>
          </div>

          {/* Data mode. Live is the default and shows real leads only; test
              mode drops the filter so nothing is hidden from both views. */}
          <div style={{ display: 'flex', marginTop: 16, borderRadius: 6, overflow: 'hidden', border: `1px solid ${UI.plumLine}` }}>
            {(['live', 'test'] as const).map(m => {
              const on = mode === m
              return (
                <a key={m} href={m === 'live' ? '/' : '/?mode=test'}
                  style={{
                    flex: 1, textAlign: 'center', padding: '7px 0', textDecoration: 'none',
                    fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                    background: on ? (m === 'test' ? BRAND.clay : 'rgba(255,255,255,0.14)') : 'transparent',
                    color: on ? '#fff' : UI.onPlumFaint,
                  }}>
                  {m === 'live' ? 'LIVE' : 'TEST'}
                </a>
              )
            })}
          </div>
          {!isTestMode && testCount > 0 && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: UI.onPlumFaint, marginTop: 8, letterSpacing: '0.04em' }}>
              {testCount} test {testCount === 1 ? 'lead' : 'leads'} hidden
            </div>
          )}
        </div>

        <nav style={{ flex: 1, paddingTop: 8, overflowY: 'auto' }}>
          <div className="section-label">DASHBOARD</div>
          {visibleNav.map(item => (
            <a key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => setSection(item.id)} href="#">
              <Icon d={item.icon} size={15} />
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: `1px solid ${UI.plumLine}` }}>
          <button onClick={() => setShowAddLead(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 14px',
              background: BRAND.clay, border: 'none', borderRadius: 6,
              color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em' }}>
            <Icon d={Icons.addlead} size={15} />
            Add Lead
          </button>
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${UI.plumLine}`, background: 'rgba(0,0,0,0.18)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: UI.onPlumFaint }}>TOTAL LEADS</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: UI.onPlum }}>{stats.total}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: UI.onPlumFaint }}>MEMBERS</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: BRAND.clayText }}>{stats.sold}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: UI.onPlumFaint }}>DAYS TO OPEN</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: UI.onPlum }}>{stats.daysToOpen}</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: `1px solid ${UI.border}`, background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div>
            <div className="serif" style={{ fontSize: 20, color: UI.text }}>{visibleNav.find(n => n.id === section)?.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: UI.textFaint, letterSpacing: '0.16em', marginTop: 1 }}>
              PRE-OPENING INTELLIGENCE · {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: UI.textFaint }}>OPENING TARGET</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: ACCENT_TEXT }}>{stats.sold} / {stats.targetTotal} members</div>
            </div>
            <div style={{ width: 80 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min((stats.sold / stats.targetTotal) * 100, 100)}%`, background: `linear-gradient(90deg, ${BRAND.community}, ${BRAND.accent})` }} />
              </div>
            </div>
            <div style={{ width: 1, height: 32, background: UI.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12.5, color: UI.text, fontWeight: 500 }}>{user.email}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: UI.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{user.role}</div>
              </div>
              {isAdmin && (
                <a href="https://clubf1.tech/admin" title="Manage team access"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: UI.surface, border: `1px solid ${UI.borderStrong}`, borderRadius: 9, color: UI.textMuted, fontSize: 12.5, textDecoration: 'none' }}>
                  Manage access ↗
                </a>
              )}
              <button onClick={doLogout} title="Sign out"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: UI.surface, border: `1px solid ${UI.borderStrong}`, borderRadius: 9, color: UI.textMuted, cursor: 'pointer', fontSize: 12.5 }}>
                <Icon d={Icons.logout} size={14} />
                Sign out
              </button>
            </div>
          </div>
        </div>

        {isTestMode && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 32px',
            background: BRAND.clay, color: '#fff',
            fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
              border: '1px solid rgba(255,255,255,0.55)', borderRadius: 3, padding: '2px 7px' }}>TEST MODE</span>
            These figures include test submissions and are not real performance.
          </div>
        )}

        {!isTestMode && stats.total === 0 && (
          <div style={{ padding: '48px 32px 0' }}>
            <div style={{
              border: `1px dashed ${UI.border}`, borderRadius: 8, padding: '40px 32px',
              textAlign: 'center', background: UI.surface,
            }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: UI.text, marginBottom: 10 }}>
                No live leads yet.
              </div>
              <div style={{ fontSize: 14, color: UI.textMuted, maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
                Every chart below is empty because nothing real has come through yet — not because
                anything is broken. The first opt-in from the website will appear here within seconds.
                {testCount > 0 && <> Switch to <b>test mode</b> to see the {testCount} test {testCount === 1 ? 'submission' : 'submissions'}.</>}
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '32px' }}>
          {section === 'overview'  && <ExecutiveOverview stats={stats} />}
          {section === 'marketing' && <MarketingPerformance stats={stats} />}
          {section === 'intel'     && <MarketIntelligence stats={stats} membershipLabels={config.membershipLabels} />}
          {section === 'cross'     && <CrossAnalysis stats={stats} membershipLabels={config.membershipLabels} products={config.products} />}
          {section === 'sales'     && <SalesPerformance stats={stats} />}
          {section === 'product'   && <MembershipIntelligence stats={stats} products={config.products} />}
          {section === 'readiness' && <OpeningReadiness stats={stats} milestones={config.milestones} />}
        </div>
      </main>

      {showAddLead && <AddLeadModal onClose={() => setShowAddLead(false)} products={config.products} />}
    </div>
  )
}
