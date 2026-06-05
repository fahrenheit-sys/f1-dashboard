import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  )
}

const STAGE_MAP: Record<string, string> = {
  'Awareness':       'awareness',
  'Interest':        'interest',
  'VIP Waitlist':    'vip_waitlist',
  'Nurture':         'nurture',
  'Tour Booked':     'tour_booked',
  'Tour Attended':   'tour_attended',
  'Proposal':        'proposal',
  'Sold':            'sold',
  'Founding Member': 'founding_member',
}

function deriveGeneration(yob: number | null): string | null {
  if (!yob) return null
  if (yob >= 2010) return 'gen_alpha'
  if (yob >= 1997) return 'gen_z'
  if (yob >= 1981) return 'millennial'
  if (yob >= 1965) return 'gen_x'
  if (yob >= 1946) return 'boomer'
  return 'silent_gen'
}

function deriveTribe(time: string | null): string | null {
  const map: Record<string, string> = {
    early_morning: 'early_bird',
    mid_morning:   'am_achiever',
    lunchtime:     'lunch_legends',
    afternoon:     'afternoon',
    evening:       'pm_warrior',
    weekends:      'weekend_warrior',
  }
  return time ? (map[time] ?? null) : null
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-ghl-secret')
    if (secret !== process.env.GHL_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabase()
    const payload = await req.json()

    await supabase.from('ghl_webhook_log').insert({
      event_type: payload.type ?? payload.event,
      payload,
      processed: false,
    })

    const contact = payload.contact ?? payload
    const email = contact.email?.toLowerCase().trim()
    if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 })

    const yob = contact.customField?.year_of_birth
      ? parseInt(contact.customField.year_of_birth)
      : null

    const preferredTime = contact.customField?.preferred_time ?? null
    const track = contact.tags?.includes('community') ? 'community' : 'local'
    const stage = STAGE_MAP[contact.pipelineStage ?? ''] ?? 'awareness'

    const leadData = {
      first_name:          contact.firstName ?? '',
      last_name:           contact.lastName ?? '',
      email,
      mobile:              contact.phone ?? null,
      membership_interest: contact.customField?.membership_interest ?? null,
      preferred_time:      preferredTime,
      year_of_birth:       yob,
      generation:          deriveGeneration(yob),
      tribe:               deriveTribe(preferredTime),
      track,
      is_hakoah_member:    contact.customField?.is_hakoah_member === 'true',
      stage,
      utm_source:          contact.attributionSource?.utmSource ?? null,
      utm_medium:          contact.attributionSource?.utmMedium ?? null,
      utm_campaign:        contact.attributionSource?.utmCampaign ?? null,
      lead_source:         contact.attributionSource?.utmSource ?? 'other',
      ghl_contact_id:      contact.id,
      assigned_to:         contact.assignedTo ?? null,
      membership_sold:     stage === 'sold' || stage === 'founding_member',
      tags:                contact.tags ?? [],
    }

    const { data, error } = await supabase
      .from('leads')
      .upsert(leadData, { onConflict: 'email' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, lead_id: data.id })

  } catch (err: any) {
    console.error('GHL webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: 'GHL Webhook — Fahrenheit One',
    timestamp: new Date().toISOString(),
  })
}
