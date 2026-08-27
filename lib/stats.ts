// Pure stats computation — shared by the server data fetch.
// Same shape the dashboard has always consumed, plus sold-by-dimension
// breakdowns (soldBy*) that previously lived as ad-hoc MOCK_LEADS.filter()
// calls inside the components.

// The subset of `leads` columns the dashboard aggregates over.
export type LeadRow = {
  stage: string | null
  track: string | null
  generation: string | null
  tribe: string | null
  membership_interest: string | null
  lead_source: string | null
  membership_sold: boolean | null
  monthly_rate: number | string | null
  created_at: string
}

const DEFAULT_OPENING_DATE = '2027-04-15'
const DEFAULT_TARGETS = { total: 1200, community: 600, local: 600 }

export type StatsOptions = {
  targets?: { total: number; community: number; local: number }
  openingDate?: string
}

export function computeStats(leads: LeadRow[], opts: StatsOptions = {}) {
  const targets = opts.targets ?? DEFAULT_TARGETS
  const openingDate = opts.openingDate ?? DEFAULT_OPENING_DATE
  const total = leads.length
  const soldLeads = leads.filter(l => l.membership_sold)
  const sold = soldLeads.length
  const mrr = soldLeads.reduce((s, l) => s + (Number(l.monthly_rate) || 0), 0)
  const community = leads.filter(l => l.track === 'community').length
  const local     = leads.filter(l => l.track === 'local').length

  const byStage: Record<string, number> = {}
  const byGen:   Record<string, number> = {}
  const byTribe: Record<string, number> = {}
  const byMem:   Record<string, number> = {}
  const bySrc:   Record<string, number> = {}
  const byTrackStage: Record<string, Record<string, number>> = { community: {}, local: {} }

  // Sold-by-dimension — counts only converted leads, keyed the same way.
  const soldByTrack: Record<string, number> = { community: 0, local: 0 }
  const soldByGen:   Record<string, number> = {}
  const soldByTribe: Record<string, number> = {}
  const soldByMem:   Record<string, number> = {}
  const soldBySrc:   Record<string, number> = {}

  const bump = (map: Record<string, number>, key: string | null | undefined) => {
    if (key == null) return
    map[key] = (map[key] ?? 0) + 1
  }

  for (const l of leads) {
    bump(byStage, l.stage)
    bump(byGen, l.generation)
    bump(byTribe, l.tribe)
    bump(byMem, l.membership_interest)
    bump(bySrc, l.lead_source)
    if (l.track && byTrackStage[l.track] && l.stage) {
      byTrackStage[l.track][l.stage] = (byTrackStage[l.track][l.stage] ?? 0) + 1
    }
    if (l.membership_sold) {
      if (l.track && soldByTrack[l.track] !== undefined) soldByTrack[l.track]++
      bump(soldByGen, l.generation)
      bump(soldByTribe, l.tribe)
      bump(soldByMem, l.membership_interest)
      bump(soldBySrc, l.lead_source)
    }
  }

  // Cross analysis: gen × mem
  const crossGenMem: Record<string, Record<string, number>> = {}
  for (const l of leads) {
    if (l.generation == null || l.membership_interest == null) continue
    if (!crossGenMem[l.generation]) crossGenMem[l.generation] = {}
    crossGenMem[l.generation][l.membership_interest] = (crossGenMem[l.generation][l.membership_interest] ?? 0) + 1
  }

  // Cross: tribe × mem
  const crossTribeMem: Record<string, Record<string, number>> = {}
  for (const l of leads) {
    if (l.tribe == null || l.membership_interest == null) continue
    if (!crossTribeMem[l.tribe]) crossTribeMem[l.tribe] = {}
    crossTribeMem[l.tribe][l.membership_interest] = (crossTribeMem[l.tribe][l.membership_interest] ?? 0) + 1
  }

  // Weekly trend (last 12 weeks present in the data)
  const weeklyMap: Record<string, { leads: number; sold: number }> = {}
  for (const l of leads) {
    const d = new Date(l.created_at)
    if (isNaN(d.getTime())) continue
    const week = `${d.getFullYear()}-W${String(Math.ceil((d.getDate()) / 7)).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (!weeklyMap[week]) weeklyMap[week] = { leads: 0, sold: 0 }
    weeklyMap[week].leads++
    if (l.membership_sold) weeklyMap[week].sold++
  }
  const weekly = Object.entries(weeklyMap)
    .sort(([a],[b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, v]) => ({ week: week.split('-W')[1] ?? week, ...v }))

  return {
    total, sold, mrr, community, local,
    convRate: total > 0 ? (sold / total) * 100 : 0,
    byStage, byGen, byTribe, byMem, bySrc, byTrackStage,
    soldByTrack, soldByGen, soldByTribe, soldByMem, soldBySrc,
    crossGenMem, crossTribeMem, weekly,
    daysToOpen: Math.ceil((new Date(openingDate).getTime() - Date.now()) / 86400000),
    targetTotal: targets.total,
    targetCommunity: targets.community,
    targetLocal: targets.local,
  }
}

export type Stats = ReturnType<typeof computeStats>
