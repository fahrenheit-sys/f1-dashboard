import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  )
}

// GHL pipeline stage display names → canonical Supabase stage codes.
// Covers both the Community and Local pipelines (see CONTEXT §9).
const STAGE_MAP: Record<string, string> = {
  'Seed':             'awareness',
  'New Lead':         'awareness',
  'Opted In':         'vip_waitlist',   // opting in = joining the VIP/founders list
  'VIP Waitlist':     'vip_waitlist',
  'Event Attended':   'event_attended',
  'Toured':           'tour_attended',
  'Offer Made':       'proposal',
  'Joining Fee Paid': 'founding_member',
  'Member':           'member',
  'Withdrawn':        'withdrawn',
}

// Membership interest must match the leads CHECK constraint. Accepts either the
// GHL dropdown label ("Lifestyle") or a code ("lifestyle"). Legacy 'signature'
// and 'comprehensive' both fold into 'lifestyle' (2026-06 rename).
function normalizeMembership(v: string | null | undefined): string | null {
  if (!v) return null
  const m = v.toString().trim().toLowerCase().replace(/\s+/g, '_')
  if (m === 'comprehensive' || m === 'signature') return 'lifestyle'
  const allowed = ['hakoah_one', 'lifestyle', 'fitness', 'wellness', 'teen', 'not_sure']
  return allowed.includes(m) ? m : 'not_sure'
}

// GHL "Preferred Time" dropdown stores friendly labels ("Early Morning (5–8am)").
// Map them to the codes the leads CHECK constraint + tribe trigger expect.
function normalizePreferredTime(v: string | null | undefined): string | null {
  if (!v) return null
  const m = v.toString().trim().toLowerCase()
  if (m.startsWith('early')) return 'early_morning'
  if (m.startsWith('mid'))   return 'mid_morning'
  if (m.startsWith('lunch')) return 'lunchtime'
  if (m.startsWith('after')) return 'afternoon'
  if (m.startsWith('even'))  return 'evening'
  if (m.startsWith('week'))  return 'weekends'
  const codes = ['early_morning', 'mid_morning', 'lunchtime', 'afternoon', 'evening', 'weekends']
  return codes.includes(m) ? m : null
}

// GHL webhook payloads serialize tags as a comma-separated string; normalise to
// a string[] whether we receive that or a real array.
function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') return raw.split(',').map(t => t.trim()).filter(Boolean)
  return []
}

// "How did you hear about us?" answers, mapped onto the lead_source enum.
// These are the channels a UTM cannot see — signage, press, newsletters, word
// of mouth — so a self-reported answer is the only signal available for them.
const HEARD_MAP: Record<string, string> = {
  'hakoah newsletter':                                 'hakoah_newsletter',
  'synagogue, school or community organisation':       'community_partnership',
  'a friend or family member':                         'referral',
  'australian jewish news':                            'pr_editorial',
  'press or local media':                              'pr_editorial',
  'instagram or facebook':                             'organic_social',
  'google or web search':                              'google_search',
  'saw a sign or billboard':                           'hoarding_qr',
  'saw a sign or drove past':                          'hoarding_qr',
  'walked or drove past':                              'hoarding_qr',
  'other':                                             'other',
}

// Resolve lead_source. A UTM is an observed click and beats a remembered one,
// so it wins when present; the self-reported answer covers everything else.
// Nothing at all means they arrived by typing the address.
function normalizeLeadSource(
  utmSource?: string | null,
  utmMedium?: string | null,
  heardAbout?: string | null,
): string {
  const s = (utmSource ?? '').toLowerCase()
  if (s) {
    // Medium separates a paid click from an organic one on the same platform —
    // the Instagram bio link and an Instagram ad share a utm_source.
    const paid = /(paid|cpc|ppc|ads?)/.test((utmMedium ?? '').toLowerCase())
    if (/(meta|facebook|instagram|\bfb\b|\big\b)/.test(s)) return paid ? 'meta_paid' : 'organic_social'
    if (s.includes('google'))                              return paid ? 'google_search' : 'google_search'
    if (s.includes('newsletter') || s.includes('hakoah'))  return 'hakoah_newsletter'
    if (s.includes('referral'))                            return 'referral'
    if (s.includes('organic') || s.includes('social'))     return 'organic_social'
    if (s.includes('event'))                               return 'event'
    return 'other'
  }
  const h = (heardAbout ?? '').toLowerCase().trim()
  if (h) return HEARD_MAP[h] ?? 'other'
  return 'website_direct'
}

// A lead is test data if its address matches TEST_LEAD_EMAIL_PATTERN (a regex,
// e.g. "\\+test|@example\\.com"). Left unset, nothing is auto-flagged — better to
// show a test lead in the live view than to silently hide a real one. The live
// view reports how many rows it is hiding, so a mistake here stays visible.
function isTestLead(email: string): boolean {
  const pattern = process.env.TEST_LEAD_EMAIL_PATTERN
  if (!pattern) return false
  try { return new RegExp(pattern, 'i').test(email) }
  catch { return false }   // a bad pattern must not misfile real leads
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

    const preferredTime = normalizePreferredTime(contact.customField?.preferred_time)
    // GHL serializes tags as a comma-separated string in webhook payloads;
    // accept both that and a real array. Track is also honoured if sent explicitly.
    const tagList = parseTags(contact.tags)
    const track = (contact.track ?? contact.customField?.track)
      ?? (tagList.some(t => t.includes('community')) ? 'community' : 'local')
    const stage = STAGE_MAP[contact.pipelineStage ?? ''] ?? 'awareness'

    const leadData = {
      first_name:          contact.firstName ?? '',
      last_name:           contact.lastName ?? '',
      email,
      mobile:              contact.phone ?? null,
      membership_interest: normalizeMembership(contact.customField?.membership_interest),
      preferred_time:      preferredTime,
      year_of_birth:       yob,
      generation:          deriveGeneration(yob),
      tribe:               deriveTribe(preferredTime),
      track,
      is_hakoah_member:    ['true', 'yes'].includes(String(contact.customField?.is_hakoah_member ?? '').toLowerCase()),
      stage,
      utm_source:          contact.attributionSource?.utmSource ?? null,
      utm_medium:          contact.attributionSource?.utmMedium ?? null,
      utm_campaign:        contact.attributionSource?.utmCampaign ?? null,
      lead_source:         normalizeLeadSource(
                             contact.attributionSource?.utmSource,
                             contact.attributionSource?.utmMedium,
                             contact.customField?.heard_about,
                           ),
      heard_about:         contact.customField?.heard_about ?? null,
      is_test:             contact.isTest === true || isTestLead(email),
      ghl_contact_id:      contact.id,
      assigned_to:         contact.assignedTo ?? null,
      membership_sold:     stage === 'founding_member' || stage === 'member',
      tags:                tagList,
    }

    // The root page posts twice — once from the form, once from the popup — and
    // both are fire-and-forget, so they can arrive in either order. When the
    // sparser stage-1 payload lands second it would overwrite the popup's
    // answers with nulls, which is exactly what happened on 29 Aug: the derived
    // rate survived while the membership_interest that produced it did not.
    // Dropping empty values means a later, thinner write can add but never erase.
    const merged = Object.fromEntries(
      Object.entries(leadData).filter(([k, v]) =>
        k === 'email' || (v !== null && v !== undefined && v !== '')),
    )

    const { data, error } = await supabase
      .from('leads')
      .upsert(merged, { onConflict: 'email' })
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
