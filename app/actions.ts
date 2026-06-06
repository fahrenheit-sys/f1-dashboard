'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase-server'

export type AddLeadInput = {
  first_name: string
  last_name: string
  email: string
  mobile?: string
  track: string
  membership_interest: string
  preferred_time: string
  year_of_birth?: string
  lead_source: string
  is_hakoah_member: boolean
  stage: string
}

export type AddLeadResult = { ok: true } | { ok: false; error: string }

export async function addLead(input: AddLeadInput): Promise<AddLeadResult> {
  if (!input.email?.trim()) return { ok: false, error: 'Email is required' }

  const supabase = createServerSupabase()
  const yob = input.year_of_birth ? parseInt(input.year_of_birth, 10) : null

  // generation + tribe are derived server-side by a DB trigger on insert.
  const { error } = await supabase.from('leads').insert({
    first_name:          input.first_name?.trim() || '',
    last_name:           input.last_name?.trim() || '',
    email:               input.email.toLowerCase().trim(),
    mobile:              input.mobile?.trim() || null,
    track:               input.track,
    membership_interest: input.membership_interest,
    preferred_time:      input.preferred_time,
    year_of_birth:       Number.isFinite(yob as number) ? yob : null,
    lead_source:         input.lead_source,
    is_hakoah_member:    input.is_hakoah_member,
    stage:               input.stage,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/')
  return { ok: true }
}
