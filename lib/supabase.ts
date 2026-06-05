import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Lead = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  email: string
  mobile?: string
  membership_interest?: string
  preferred_time?: string
  year_of_birth?: number
  generation?: string
  tribe?: string
  track: 'community' | 'local'
  is_hakoah_member: boolean
  stage: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  lead_source?: string
  assigned_to?: string
  membership_sold: boolean
  membership_sold_at?: string
  membership_type?: string
  monthly_rate?: number
  join_fee?: number
  ghl_contact_id?: string
  notes?: string
  tags?: string[]
}

export type MembershipProduct = {
  id: string
  name: string
  slug: string
  track: string
  monthly_rate: number
  join_fee: number
  is_founding: boolean
  target_members: number
  description: string
}

export type Milestone = {
  id: string
  name: string
  stage_code: string
  track: string
  target_date: string
  actual_date?: string
  target_count?: number
}

// ── Query helpers ─────────────────────────────────────────

export async function getLeadStats() {
  const { data, error } = await supabase
    .from('leads')
    .select('stage, track, generation, tribe, membership_interest, lead_source, membership_sold, monthly_rate, created_at')
  if (error) throw error
  return data
}

export async function getLeadsByDimension(dimension: 'generation' | 'tribe' | 'membership_interest' | 'lead_source' | 'track') {
  const { data, error } = await supabase
    .from('leads')
    .select(`${dimension}, stage, membership_sold, monthly_rate, track`)
  if (error) throw error
  return data
}

export async function getMilestones() {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .order('target_date')
  if (error) throw error
  return data
}

export async function getMembershipProducts() {
  const { data, error } = await supabase
    .from('membership_products')
    .select('*')
    .eq('is_active', true)
  if (error) throw error
  return data
}

export async function createLead(lead: Partial<Lead>) {
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLeadStage(id: string, stage: string) {
  const { error } = await supabase
    .from('leads')
    .update({ stage })
    .eq('id', id)
  if (error) throw error
}
