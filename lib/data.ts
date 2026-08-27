import { createServerSupabase } from './supabase-server'
import { computeStats, type LeadRow, type Stats, type StatsOptions } from './stats'

const DIMENSION_COLUMNS =
  'stage, track, generation, tribe, membership_interest, lead_source, membership_sold, monthly_rate, created_at'

// Supabase caps a single response at 1000 rows; page through so the dashboard
// stays correct as the lead count grows past that.
const PAGE_SIZE = 1000

export async function getDashboardStats(
  opts: StatsOptions & { includeTest?: boolean } = {},
): Promise<Stats> {
  const supabase = createServerSupabase()
  const rows: LeadRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    let q = supabase
      .from('leads')
      .select(DIMENSION_COLUMNS)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    // Live is the default view: real leads only. Test mode drops the filter and
    // shows everything, so nothing is ever hidden from both views at once.
    if (!opts.includeTest) q = q.eq('is_test', false)
    const { data, error } = await q
    if (error) throw new Error(`Failed to load leads: ${error.message}`)
    if (!data?.length) break
    rows.push(...(data as LeadRow[]))
    if (data.length < PAGE_SIZE) break
  }

  return computeStats(rows, opts)
}

/** How many rows the live view is hiding. Surfaced in the UI so a lead
 *  mis-flagged as test is visible rather than silently dropped. */
export async function getTestLeadCount(): Promise<number> {
  const supabase = createServerSupabase()
  const { count, error } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('is_test', true)
  if (error) return 0
  return count ?? 0
}
