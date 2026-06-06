'use client'
import { useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import type { Stats } from '@/lib/stats'
import type { SessionUser } from '@/lib/session'
import type { TeamMember } from '@/lib/team'
import type { DashboardConfig, Product, Milestone } from '@/lib/config'
import { addLead, type AddLeadInput } from './actions'
import { logout } from './auth-actions'
import { createMember, suspendMember, reactivateMember, deleteMember, setMemberRole } from './team-actions'
import { UI } from '@/lib/theme'
import {
  GENERATION_LABELS, TRIBE_LABELS,
  SOURCE_LABELS, STAGE_LABELS, GENERATION_COLORS,
  TRIBE_COLORS, MEMBERSHIP_COLORS, BRAND
} from '@/lib/constants'

const GOLD_TEXT = '#9A6A0F' // darker gold for small text on white

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
      <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: UI.textFaint, marginBottom: 4 }}>{label}</div>
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

// ── KPI Card ──────────────────────────────────────────────
function KPICard({ label, value, sub, accent, progress, target }: {
  label: string; value: string; sub?: string
  accent?: 'community' | 'local' | 'gold' | 'neutral'
  progress?: number; target?: string
}) {
  return (
    <div className={`kpi-card ${accent ?? 'neutral'}`}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div className="serif" style={{ fontSize: 32, fontWeight: 600, color: UI.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: UI.textMuted, marginTop: 6 }}>{sub}</div>}
      {progress !== undefined && (
        <div style={{ marginTop: 12 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{
              width: `${Math.min(progress, 100)}%`,
              background: accent === 'community' ? BRAND.greenMid : accent === 'local' ? BRAND.terra : accent === 'gold' ? BRAND.gold : BRAND.slate
            }} />
          </div>
          {target && <div style={{ fontSize: 10, color: UI.textFaint, marginTop: 5, fontFamily: 'DM Mono' }}>{Math.round(progress ?? 0)}% of {target} target</div>}
        </div>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: UI.text }}>{title}</div>
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
          {sold !== undefined && <span style={{ fontSize: 10, color: GOLD_TEXT, fontFamily: 'DM Mono' }}>{sold} sold</span>}
          <span style={{ fontSize: 12, color: UI.textMuted, fontFamily: 'DM Mono' }}>{value} <span style={{ opacity: 0.6 }}>({pct(value, total)}%)</span></span>
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
    stage: 'interest',
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
          <div className="serif" style={{ fontSize: 21, fontWeight: 600, color: UI.text }}>Add New Lead</div>
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
          <div style={{ marginTop: 16, padding: '10px 12px', background: '#FFF1EF', border: `1px solid ${BRAND.brick}`, borderRadius: UI.radiusSm, fontSize: 12.5, color: BRAND.terra }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} disabled={pending} style={{ flex: 1, padding: '11px', background: UI.surface, border: `1px solid ${UI.borderStrong}`, borderRadius: UI.radiusSm, color: UI.textMuted, cursor: pending ? 'default' : 'pointer', fontSize: 13.5 }}>Cancel</button>
          <button onClick={submit} disabled={pending}
            style={{ flex: 2, padding: '11px', background: BRAND.forest, border: 'none', borderRadius: UI.radiusSm, color: '#fff', cursor: pending ? 'default' : 'pointer', fontSize: 13.5, fontWeight: 600, opacity: pending ? 0.6 : 1 }}>
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
        <KPICard label="Founding Members" value={fmt(stats.sold)} sub="Agreements signed" accent="gold"
          progress={(stats.sold / stats.targetTotal) * 100} target={fmt(stats.targetTotal)} />
        <KPICard label="Projected MRR" value={fmtMRR(stats.mrr)} sub="At founding rates" accent="gold" />
        <KPICard label="Days to Opening" value={fmt(stats.daysToOpen)} sub="April 2027" accent="neutral" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 26 }}>
        <KPICard label="Community Leads" value={fmt(stats.community)} sub={`${pct(stats.community, stats.total)}% of pipeline`} accent="community"
          progress={(communityFounders / stats.targetCommunity) * 100} target="180 members" />
        <KPICard label="Community Members" value={fmt(communityFounders)} accent="community"
          progress={(communityFounders / stats.targetCommunity) * 100} target="180" />
        <KPICard label="Local Leads" value={fmt(stats.local)} sub={`${pct(stats.local, stats.total)}% of pipeline`} accent="local"
          progress={(localFounders / stats.targetLocal) * 100} target="265 members" />
        <KPICard label="Local Members" value={fmt(localFounders)} accent="local"
          progress={(localFounders / stats.targetLocal) * 100} target="265" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>PIPELINE BY STAGE</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageData} layout="vertical">
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={AXIS_TICK_STRONG} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                {stageData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? BRAND.greenMid : i === 1 ? '#4A7A80' : i === 2 ? BRAND.gold : BRAND.slate} />
                ))}
              </Bar>
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
              <Line type="monotone" dataKey="leads" stroke={BRAND.greenMid} strokeWidth={2.5} dot={false} name="Leads" />
              <Line type="monotone" dataKey="sold" stroke={BRAND.gold} strokeWidth={2.5} dot={false} name="Sold" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14 }}>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 8 }}>OVERALL CONVERSION</div>
          <div className="serif" style={{ fontSize: 36, color: GOLD_TEXT, fontWeight: 600 }}>{stats.convRate.toFixed(1)}%</div>
          <div style={{ fontSize: 11.5, color: UI.textMuted, marginTop: 4 }}>Lead → Founding Member</div>
        </div>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 8 }}>OPENING DAY PROGRESS</div>
          <div className="serif" style={{ fontSize: 36, color: UI.text, fontWeight: 600 }}>{pct(stats.sold, stats.targetTotal)}%</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${Math.min((stats.sold / stats.targetTotal) * 100, 100)}%`, background: `linear-gradient(90deg, ${BRAND.greenMid}, ${BRAND.gold})` }} />
          </div>
          <div style={{ fontSize: 11.5, color: UI.textMuted, marginTop: 6 }}>{fmt(stats.sold)} of {fmt(stats.targetTotal)} target members</div>
        </div>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 8 }}>PROJECTED ANNUAL REVENUE</div>
          <div className="serif" style={{ fontSize: 36, color: UI.text, fontWeight: 600 }}>{fmtMRR(stats.mrr * 12)}</div>
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="leads" fill={BRAND.greenMid} radius={[3, 3, 0, 0]} name="Leads" />
              <Bar dataKey="sold" fill={BRAND.gold} radius={[3, 3, 0, 0]} name="Sold" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>CONVERSION RATE BY CHANNEL</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={srcData} layout="vertical">
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: UI.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="conv" radius={[0, 3, 3, 0]} name="Conv %" >
                {srcData.map((d, i) => <Cell key={i} fill={d.conv > 15 ? BRAND.gold : d.conv > 8 ? BRAND.greenMid : BRAND.slate} />)}
              </Bar>
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
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{row.leads}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: GOLD_TEXT }}>{row.sold}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: row.conv > 15 ? BRAND.greenMid : row.conv > 8 ? GOLD_TEXT : UI.textFaint }}>{row.conv}%</td>
                <td>
                  <span className="track-pill community" style={{ marginRight: 4 }}>C</span>
                  <span className="track-pill local">L</span>
                </td>
                <td style={{ fontSize: 11, color: row.conv > 15 ? BRAND.greenMid : UI.textMuted }}>
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

  const genData  = Object.entries(stats.byGen).map(([k, v]) => ({
    name: GENERATION_LABELS[k] ?? k, value: v,
    sold: stats.soldByGen[k] ?? 0,
    color: GENERATION_COLORS[k] ?? BRAND.slate,
  })).sort((a, b) => b.value - a.value)

  const tribeData = Object.entries(stats.byTribe).map(([k, v]) => ({
    name: TRIBE_LABELS[k] ?? k, value: v,
    sold: stats.soldByTribe[k] ?? 0,
    color: TRIBE_COLORS[k] ?? BRAND.slate,
  })).sort((a, b) => b.value - a.value)

  const memData = Object.entries(stats.byMem).map(([k, v]) => ({
    name: membershipLabels[k] ?? k, value: v,
    sold: stats.soldByMem[k] ?? 0,
    color: MEMBERSHIP_COLORS[k] ?? BRAND.slate,
  })).sort((a, b) => b.value - a.value)

  const activeData = lens === 'generation' ? genData : lens === 'tribe' ? tribeData : memData

  const pill = (active: boolean): CSSProperties => ({
    padding: '7px 16px', borderRadius: 999, border: `1px solid ${active ? BRAND.forest : UI.borderStrong}`,
    background: active ? BRAND.forest : UI.surface, color: active ? '#fff' : UI.textMuted,
    cursor: 'pointer', fontSize: 12, fontFamily: 'DM Mono', letterSpacing: '0.04em', textTransform: 'uppercase',
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
              <Pie data={activeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={52} paddingAngle={1.5}>
                {activeData.map((d, i) => <Cell key={i} fill={d.color} stroke={UI.surface} strokeWidth={2} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: UI.textMuted }}>{v}</span>} />
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="value" name="Total Leads" fill={BRAND.greenMid} radius={[3, 3, 0, 0]} />
            <Bar dataKey="sold" name="Converted" fill={BRAND.gold} radius={[3, 3, 0, 0]} />
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
    color: COLORS_MAP[dim] ?? BRAND.slate,
    ...Object.fromEntries(allMems.map(m => [m, memMap[m] ?? 0])),
    total: Object.values(memMap).reduce((s, v) => s + v, 0),
  }))

  const pill = (active: boolean): CSSProperties => ({
    padding: '6px 14px', borderRadius: 999, border: `1px solid ${active ? BRAND.forest : UI.borderStrong}`,
    background: active ? BRAND.forest : UI.surface, color: active ? '#fff' : UI.textMuted,
    cursor: 'pointer', fontSize: 12, fontFamily: 'DM Mono', textTransform: 'uppercase',
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
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 38, height: 28, borderRadius: 6,
                            background: `rgba(${intensity > 0.7 ? '232,160,32' : '74,107,80'},${(intensity * 0.85).toFixed(2)})`,
                            fontFamily: 'DM Mono', fontSize: 12, color: intensity > 0.45 ? '#fff' : UI.textMuted
                          }}>{v || '—'}</div>
                        </td>
                      )
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 600, fontFamily: 'DM Mono', color: GOLD_TEXT }}>{row.total}</td>
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 10, color: UI.textMuted }}>{membershipLabels[v] ?? v}</span>} />
            {allMems.map(m => (
              <Bar key={m} dataKey={m} stackId="a" fill={MEMBERSHIP_COLORS[m]} name={m} />
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

  const pipelineStages = ['awareness','interest','vip_waitlist','nurture','sold','founding_member']
  const funnelData = pipelineStages.map(s => ({
    stage: STAGE_LABELS[s] ?? s,
    count: stats.byStage[s] ?? 0,
  }))

  return (
    <div className="fade-up">
      <SectionHead title="Sales Performance" sub="Pre-sales team activity and pipeline management" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <KPICard label="Total Pipeline Value" value={fmtMRR(stats.mrr * 12)} sub="Annualised MRR" accent="gold" />
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
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{c.assigned}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{c.contacted}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{c.conversations}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{c.tours}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: GOLD_TEXT, fontWeight: 600 }}>{c.sold}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: BRAND.greenMid }}>{pct(c.sold, c.assigned)}%</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{fmtMRR(c.revenue)}/mo</td>
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
                <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: GOLD_TEXT }}>{d.count}</div>
                <div style={{ width: '78%', height: h, background: `rgba(74,107,80,${1 - i * 0.13})`, borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: UI.textFaint, textAlign: 'center', letterSpacing: '0.04em' }}>{d.stage}</div>
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
          const color = MEMBERSHIP_COLORS[p.slug] ?? BRAND.slate
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
                  <div style={{ fontFamily: 'DM Mono', fontSize: 18, color: GOLD_TEXT, fontWeight: 600 }}>${p.rate}<span style={{ fontSize: 10, opacity: 0.6 }}>/mo</span></div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {[['Leads', leads], ['Sold', sold], ['Conv %', `${convR.toFixed(1)}%`]].map(([l, v]) => (
                  <div key={l as string} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontFamily: 'DM Mono', color: UI.text, fontWeight: 600 }}>{v}</div>
                    <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: UI.textFaint, letterSpacing: '0.1em' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: color }} />
              </div>
              <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: UI.textFaint, marginTop: 5 }}>
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
    color: TRIBE_COLORS[k] ?? BRAND.slate,
  }))

  const genMix = Object.entries(stats.byGen)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      name: GENERATION_LABELS[k] ?? k,
      value: v,
      color: GENERATION_COLORS[k] ?? BRAND.slate,
    }))

  return (
    <div className="fade-up">
      <SectionHead title="Opening Readiness" sub="Operational forecast for April 2027 — staffing, capacity, and demand" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KPICard label="Days to Opening" value={fmt(stats.daysToOpen)} sub="15 April 2027" accent="gold" />
        <KPICard label="Members Confirmed" value={fmt(stats.sold)} sub={`of ${stats.targetTotal} target`} accent="community"
          progress={(stats.sold / stats.targetTotal) * 100} target={fmt(stats.targetTotal)} />
        <KPICard label="Peak Demand Tribe" value="6AM Crew" sub={`${pct(stats.byTribe['early_bird'] ?? 0, stats.sold)} of members`} accent="neutral" />
        <KPICard label="Projected Opening MRR" value={fmtMRR(stats.mrr)} sub="Founding member rates" accent="gold" />
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
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: GOLD_TEXT }}>{t.members} members</span>
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: UI.textFaint }}>{t.demand} interested</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(t.members / Math.max(...tribeCapacity.map(x => x.members), 1)) * 100}%`, background: t.color }} />
                </div>
                {t.members > 40 && (
                  <div style={{ fontSize: 10, color: BRAND.terra, fontFamily: 'DM Mono', marginTop: 3 }}>⚠ High demand — check capacity</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 16 }}>OPENING DAY GENERATION MIX</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={genMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={42} paddingAngle={1.5}>
                {genMix.map((d, i) => <Cell key={i} fill={d.color} stroke={UI.surface} strokeWidth={2} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: UI.textMuted }}>{v}</span>} />
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
                background: m.done ? BRAND.gold : UI.surface,
                border: `2px solid ${m.done ? BRAND.gold : m.track === 'community' ? BRAND.greenMid : m.track === 'local' ? BRAND.terra : BRAND.slate}`,
                position: 'absolute', left: -16
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingLeft: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: m.done ? UI.text : UI.textMuted }}>{m.name}</span>
                  <span className={`track-pill ${m.track}`}>{m.track === 'community' ? 'Community' : m.track === 'local' ? 'Local' : 'Both'}</span>
                </div>
                <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: m.done ? GOLD_TEXT : UI.textFaint }}>{m.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Team Access (admin only) ──────────────────────────────
function TeamAccess({ team, currentUserId }: { team: TeamMember[]; currentUserId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '', role: 'member' })

  const run = (id: string | null, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null); setBusyId(id)
    startTransition(async () => {
      const res = await fn()
      setBusyId(null)
      if (!res.ok) { setError(res.error ?? 'Action failed'); return }
      router.refresh()
    })
  }

  const addMember = () => run(null, async () => {
    const res = await createMember(form.email, form.password, form.role)
    if (res.ok) setForm({ email: '', password: '', role: 'member' })
    return res
  })

  const btn = (variant: 'ghost' | 'danger' | 'solid'): CSSProperties => ({
    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: pending ? 'default' : 'pointer',
    border: `1px solid ${variant === 'danger' ? '#E5B4AD' : UI.borderStrong}`,
    background: variant === 'solid' ? BRAND.forest : UI.surface,
    color: variant === 'solid' ? '#fff' : variant === 'danger' ? BRAND.terra : UI.text,
  })

  return (
    <div className="fade-up">
      <SectionHead title="Team Access" sub="Grant, suspend, or remove dashboard access for your team" />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 14 }}>INVITE A NEW MEMBER</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="name@fahrenheitone.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Temporary Password</label>
            <input type="text" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="min. 6 characters" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button onClick={addMember} disabled={pending} style={{ ...btn('solid'), padding: '10px 18px', fontSize: 13, fontWeight: 600, opacity: pending && busyId === null ? 0.6 : 1 }}>
            {pending && busyId === null ? 'Adding…' : 'Grant Access'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#FFF1EF', border: `1px solid ${BRAND.brick}`, borderRadius: UI.radiusSm, fontSize: 12.5, color: BRAND.terra }}>
            {error}
          </div>
        )}
      </div>

      <div className="card">
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: UI.textFaint, marginBottom: 12 }}>TEAM MEMBERS · {team.length}</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>EMAIL</th><th>ROLE</th><th>STATUS</th><th>LAST SIGN IN</th><th>ADDED</th><th style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {team.map(m => {
              const isSelf = m.id === currentUserId
              const rowBusy = pending && busyId === m.id
              return (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500, color: UI.text }}>
                    {m.email}{isSelf && <span style={{ fontSize: 10, color: UI.textFaint, marginLeft: 6 }}>(you)</span>}
                  </td>
                  <td>
                    <select value={m.role} disabled={isSelf || pending}
                      onChange={e => run(m.id, () => setMemberRole(m.id, e.target.value))}
                      style={{ ...inputStyle, padding: '5px 8px', fontSize: 12, width: 'auto', opacity: isSelf ? 0.6 : 1 }}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`track-pill ${m.status === 'active' ? 'community' : 'local'}`}>
                      {m.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: UI.textMuted }}>{fmtDate(m.last_sign_in_at)}</td>
                  <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: UI.textMuted }}>{fmtDate(m.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {!isSelf && (
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        {m.status === 'active'
                          ? <button onClick={() => run(m.id, () => suspendMember(m.id))} disabled={pending} style={btn('ghost')}>{rowBusy ? '…' : 'Suspend'}</button>
                          : <button onClick={() => run(m.id, () => reactivateMember(m.id))} disabled={pending} style={btn('ghost')}>{rowBusy ? '…' : 'Reactivate'}</button>}
                        <button
                          onClick={() => { if (confirm(`Delete access for ${m.email}? This cannot be undone.`)) run(m.id, () => deleteMember(m.id)) }}
                          disabled={pending} style={btn('danger')}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════
type Section = 'overview' | 'marketing' | 'intel' | 'cross' | 'sales' | 'product' | 'readiness' | 'team'

export default function Dashboard({ stats, user, initialTeam, config }: { stats: Stats; user: SessionUser; initialTeam: TeamMember[]; config: DashboardConfig }) {
  const router = useRouter()
  const [section, setSection] = useState<Section>('overview')
  const [showAddLead, setShowAddLead] = useState(false)
  const isAdmin = user.role === 'admin'

  const nav: { id: Section; label: string; icon: string; adminOnly?: boolean }[] = [
    { id: 'overview',   label: 'Executive Overview',  icon: Icons.overview },
    { id: 'marketing',  label: 'Marketing',            icon: Icons.marketing },
    { id: 'intel',      label: 'Market Intelligence',  icon: Icons.intel },
    { id: 'cross',      label: 'Cross Analysis',       icon: Icons.cross },
    { id: 'sales',      label: 'Sales Performance',    icon: Icons.sales },
    { id: 'product',    label: 'Membership Products',  icon: Icons.product },
    { id: 'readiness',  label: 'Opening Readiness',    icon: Icons.readiness },
    { id: 'team',       label: 'Team Access',          icon: Icons.team, adminOnly: true },
  ]
  const visibleNav = nav.filter(n => !n.adminOnly || isAdmin)

  const doLogout = async () => { await logout(); router.replace('/login'); router.refresh() }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '24px 20px 18px', borderBottom: `1px solid ${UI.border}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fahrenheit-one-logo.png" alt="Fahrenheit One" style={{ height: 30, width: 'auto', display: 'block' }} />
          <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: UI.textFaint, letterSpacing: '0.18em', marginTop: 8 }}>@ HAKOAH WHITE CITY</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <span className="track-pill community">Community</span>
            <span className="track-pill local">Local</span>
          </div>
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

        <div style={{ padding: '16px 12px', borderTop: `1px solid ${UI.border}` }}>
          <button onClick={() => setShowAddLead(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 14px',
              background: BRAND.forest, border: 'none', borderRadius: 10,
              color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Icon d={Icons.addlead} size={15} />
            Add Lead
          </button>
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${UI.border}`, background: UI.surfaceAlt }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: UI.textFaint }}>TOTAL LEADS</span>
            <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: UI.text }}>{stats.total}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: UI.textFaint }}>MEMBERS</span>
            <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: GOLD_TEXT }}>{stats.sold}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: UI.textFaint }}>DAYS TO OPEN</span>
            <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: UI.text }}>{stats.daysToOpen}</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: `1px solid ${UI.border}`, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div>
            <div className="serif" style={{ fontSize: 17, fontWeight: 600, color: UI.text }}>{visibleNav.find(n => n.id === section)?.label}</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: UI.textFaint, letterSpacing: '0.16em', marginTop: 1 }}>
              PRE-OPENING INTELLIGENCE · {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: UI.textFaint }}>OPENING TARGET</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 13, color: GOLD_TEXT }}>{stats.sold} / {stats.targetTotal} members</div>
            </div>
            <div style={{ width: 80 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min((stats.sold / stats.targetTotal) * 100, 100)}%`, background: `linear-gradient(90deg, ${BRAND.greenMid}, ${BRAND.gold})` }} />
              </div>
            </div>
            <div style={{ width: 1, height: 32, background: UI.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12.5, color: UI.text, fontWeight: 500 }}>{user.email}</div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: UI.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{user.role}</div>
              </div>
              <button onClick={doLogout} title="Sign out"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: UI.surface, border: `1px solid ${UI.borderStrong}`, borderRadius: 9, color: UI.textMuted, cursor: 'pointer', fontSize: 12.5 }}>
                <Icon d={Icons.logout} size={14} />
                Sign out
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '32px' }}>
          {section === 'overview'  && <ExecutiveOverview stats={stats} />}
          {section === 'marketing' && <MarketingPerformance stats={stats} />}
          {section === 'intel'     && <MarketIntelligence stats={stats} membershipLabels={config.membershipLabels} />}
          {section === 'cross'     && <CrossAnalysis stats={stats} membershipLabels={config.membershipLabels} products={config.products} />}
          {section === 'sales'     && <SalesPerformance stats={stats} />}
          {section === 'product'   && <MembershipIntelligence stats={stats} products={config.products} />}
          {section === 'readiness' && <OpeningReadiness stats={stats} milestones={config.milestones} />}
          {section === 'team'      && isAdmin && <TeamAccess team={initialTeam} currentUserId={user.sub} />}
        </div>
      </main>

      {showAddLead && <AddLeadModal onClose={() => setShowAddLead(false)} products={config.products} />}
    </div>
  )
}
