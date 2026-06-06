import { createServerSupabase } from './supabase-server'
import { MEMBERSHIP_LABELS } from './constants'

export type Product = {
  name: string
  slug: string
  track: string
  rate: number
  joinFee: number
  target: number
  isFounding: boolean
}

export type DashboardConfig = {
  products: Product[]
  membershipLabels: Record<string, string>
  targets: { total: number; community: number; local: number }
  openingDate: string
}

// Defaults used when Supabase has no data yet (e.g. before the settings table
// is created). Keeps the dashboard working out of the box.
export const DEFAULT_TARGETS = { total: 445, community: 180, local: 265 }
export const DEFAULT_OPENING_DATE = '2027-04-15'

const FALLBACK_PRODUCTS: Product[] = [
  { name: 'Hakoah One', slug: 'hakoah_one', track: 'community', rate: 89, joinFee: 199, target: 180, isFounding: true },
  { name: 'Signature', slug: 'signature', track: 'both', rate: 149, joinFee: 299, target: 80, isFounding: false },
  { name: 'Fitness', slug: 'fitness', track: 'both', rate: 99, joinFee: 199, target: 120, isFounding: false },
  { name: 'Wellness', slug: 'wellness', track: 'both', rate: 79, joinFee: 149, target: 80, isFounding: false },
  { name: 'Teen', slug: 'teen', track: 'both', rate: 49, joinFee: 99, target: 45, isFounding: false },
  { name: 'Family', slug: 'family', track: 'both', rate: 199, joinFee: 399, target: 40, isFounding: false },
  { name: 'Corporate', slug: 'corporate', track: 'local', rate: 129, joinFee: 0, target: 20, isFounding: false },
]

async function loadProducts(supabase: ReturnType<typeof createServerSupabase>): Promise<Product[]> {
  const { data, error } = await supabase
    .from('membership_products')
    .select('name, slug, track, monthly_rate, join_fee, target_members, is_founding')
    .eq('is_active', true)
    .order('target_members', { ascending: false })
  if (error || !data?.length) return FALLBACK_PRODUCTS
  return data.map(p => ({
    name: p.name,
    slug: p.slug,
    track: p.track ?? 'both',
    rate: Number(p.monthly_rate) || 0,
    joinFee: Number(p.join_fee) || 0,
    target: Number(p.target_members) || 0,
    isFounding: !!p.is_founding,
  }))
}

async function loadSettings(supabase: ReturnType<typeof createServerSupabase>) {
  // The settings table may not exist yet — fall back silently if so.
  const { data, error } = await supabase
    .from('settings')
    .select('target_total, target_community, target_local, opening_date')
    .limit(1)
    .maybeSingle()
  if (error || !data) return { targets: DEFAULT_TARGETS, openingDate: DEFAULT_OPENING_DATE }
  return {
    targets: {
      total: Number(data.target_total) || DEFAULT_TARGETS.total,
      community: Number(data.target_community) || DEFAULT_TARGETS.community,
      local: Number(data.target_local) || DEFAULT_TARGETS.local,
    },
    openingDate: data.opening_date || DEFAULT_OPENING_DATE,
  }
}

export async function getDashboardConfig(): Promise<DashboardConfig> {
  const supabase = createServerSupabase()
  const [products, settings] = await Promise.all([loadProducts(supabase), loadSettings(supabase)])

  // Chart labels follow the product names from Supabase, falling back to the
  // static labels for non-product values (e.g. "comprehensive", "not_sure").
  const membershipLabels: Record<string, string> = { ...MEMBERSHIP_LABELS }
  for (const p of products) membershipLabels[p.slug] = p.name

  return { products, membershipLabels, targets: settings.targets, openingDate: settings.openingDate }
}
