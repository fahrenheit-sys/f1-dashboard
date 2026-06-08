export const BRAND = {
  forest:     '#2F3E2E',
  greenMid:   '#4A6B50',
  greenLight: '#D4E8D6',
  terra:      '#8B3A2E',
  brick:      '#B85042',
  brickLight: '#F5DDD8',
  gold:       '#E8A020',
  goldLight:  '#FFF3CC',
  cream:      '#FAF6F0',
  cream2:     '#EDE8DF',
  charcoal:   '#2C3E50',
  slate:      '#44546A',
  white:      '#FFFFFF',
  commDark:   '#2F3E2E',
  commLight:  '#D4E8D6',
  localDark:  '#8B3A2E',
  localLight: '#F5DDD8',
}

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
  signature:     'Signature',
  fitness:       'Fitness',
  wellness:      'Wellness',
  comprehensive: 'Comprehensive', // legacy — merged into Signature
  teen:          'Teen',
  family:        'Family',
  corporate:     'Corporate',
  not_sure:      'Not Sure',
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
  interest:        'Interest',
  vip_waitlist:    'VIP Waitlist',
  nurture:         'Nurture',
  tour_booked:     'Tour Booked',
  tour_attended:   'Tour Attended',
  proposal:        'Proposal',
  sold:            'Sold',
  founding_member: 'Founding Member',
  member:          'Member',
}

export const GENERATION_COLORS: Record<string, string> = {
  gen_alpha:  '#60a5fa',
  gen_z:      '#3B6E9E',
  millennial: '#5B4A8A',
  gen_x:      '#E8A020',
  boomer:     '#8B3A2E',
  silent_gen: '#4A6B50',
}

export const TRIBE_COLORS: Record<string, string> = {
  early_bird:      '#3B6E9E',
  am_achiever:     '#5B4A8A',
  lunch_legends:   '#E8A020',
  afternoon:       '#4A6B50',
  pm_warrior:      '#8B3A2E',
  weekend_warrior: '#B85042',
}

export const MEMBERSHIP_COLORS: Record<string, string> = {
  hakoah_one:    '#E8A020',
  signature:     '#2F3E2E',
  fitness:       '#3B6E9E',
  wellness:      '#4A6B50',
  comprehensive: '#2F3E2E',
  teen:          '#5B4A8A',
  family:        '#8B3A2E',
  corporate:     '#44546A',
  not_sure:      '#aaa',
}

export const PIPELINE_STAGES = [
  'awareness','interest','vip_waitlist','nurture',
  'tour_booked','tour_attended','proposal','sold','founding_member'
]

export const OPENING_DATE = new Date('2027-04-15')
export const CAMPAIGN_START = new Date('2026-06-01')
