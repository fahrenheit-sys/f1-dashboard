// Mock data for development — replaced by Supabase queries in production

export const MOCK_LEADS = Array.from({ length: 387 }, (_, i) => {
  const tracks = ['community', 'community', 'community', 'local']
  const stages = ['awareness','interest','vip_waitlist','nurture','sold','founding_member']
  const stageWeights = [0.15, 0.30, 0.25, 0.15, 0.10, 0.05]
  const generations = ['gen_z','millennial','gen_x','boomer','silent_gen']
  const genWeights   = [0.15, 0.35, 0.30, 0.15, 0.05]
  const tribes = ['early_bird','am_achiever','lunch_legends','pm_warrior','weekend_warrior']
  const tribeWeights = [0.28, 0.15, 0.20, 0.22, 0.15]
  const memberships  = ['fitness','wellness','comprehensive','teen','family','corporate','hakoah_one']
  const memWeights   = [0.25, 0.20, 0.22, 0.10, 0.08, 0.05, 0.10]
  const sources = ['hakoah_newsletter','meta_paid','organic_social','referral','walk_in','event','hoarding_qr','google_search']
  const srcWeights = [0.30, 0.25, 0.18, 0.12, 0.06, 0.05, 0.02, 0.02]

  function weighted<T>(arr: T[], weights: number[]): T {
    const r = Math.random()
    let cum = 0
    for (let j = 0; j < arr.length; j++) {
      cum += weights[j]
      if (r <= cum) return arr[j]
    }
    return arr[arr.length - 1]
  }

  const track = weighted(tracks, [0.45, 0.45, 0.45, 0.55])
  const stage = weighted(stages, stageWeights)
  const gen   = weighted(generations, genWeights)
  const tribe = weighted(tribes, tribeWeights)
  const mem   = track === 'community' && Math.random() < 0.25
    ? 'hakoah_one'
    : weighted(memberships.filter(m => m !== 'hakoah_one'), memWeights.slice(0, -1))
  const sold  = stage === 'sold' || stage === 'founding_member'
  const rate  = { fitness: 99, wellness: 79, comprehensive: 149, teen: 49, family: 199, corporate: 129, hakoah_one: 89 }[mem] ?? 99

  return {
    id: `lead-${i}`,
    track,
    stage,
    generation: gen,
    tribe,
    membership_interest: mem,
    lead_source: weighted(sources, srcWeights),
    membership_sold: sold,
    monthly_rate: sold ? rate : 0,
    created_at: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
    is_hakoah_member: track === 'community' && Math.random() < 0.6,
  }
})

export function computeStats(leads: typeof MOCK_LEADS) {
  const total = leads.length
  const sold  = leads.filter(l => l.membership_sold).length
  const mrr   = leads.filter(l => l.membership_sold).reduce((s, l) => s + (l.monthly_rate ?? 0), 0)
  const community = leads.filter(l => l.track === 'community').length
  const local     = leads.filter(l => l.track === 'local').length

  const byStage: Record<string, number> = {}
  const byGen:   Record<string, number> = {}
  const byTribe: Record<string, number> = {}
  const byMem:   Record<string, number> = {}
  const bySrc:   Record<string, number> = {}
  const byTrackStage: Record<string, Record<string, number>> = { community: {}, local: {} }

  for (const l of leads) {
    byStage[l.stage] = (byStage[l.stage] ?? 0) + 1
    byGen[l.generation]   = (byGen[l.generation] ?? 0) + 1
    byTribe[l.tribe] = (byTribe[l.tribe] ?? 0) + 1
    byMem[l.membership_interest] = (byMem[l.membership_interest] ?? 0) + 1
    bySrc[l.lead_source] = (bySrc[l.lead_source] ?? 0) + 1
    byTrackStage[l.track][l.stage] = (byTrackStage[l.track][l.stage] ?? 0) + 1
  }

  // Cross analysis: gen × mem
  const crossGenMem: Record<string, Record<string, number>> = {}
  for (const l of leads) {
    if (!crossGenMem[l.generation]) crossGenMem[l.generation] = {}
    crossGenMem[l.generation][l.membership_interest] = (crossGenMem[l.generation][l.membership_interest] ?? 0) + 1
  }

  // Cross: tribe × mem
  const crossTribeMem: Record<string, Record<string, number>> = {}
  for (const l of leads) {
    if (!crossTribeMem[l.tribe]) crossTribeMem[l.tribe] = {}
    crossTribeMem[l.tribe][l.membership_interest] = (crossTribeMem[l.tribe][l.membership_interest] ?? 0) + 1
  }

  // Weekly trend
  const weeklyMap: Record<string, { leads: number; sold: number }> = {}
  for (const l of leads) {
    const d = new Date(l.created_at)
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
    crossGenMem, crossTribeMem, weekly,
    daysToOpen: Math.ceil((new Date('2027-04-15').getTime() - Date.now()) / 86400000),
    targetTotal: 445,
    targetCommunity: 180,
    targetLocal: 265,
  }
}
