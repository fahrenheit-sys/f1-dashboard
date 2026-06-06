import { createServerSupabase } from './supabase-server'
import { computeStats, type LeadRow, type Stats } from './stats'

const DIMENSION_COLUMNS =
  'stage, track, generation, tribe, membership_interest, lead_source, membership_sold, monthly_rate, created_at'

// Supabase caps a single response at 1000 rows; page through so the dashboard
// stays correct as the lead count grows past that.
const PAGE_SIZE = 1000

export async function getDashboardStats(): Promise<Stats> {
  const supabase = createServerSupabase()
  const rows: LeadRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('leads')
      .select(DIMENSION_COLUMNS)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Failed to load leads: ${error.message}`)
    if (!data?.length) break
    rows.push(...(data as LeadRow[]))
    if (data.length < PAGE_SIZE) break
  }

  return computeStats(rows)
}
