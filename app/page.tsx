'use client'
import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { MOCK_LEADS, computeStats } from '@/lib/mock-data'
import {
  GENERATION_LABELS, TRIBE_LABELS, MEMBERSHIP_LABELS,
  SOURCE_LABELS, STAGE_LABELS, GENERATION_COLORS,
  TRIBE_COLORS, MEMBERSHIP_COLORS, BRAND
} from '@/lib/constants'

// ── Icons ─────────────────────────────────────────────────
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
}

// ── Helpers ───────────────────────────────────────────────
function pct(n: number, total: number) { return total > 0 ? ((n / total) * 100).toFixed(1) : '0.0' }
function fmt(n: number) { return n.toLocaleString() }
function fmtMRR(n: number) { return `$${Math.round(n).toLocaleString()}` }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a2418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '10px 14px' }}>
      <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#7EC89A', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontSize: 12, color: p.color || '#D4E8D6' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────
function KPICard({ label, value, sub, accent, progress, target }: {
  label: string; value: string; sub?: string
  accent?: 'community' | 'local' | 'gold' | 'neutral'
  progress?: number; target?: string
}) {
  return (
    <div className={`kpi-card ${accent ?? 'neutral'}`}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div className="serif" style={{ fontSize: 32, fontWeight: 600, color: '#FAF6F0', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(212,232,214,0.5)', marginTop: 6 }}>{sub}</div>}
      {progress !== undefined && (
        <div style={{ marginTop: 12 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{
              width: `${Math.min(progress, 100)}%`,
              background: accent === 'community' ? BRAND.greenMid : accent === 'local' ? BRAND.terra : accent === 'gold' ? BRAND.gold : BRAND.slate
            }} />
          </div>
          {target && <div style={{ fontSize: 10, color: 'rgba(212,232,214,0.3)', marginTop: 4, fontFamily: 'DM Mono' }}>{Math.round(progress ?? 0)}% of {target} target</div>}
        </div>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="serif" style={{ fontSize: 22, fontWeight: 600, color: BRAND.cream }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(212,232,214,0.4)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ── Dimension Bar ─────────────────────────────────────────
function DimBar({ label, value, total, color, sold }: { label: string; value: number; total: number; color: string; sold?: number }) {
  const w = total > 0 ? (value / total) * 100 : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: BRAND.cream2 }}>{label}</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {sold !== undefined && <span style={{ fontSize: 10, color: BRAND.gold, fontFamily: 'DM Mono' }}>{sold} sold</span>}
          <span style={{ fontSize: 12, color: 'rgba(212,232,214,0.5)', fontFamily: 'DM Mono' }}>{value} <span style={{ opacity: 0.4 }}>({pct(value, total)}%)</span></span>
        </div>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${w}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Add Lead Modal ────────────────────────────────────────
function AddLeadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (lead: any) => void }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', mobile: '',
    track: 'community', membership_interest: 'not_sure',
    preferred_time: 'early_morning', year_of_birth: '',
    lead_source: 'hakoah_newsletter', is_hakoah_member: false,
    stage: 'interest',
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a2418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 32, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div className="serif" style={{ fontSize: 20, color: BRAND.cream }}>Add New Lead</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(212,232,214,0.4)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[['first_name','First Name'],['last_name','Last Name'],['email','Email'],['mobile','Mobile']].map(([k,l]) => (
            <div key={k} style={{ gridColumn: k === 'email' || k === 'mobile' ? '1/-1' : 'auto' }}>
              <label style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'rgba(212,232,214,0.4)', letterSpacing: '0.15em', display: 'block', marginBottom: 4 }}>{l.toUpperCase()}</label>
              <input value={(form as any)[k]} onChange={e => set(k, e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '8px 12px', color: BRAND.cream, fontSize: 13, outline: 'none' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'rgba(212,232,214,0.4)', letterSpacing: '0.15em', display: 'block', marginBottom: 4 }}>TRACK</label>
            <select value={form.track} onChange={e => set('track', e.target.value)}
              style={{ width: '100%', background: '#1a2418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '8px 12px', color: BRAND.cream, fontSize: 13 }}>
              <option value="community">Community</option>
              <option value="local">Local</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'rgba(212,232,214,0.4)', letterSpacing: '0.15em', display: 'block', marginBottom: 4 }}>YEAR OF BIRTH</label>
            <input type="number" placeholder="1985" value={form.year_of_birth} onChange={e => set('year_of_birth', e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '8px 12px', color: BRAND.cream, fontSize: 13, outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'rgba(212,232,214,0.4)', letterSpacing: '0.15em', display: 'block', marginBottom: 4 }}>MEMBERSHIP INTEREST</label>
            <select value={form.membership_interest} onChange={e => set('membership_interest', e.target.value)}
              style={{ width: '100%', background: '#1a2418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '8px 12px', color: BRAND.cream, fontSize: 13 }}>
              {Object.entries(MEMBERSHIP_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'rgba(212,232,214,0.4)', letterSpacing: '0.15em', display: 'block', marginBottom: 4 }}>PREFERRED TIME</label>
            <select value={form.preferred_time} onChange={e => set('preferred_time', e.target.value)}
              style={{ width: '100%', background: '#1a2418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '8px 12px', color: BRAND.cream, fontSize: 13 }}>
              <option value="early_morning">Early Morning (5–8am)</option>
              <option value="mid_morning">Mid Morning (8–11am)</option>
              <option value="lunchtime">Lunchtime (11am–2pm)</option>
              <option value="afternoon">Afternoon (2–5pm)</option>
              <option value="evening">Evening (5–8pm)</option>
              <option value="weekends">Weekends</option>
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'rgba(212,232,214,0.4)', letterSpacing: '0.15em', display: 'block', marginBottom: 4 }}>LEAD SOURCE</label>
            <select value={form.lead_source} onChange={e => set('lead_source', e.target.value)}
              style={{ width: '100%', background: '#1a2418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '8px 12px', color: BRAND.cream, fontSize: 13 }}>
              {Object.entries(SOURCE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="hakoah" checked={form.is_hakoah_member} onChange={e => set('is_hakoah_member', e.target.checked)} />
            <label htmlFor="hakoah" style={{ fontSize: 13, color: BRAND.cream2 }}>Existing Hakoah Club member</label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: 'rgba(212,232,214,0.5)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={() => { onAdd(form); onClose() }}
            style={{ flex: 2, padding: '10px', background: BRAND.forest, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 3, color: BRAND.cream, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Add to Pipeline
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// DASHBOARD SECTIONS
// ══════════════════════════════════════════════════════════

function ExecutiveOverview({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const communityFounders = MOCK_LEADS.filter(l => l.track === 'community' && l.membership_sold).length
  const localFounders     = MOCK_LEADS.filter(l => l.track === 'local'     && l.membership_sold).length

  const stageData = Object.entries(stats.byStage)
    .map(([k, v]) => ({ name: STAGE_LABELS[k] ?? k, value: v }))
    .sort((a, b) => b.value - a.value)

  const weeklyData = stats.weekly

  return (
    <div className="fade-up">
      <SectionHead title="Executive Overview" sub="One-screen summary of pre-opening pipeline performance" />

      {/* KPI row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <KPICard label="Total Leads" value={fmt(stats.total)} sub="All tracks combined" accent="neutral"
          progress={(stats.total / 1000) * 100} target="1,000" />
        <KPICard label="Founding Members" value={fmt(stats.sold)} sub="Agreements signed" accent="gold"
          progress={(stats.sold / stats.targetTotal) * 100} target={fmt(stats.targetTotal)} />
        <KPICard label="Projected MRR" value={fmtMRR(stats.mrr)} sub="At founding rates" accent="gold" />
        <KPICard label="Days to Opening" value={fmt(stats.daysToOpen)} sub="April 2027" accent="neutral" />
      </div>

      {/* KPI row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
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
        {/* Pipeline funnel */}
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>PIPELINE BY STAGE</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageData} layout="vertical">
              <XAxis type="number" tick={{ fill: 'rgba(212,232,214,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(212,232,214,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                {stageData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? BRAND.greenMid : i === 1 ? '#4A7A80' : i === 2 ? BRAND.gold : BRAND.slate} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly trend */}
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>WEEKLY LEAD TREND</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyData}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" tick={{ fill: 'rgba(212,232,214,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(212,232,214,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="leads" stroke={BRAND.greenMid} strokeWidth={2} dot={false} name="Leads" />
              <Line type="monotone" dataKey="sold" stroke={BRAND.gold} strokeWidth={2} dot={false} name="Sold" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(212,232,214,0.4)', marginBottom: 8 }}>OVERALL CONVERSION</div>
          <div className="serif" style={{ fontSize: 36, color: BRAND.gold }}>{stats.convRate.toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: 'rgba(212,232,214,0.4)', marginTop: 4 }}>Lead → Founding Member</div>
        </div>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(212,232,214,0.4)', marginBottom: 8 }}>OPENING DAY PROGRESS</div>
          <div className="serif" style={{ fontSize: 36, color: BRAND.cream }}>{pct(stats.sold, stats.targetTotal)}%</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${Math.min((stats.sold / stats.targetTotal) * 100, 100)}%`, background: `linear-gradient(90deg, ${BRAND.greenMid}, ${BRAND.gold})` }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(212,232,214,0.4)', marginTop: 6 }}>{fmt(stats.sold)} of {fmt(stats.targetTotal)} target members</div>
        </div>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(212,232,214,0.4)', marginBottom: 8 }}>PROJECTED ANNUAL REVENUE</div>
          <div className="serif" style={{ fontSize: 36, color: BRAND.cream }}>{fmtMRR(stats.mrr * 12)}</div>
          <div style={{ fontSize: 11, color: 'rgba(212,232,214,0.4)', marginTop: 4 }}>Based on founding member MRR × 12</div>
        </div>
      </div>
    </div>
  )
}

function MarketingPerformance({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const srcData = Object.entries(stats.bySrc)
    .map(([k, v]) => {
      const sold = MOCK_LEADS.filter(l => l.lead_source === k && l.membership_sold).length
      return { name: SOURCE_LABELS[k] ?? k, leads: v, sold, conv: v > 0 ? +((sold / v) * 100).toFixed(1) : 0 }
    })
    .sort((a, b) => b.leads - a.leads)

  return (
    <div className="fade-up">
      <SectionHead title="Marketing Performance" sub="Which channels are generating the best leads and conversions" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>LEADS BY CHANNEL</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={srcData}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(212,232,214,0.4)', fontSize: 9 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={60} />
              <YAxis tick={{ fill: 'rgba(212,232,214,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="leads" fill={BRAND.greenMid} radius={[2, 2, 0, 0]} name="Leads" />
              <Bar dataKey="sold" fill={BRAND.gold} radius={[2, 2, 0, 0]} name="Sold" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>CONVERSION RATE BY CHANNEL</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={srcData} layout="vertical">
              <XAxis type="number" tick={{ fill: 'rgba(212,232,214,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(212,232,214,0.6)', fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="conv" radius={[0, 2, 2, 0]} name="Conv %" >
                {srcData.map((d, i) => <Cell key={i} fill={d.conv > 15 ? BRAND.gold : d.conv > 8 ? BRAND.greenMid : BRAND.slate} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 12 }}>CHANNEL PERFORMANCE TABLE</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>CHANNEL</th><th>LEADS</th><th>SOLD</th><th>CONV RATE</th><th>TRACK MIX</th><th>SIGNAL</th>
            </tr>
          </thead>
          <tbody>
            {srcData.map(row => (
              <tr key={row.name}>
                <td style={{ fontWeight: 500, color: BRAND.cream }}>{row.name}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{row.leads}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: BRAND.gold }}>{row.sold}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: row.conv > 15 ? '#7EC89A' : row.conv > 8 ? BRAND.gold : 'rgba(212,232,214,0.4)' }}>{row.conv}%</td>
                <td>
                  <span className="track-pill community" style={{ marginRight: 4 }}>C</span>
                  <span className="track-pill local">L</span>
                </td>
                <td style={{ fontSize: 11, color: row.conv > 15 ? '#7EC89A' : 'rgba(212,232,214,0.4)' }}>
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

function MarketIntelligence({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const [lens, setLens] = useState<'generation' | 'tribe' | 'membership'>('generation')

  const genData  = Object.entries(stats.byGen).map(([k, v]) => ({
    name: GENERATION_LABELS[k] ?? k, value: v,
    sold: MOCK_LEADS.filter(l => l.generation === k && l.membership_sold).length,
    color: GENERATION_COLORS[k] ?? BRAND.slate,
  })).sort((a, b) => b.value - a.value)

  const tribeData = Object.entries(stats.byTribe).map(([k, v]) => ({
    name: TRIBE_LABELS[k] ?? k, value: v,
    sold: MOCK_LEADS.filter(l => l.tribe === k && l.membership_sold).length,
    color: TRIBE_COLORS[k] ?? BRAND.slate,
  })).sort((a, b) => b.value - a.value)

  const memData = Object.entries(stats.byMem).map(([k, v]) => ({
    name: MEMBERSHIP_LABELS[k] ?? k, value: v,
    sold: MOCK_LEADS.filter(l => l.membership_interest === k && l.membership_sold).length,
    color: MEMBERSHIP_COLORS[k] ?? BRAND.slate,
  })).sort((a, b) => b.value - a.value)

  const activeData = lens === 'generation' ? genData : lens === 'tribe' ? tribeData : memData

  return (
    <div className="fade-up">
      <SectionHead title="Market Intelligence" sub="Who is joining — viewed through three strategic lenses" />

      {/* Lens switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['generation','tribe','membership'] as const).map(l => (
          <button key={l} onClick={() => setLens(l)}
            style={{ padding: '7px 16px', borderRadius: 3, border: `1px solid ${lens === l ? BRAND.gold : 'rgba(255,255,255,0.1)'}`,
              background: lens === l ? 'rgba(232,160,32,0.1)' : 'transparent', color: lens === l ? BRAND.gold : 'rgba(212,232,214,0.5)',
              cursor: 'pointer', fontSize: 12, fontFamily: 'DM Mono', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {l === 'generation' ? 'Generation' : l === 'tribe' ? 'Tribe' : 'Membership'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pie */}
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>
            {lens === 'generation' ? 'LEAD MIX BY GENERATION' : lens === 'tribe' ? 'LEAD MIX BY TRIBE' : 'LEAD MIX BY MEMBERSHIP TYPE'}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={activeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                {activeData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: 'rgba(212,232,214,0.7)' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar breakdown */}
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>LEADS & CONVERSIONS</div>
          <div style={{ paddingTop: 4 }}>
            {activeData.map(d => (
              <DimBar key={d.name} label={d.name} value={d.value} total={stats.total} color={d.color} sold={d.sold} />
            ))}
          </div>
        </div>
      </div>

      {/* Community vs Local split by dimension */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>
          COMMUNITY vs LOCAL SPLIT — {lens.toUpperCase()}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={activeData.slice(0, 6)}>
            <XAxis dataKey="name" tick={{ fill: 'rgba(212,232,214,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(212,232,214,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="value" name="Total Leads" fill={BRAND.greenMid} radius={[2, 2, 0, 0]} />
            <Bar dataKey="sold" name="Converted" fill={BRAND.gold} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CrossAnalysis({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const [xAxis, setXAxis] = useState<'generation' | 'tribe'>('generation')

  const LABELS = xAxis === 'generation' ? GENERATION_LABELS : TRIBE_LABELS
  const COLORS_MAP = xAxis === 'generation' ? GENERATION_COLORS : TRIBE_COLORS
  const crossData = xAxis === 'generation' ? stats.crossGenMem : stats.crossTribeMem

  const allMems = ['fitness','wellness','comprehensive','hakoah_one','teen','family']
  const rows = Object.entries(crossData).map(([dim, memMap]) => ({
    dim: LABELS[dim] ?? dim,
    color: COLORS_MAP[dim] ?? BRAND.slate,
    ...Object.fromEntries(allMems.map(m => [m, memMap[m] ?? 0])),
    total: Object.values(memMap).reduce((s, v) => s + v, 0),
  }))

  return (
    <div className="fade-up">
      <SectionHead title="Cross Analysis" sub="Intersecting dimensions to reveal hidden insights" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(212,232,214,0.4)' }}>View:</span>
        {(['generation','tribe'] as const).map(x => (
          <button key={x} onClick={() => setXAxis(x)}
            style={{ padding: '6px 14px', borderRadius: 3, border: `1px solid ${xAxis === x ? BRAND.gold : 'rgba(255,255,255,0.1)'}`,
              background: xAxis === x ? 'rgba(232,160,32,0.1)' : 'transparent',
              color: xAxis === x ? BRAND.gold : 'rgba(212,232,214,0.5)',
              cursor: 'pointer', fontSize: 12, fontFamily: 'DM Mono', textTransform: 'uppercase' }}>
            {x} × Membership
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>
          {xAxis.toUpperCase()} × MEMBERSHIP TYPE — HEAT MAP
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 130 }}>{xAxis.toUpperCase()}</th>
                {allMems.map(m => <th key={m} style={{ textAlign: 'center' }}>{MEMBERSHIP_LABELS[m]}</th>)}
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
                        <span style={{ fontWeight: 600, color: BRAND.cream }}>{row.dim}</span>
                      </div>
                    </td>
                    {allMems.map(m => {
                      const v = (row as any)[m] as number
                      const intensity = max > 0 ? v / max : 0
                      return (
                        <td key={m} style={{ textAlign: 'center' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 36, height: 28, borderRadius: 3,
                            background: `rgba(${intensity > 0.7 ? '232,160,32' : '74,107,80'},${(intensity * 0.7).toFixed(2)})`,
                            fontFamily: 'DM Mono', fontSize: 12, color: intensity > 0.4 ? BRAND.cream : 'rgba(212,232,214,0.4)'
                          }}>{v || '—'}</div>
                        </td>
                      )
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 600, fontFamily: 'DM Mono', color: BRAND.gold }}>{row.total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>
          {xAxis.toUpperCase()} × MEMBERSHIP — STACKED VIEW
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows}>
            <XAxis dataKey="dim" tick={{ fill: 'rgba(212,232,214,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(212,232,214,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 10, color: 'rgba(212,232,214,0.6)' }}>{MEMBERSHIP_LABELS[v] ?? v}</span>} />
            {allMems.map(m => (
              <Bar key={m} dataKey={m} stackId="a" fill={MEMBERSHIP_COLORS[m]} name={m} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function SalesPerformance({ stats }: { stats: ReturnType<typeof computeStats> }) {
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard label="Total Pipeline Value" value={fmtMRR(stats.mrr * 12)} sub="Annualised MRR" accent="gold" />
        <KPICard label="Avg Response Time" value="< 4 hrs" sub="Target: same day" accent="community" />
        <KPICard label="Follow-up Compliance" value="94%" sub="Tasks completed on time" accent="community" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 12 }}>CONSULTANT PERFORMANCE</div>
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
                <td style={{ fontWeight: 600, color: BRAND.cream }}>{c.name}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{c.assigned}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{c.contacted}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{c.conversations}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{c.tours}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: BRAND.gold, fontWeight: 600 }}>{c.sold}</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#7EC89A' }}>{pct(c.sold, c.assigned)}%</td>
                <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{fmtMRR(c.revenue)}/mo</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>PIPELINE FUNNEL</div>
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', height: 180 }}>
          {funnelData.map((d, i) => {
            const maxVal = Math.max(...funnelData.map(f => f.count))
            const h = maxVal > 0 ? (d.count / maxVal) * 160 : 0
            return (
              <div key={d.stage} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: BRAND.gold }}>{d.count}</div>
                <div style={{ width: '80%', height: h, background: `rgba(74,107,80,${1 - i * 0.13})`, borderRadius: '2px 2px 0 0', minHeight: 4 }} />
                <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: 'rgba(212,232,214,0.4)', textAlign: 'center', letterSpacing: '0.05em' }}>{d.stage}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MembershipIntelligence({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const products = [
    { name: 'Hakoah One', slug: 'hakoah_one', target: 180, rate: 89,  track: 'community' },
    { name: 'Signature',  slug: 'signature',  target: 80,  rate: 149, track: 'both' },
    { name: 'Fitness',    slug: 'fitness',    target: 120, rate: 99,  track: 'both' },
    { name: 'Wellness',   slug: 'wellness',   target: 80,  rate: 79,  track: 'both' },
    { name: 'Teen',       slug: 'teen',       target: 45,  rate: 49,  track: 'both' },
    { name: 'Family',     slug: 'family',     target: 40,  rate: 199, track: 'both' },
    { name: 'Corporate',  slug: 'corporate',  target: 20,  rate: 129, track: 'local' },
  ]

  return (
    <div className="fade-up">
      <SectionHead title="Membership Product Intelligence" sub="Which products are generating demand and converting" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        {products.map(p => {
          const leads = stats.byMem[p.slug] ?? 0
          const sold  = MOCK_LEADS.filter(l => l.membership_interest === p.slug && l.membership_sold).length
          const convR = leads > 0 ? (sold / leads) * 100 : 0
          const progress = p.target > 0 ? (sold / p.target) * 100 : 0
          const color = MEMBERSHIP_COLORS[p.slug] ?? BRAND.slate
          return (
            <div key={p.slug} className="card" style={{ borderLeft: `3px solid ${color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: BRAND.cream }}>{p.name}</div>
                  <span className={`track-pill ${p.track === 'both' ? 'both' : p.track}`} style={{ marginTop: 4 }}>
                    {p.track === 'community' ? 'Community Only' : p.track === 'local' ? 'Local' : 'Both Tracks'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 18, color: BRAND.gold, fontWeight: 600 }}>${p.rate}<span style={{ fontSize: 10, opacity: 0.5 }}>/mo</span></div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {[['Leads', leads], ['Sold', sold], ['Conv %', `${convR.toFixed(1)}%`]].map(([l, v]) => (
                  <div key={l as string} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontFamily: 'DM Mono', color: BRAND.cream, fontWeight: 600 }}>{v}</div>
                    <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: 'rgba(212,232,214,0.35)', letterSpacing: '0.15em' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: color }} />
              </div>
              <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'rgba(212,232,214,0.3)', marginTop: 4 }}>
                {sold} of {p.target} target
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OpeningReadiness({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const tribeCapacity = Object.entries(stats.byTribe).map(([k, v]) => ({
    name: TRIBE_LABELS[k] ?? k,
    members: MOCK_LEADS.filter(l => l.tribe === k && l.membership_sold).length,
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

  const milestones = [
    { name: 'Community Awareness',    date: 'Jun 2026', done: true,  track: 'community' },
    { name: 'Community Interest',     date: 'Jul 2026', done: false, track: 'community' },
    { name: 'Community VIP List',     date: 'Aug 2026', done: false, track: 'community' },
    { name: 'Community Membership Drop', date: 'Sep 2026', done: false, track: 'community' },
    { name: 'Local Awareness',        date: 'Nov 2026', done: false, track: 'local' },
    { name: 'Local Interest',         date: 'Dec 2026', done: false, track: 'local' },
    { name: 'Local VIP List',         date: 'Jan 2027', done: false, track: 'local' },
    { name: 'Local Membership Drop',  date: 'Feb 2027', done: false, track: 'local' },
    { name: 'Fitout Complete',        date: 'Feb 2027', done: false, track: 'both' },
    { name: 'Early Access',           date: 'Apr 2027', done: false, track: 'both' },
    { name: 'Opening Day',            date: 'Apr 2027', done: false, track: 'both' },
  ]

  return (
    <div className="fade-up">
      <SectionHead title="Opening Readiness" sub="Operational forecast for April 2027 — staffing, capacity, and demand" />

      {/* Days countdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard label="Days to Opening" value={fmt(stats.daysToOpen)} sub="15 April 2027" accent="gold" />
        <KPICard label="Members Confirmed" value={fmt(stats.sold)} sub={`of ${stats.targetTotal} target`} accent="community"
          progress={(stats.sold / stats.targetTotal) * 100} target={fmt(stats.targetTotal)} />
        <KPICard label="Peak Demand Tribe" value="6AM Crew" sub={`${pct(stats.byTribe['early_bird'] ?? 0, stats.sold)} of members`} accent="neutral" />
        <KPICard label="Projected Opening MRR" value={fmtMRR(stats.mrr)} sub="Founding member rates" accent="gold" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Tribe demand forecast */}
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>PROJECTED USAGE BY TIME SLOT</div>
          <div>
            {tribeCapacity.sort((a,b) => b.members - a.members).map(t => (
              <div key={t.name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: BRAND.cream2 }}>{t.name}</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: BRAND.gold }}>{t.members} members</span>
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'rgba(212,232,214,0.3)' }}>{t.demand} interested</span>
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

        {/* Gen mix */}
        <div className="card">
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 16 }}>OPENING DAY GENERATION MIX</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={genMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                {genMix.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: 'rgba(212,232,214,0.7)' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Milestone timeline */}
      <div className="card">
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(212,232,214,0.4)', marginBottom: 20 }}>CAMPAIGN MILESTONE TRACKER</div>
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 1, background: 'rgba(255,255,255,0.06)' }} />
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, position: 'relative' }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                background: m.done ? BRAND.gold : 'rgba(255,255,255,0.1)',
                border: `2px solid ${m.done ? BRAND.gold : m.track === 'community' ? BRAND.greenMid : m.track === 'local' ? BRAND.terra : BRAND.slate}`,
                position: 'absolute', left: -16
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingLeft: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: m.done ? BRAND.cream : 'rgba(212,232,214,0.6)' }}>{m.name}</span>
                  <span className={`track-pill ${m.track}`}>{m.track === 'community' ? 'Community' : m.track === 'local' ? 'Local' : 'Both'}</span>
                </div>
                <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: m.done ? BRAND.gold : 'rgba(212,232,214,0.3)' }}>{m.date}</span>
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

export default function Dashboard() {
  const [section, setSection] = useState<Section>('overview')
  const [showAddLead, setShowAddLead] = useState(false)
  const [leads, setLeads] = useState(MOCK_LEADS)
  const stats = useMemo(() => computeStats(leads), [leads])

  const nav: { id: Section; label: string; icon: string }[] = [
    { id: 'overview',   label: 'Executive Overview',  icon: Icons.overview },
    { id: 'marketing',  label: 'Marketing',            icon: Icons.marketing },
    { id: 'intel',      label: 'Market Intelligence',  icon: Icons.intel },
    { id: 'cross',      label: 'Cross Analysis',       icon: Icons.cross },
    { id: 'sales',      label: 'Sales Performance',    icon: Icons.sales },
    { id: 'product',    label: 'Membership Products',  icon: Icons.product },
    { id: 'readiness',  label: 'Opening Readiness',    icon: Icons.readiness },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: BRAND.cream, lineHeight: 1.1 }}>Fahrenheit One</div>
          <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: BRAND.gold, letterSpacing: '0.2em', marginTop: 3 }}>@ HAKOAH WHITE CITY</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <span className="track-pill community">Community</span>
            <span className="track-pill local">Local</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 8, overflowY: 'auto' }}>
          <div className="section-label">DASHBOARD</div>
          {nav.map(item => (
            <a key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => setSection(item.id)} href="#">
              <Icon d={item.icon} size={14} />
              {item.label}
            </a>
          ))}
        </nav>

        {/* Add lead button */}
        <div style={{ padding: '16px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setShowAddLead(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              background: 'rgba(232,160,32,0.12)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: 3,
              color: BRAND.gold, cursor: 'pointer', fontSize: 12, fontFamily: 'DM Mono' }}>
            <Icon d={Icons.addlead} size={14} />
            Add Lead
          </button>
        </div>

        {/* Stats footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'rgba(212,232,214,0.3)' }}>TOTAL LEADS</span>
            <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: BRAND.cream }}>{stats.total}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'rgba(212,232,214,0.3)' }}>MEMBERS</span>
            <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: BRAND.gold }}>{stats.sold}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'rgba(212,232,214,0.3)' }}>DAYS TO OPEN</span>
            <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: BRAND.cream }}>{stats.daysToOpen}</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,20,16,0.9)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div>
            <div className="serif" style={{ fontSize: 16, color: BRAND.cream }}>{nav.find(n => n.id === section)?.label}</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'rgba(212,232,214,0.3)', letterSpacing: '0.2em', marginTop: 1 }}>
              PRE-OPENING INTELLIGENCE · {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'rgba(212,232,214,0.3)' }}>OPENING TARGET</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 13, color: BRAND.gold }}>{stats.sold} / {stats.targetTotal} members</div>
            </div>
            <div style={{ width: 80 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min((stats.sold / stats.targetTotal) * 100, 100)}%`, background: `linear-gradient(90deg, ${BRAND.greenMid}, ${BRAND.gold})` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Section content */}
        <div style={{ padding: '32px' }}>
          {section === 'overview'  && <ExecutiveOverview stats={stats} />}
          {section === 'marketing' && <MarketingPerformance stats={stats} />}
          {section === 'intel'     && <MarketIntelligence stats={stats} />}
          {section === 'cross'     && <CrossAnalysis stats={stats} />}
          {section === 'sales'     && <SalesPerformance stats={stats} />}
          {section === 'product'   && <MembershipIntelligence stats={stats} />}
          {section === 'readiness' && <OpeningReadiness stats={stats} />}
        </div>
      </main>

      {/* Add Lead Modal */}
      {showAddLead && (
        <AddLeadModal
          onClose={() => setShowAddLead(false)}
          onAdd={(lead) => setLeads(prev => [...prev, { ...lead, id: `lead-${Date.now()}`, membership_sold: false, monthly_rate: 0, created_at: new Date().toISOString(), is_hakoah_member: lead.is_hakoah_member ?? false }])}
        />
      )}
    </div>
  )
}
