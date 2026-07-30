// ── Brand ─────────────────────────────────────────────────────────────────
// The "Country Club" plum system, shared with clubf1.com.au. Plum is the house
// colour, clay the call-to-action. Everything below is either brand chrome or a
// data-viz slot — the two jobs are kept separate on purpose.
export const BRAND = {
  // Core plum system
  plum:       '#2A1830',
  plumDeep:   '#150A19',
  plumLine:   '#3A2240',
  plumMid:    '#8A4A9E', // plum stepped up to a legible chart/mark weight
  clay:       '#C65A2E',
  clayHover:  '#AE4B23', // solid-button fill — clears 4.5:1 with white text
  clayDeep:   '#A0461F', // clay stepped down for small text on light surfaces
  clayText:   '#D98A5E', // clay on plum
  tint:       '#F7F2F6',
  cream:      '#F2EAF1',
  ink:        '#241626',
  mid:        '#6B5F6B',
  light:      '#B4A8B3',
  rule:       '#E9E0E8',
  white:      '#FFFFFF',

  // Semantic roles — what a colour *means* in this dashboard
  community:  '#8A4A9E', // Community track
  local:      '#C65A2E', // Local track
  accent:     '#C65A2E', // converted / members / revenue highlight
  accentText: '#A0461F', // that highlight as small text on a light surface
  neutral:    '#6B5F6B',
}

// ── Data-viz palette ──────────────────────────────────────────────────────
// Fixed hue order, assigned by entity and never cycled or reassigned by rank.
// Validated (dataviz skill validator, light mode on #FFFFFF): lightness band,
// chroma floor, CVD separation, normal-vision floor and surface contrast all
// pass — both linearly (bars, stacks, lines) and wrapped (donut slice 6 → 1).
export const CATEGORICAL = [
  '#C65A2E', // clay
  '#8A4A9E', // plum
  '#4F8A3D', // sage
  '#2C6FB5', // blue
  '#A8484F', // burgundy
  '#0B8C7E', // teal
]

// Magnitude ramps — one hue, monotone lightness. Sequential for the heat map,
// ordinal for the funnel (stage position, so it reads as an order).
export const PLUM_SEQUENTIAL = ['#C9A5C9', '#AC83B0', '#8D6194', '#6E4377', '#4F2C5A']
export const PLUM_ORDINAL    = ['#3A2240', '#52305D', '#71467A', '#906496', '#AE86B2', '#CBA8CB']

export const NO_DATA = '#B4A8B3' // "not sure" / unknown — deliberately outside the palette

export const GENERATION_LABELS: Record<string, string> = {
  gen_alpha:  'Gen Alpha',
  gen_z:      'Gen Z',
  millennial: 'Millennial',
  gen_x:      'Gen X',
  boomer:     'Boomer',
  silent_gen: 'Silent Gen',
}

export const TRIBE_LABELS: Record<string, string> = {
  early_bird:      '6AM Crew',
  am_achiever:     'School Run Squad',
  lunch_legends:   'Lunch Break Legends',
  afternoon:       'Afternoon Avengers',
  pm_warrior:      '5PM Tribe',
  weekend_warrior: 'Weekend Warriors',
}

export const MEMBERSHIP_LABELS: Record<string, string> = {
  hakoah_one:    'Hakoah One',
  lifestyle:     'Lifestyle',
  fitness:       'Fitness',
  wellness:      'Wellness',
  teen:          'Teen',
  not_sure:      'Not Sure',
  // legacy values (pre-2026-06 rename) — kept so historical rows still render
  signature:     'Lifestyle', // renamed → lifestyle
  comprehensive: 'Lifestyle', // merged → lifestyle
}

export const SOURCE_LABELS: Record<string, string> = {
  hakoah_newsletter:     'Hakoah Newsletter',
  meta_paid:             'Meta Paid',
  google_search:         'Google Search',
  google_display:        'Google Display',
  organic_social:        'Organic Social',
  referral:              'Referral',
  walk_in:               'Walk In',
  event:                 'Event',
  hoarding_qr:           'Hoarding QR',
  pr_editorial:          'PR / Editorial',
  corporate_partnership: 'Corporate Partner',
  website_direct:        'Website Direct',
  other:                 'Other',
}

export const STAGE_LABELS: Record<string, string> = {
  awareness:       'Awareness',
  vip_waitlist:    'VIP Waitlist',
  event_attended:  'Event Attended',
  tour_attended:   'Toured',
  proposal:        'Offer Made',
  founding_member: 'Founding Member',
  member:          'Member',
  withdrawn:       'Withdrawn',
  // legacy stage codes (pre-2026-06) — kept so historical rows still render
  interest:        'Opted In',
  nurture:         'Nurture',
  tour_booked:     'Tour Booked',
  sold:            'Sold',
}

// Colours are assigned in each dimension's canonical order (generations oldest→
// youngest, tribes through the day), and charts render in that order too — so
// the slice/bar neighbours are the pairs the palette was validated against.
export const GENERATION_COLORS: Record<string, string> = {
  gen_alpha:  CATEGORICAL[0],
  gen_z:      CATEGORICAL[1],
  millennial: CATEGORICAL[2],
  gen_x:      CATEGORICAL[3],
  boomer:     CATEGORICAL[4],
  silent_gen: CATEGORICAL[5],
}

export const TRIBE_COLORS: Record<string, string> = {
  early_bird:      CATEGORICAL[0],
  am_achiever:     CATEGORICAL[1],
  lunch_legends:   CATEGORICAL[2],
  afternoon:       CATEGORICAL[3],
  pm_warrior:      CATEGORICAL[4],
  weekend_warrior: CATEGORICAL[5],
}

export const MEMBERSHIP_COLORS: Record<string, string> = {
  hakoah_one:    CATEGORICAL[0],
  lifestyle:     CATEGORICAL[1], // flagship product wears the house plum
  fitness:       CATEGORICAL[2],
  wellness:      CATEGORICAL[3],
  teen:          CATEGORICAL[4],
  not_sure:      NO_DATA,
  // legacy
  signature:     CATEGORICAL[1],
  comprehensive: CATEGORICAL[1],
}

// Canonical display order per dimension — drives both colour assignment above
// and the order charts render in.
export const GENERATION_ORDER = Object.keys(GENERATION_LABELS)
export const TRIBE_ORDER      = Object.keys(TRIBE_LABELS)

export const PIPELINE_STAGES = [
  'awareness','vip_waitlist','event_attended','tour_attended',
  'proposal','founding_member','member'
]

export const OPENING_DATE = new Date('2027-04-15')
export const CAMPAIGN_START = new Date('2026-06-01')
