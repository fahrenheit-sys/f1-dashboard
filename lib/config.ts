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

export type Milestone = {
  name: string
  date: string // display string, e.g. "Jun 2026"
  done: boolean
  track: string
}

export type DashboardConfig = {
  products: Product[]
  membershipLabels: Record<string, string>
  milestones: Milestone[]
  targets: { total: number; community: number; local: number }
  openingDate: string
}

// Defaults used when Supabase has no data yet (e.g. before the settings table
// is created). Keeps the dashboard working out of the box.
export const DEFAULT_TARGETS = { total: 445, community: 180, local: 265 }
export const DEFAULT_OPENING_DATE = '2027-04-15'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtMonthYear(date: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(date)
  return m ? `${MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}` : date
}

const FALLBACK_MILESTONES: Milestone[] = [
  { name: 'Community Awareness', date: 'Jun 2026', done: false, track: 'community' },
  { name: 'Community Interest', date: 'Jul 2026', done: false, track: 'community' },
  { name: 'Community VIP List', date: 'Aug 2026', done: false, track: 'community' },
  { name: 'Community Membership Drop', date: 'Sep 2026', done: false, track: 'community' },
  { name: 'Local Awareness', date: 'Nov 2026', done: false, track: 'local' },
  { name: 'Local Interest', date: 'Dec 2026', done: false, track: 'local' },
  { name: 'Local VIP List', date: 'Jan 2027', done: false, track: 'local' },
  { name: 'Local Membership Drop', date: 'Feb 2027', done: false, track: 'local' },
  { name: 'Early Access', date: 'Apr 2027', done: false, track: 'both' },
  { name: 'Opening Day', date: 'Apr 2027', done: false, track: 'both' },
]

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

async function loadMilestones(supabase: ReturnType<typeof createServerSupabase>): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('name, track, target_date, actual_date')
    .order('target_date', { ascending: true })
  if (error || !data?.length) return FALLBACK_MILESTONES
  return data.map(m => ({
    name: m.name,
    date: m.target_date ? fmtMonthYear(m.target_date) : '',
    done: !!m.actual_date, // completed once an actual_date is recorded in Supabase
    track: m.track ?? 'both',
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
  const [products, milestones, settings] = await Promise.all([
    loadProducts(supabase),
    loadMilestones(supabase),
    loadSettings(supabase),
  ])

  // Chart labels follow the product names from Supabase, falling back to the
  // static labels for non-product values (e.g. "comprehensive", "not_sure").
  const membershipLabels: Record<string, string> = { ...MEMBERSHIP_LABELS }
  for (const p of products) membershipLabels[p.slug] = p.name

  return { products, membershipLabels, milestones, targets: settings.targets, openingDate: settings.openingDate }
}
