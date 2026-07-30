// Fahrenheit One "Country Club" plum design tokens — matched to clubf1.com.au.
// Chrome (sidebar) is deep plum; the data canvas stays light so dense tables and
// charts remain readable. Brand + data-viz colours live in lib/constants BRAND.
export const UI = {
  bg:          '#F7F2F6', // app background (plum tint)
  surface:     '#FFFFFF', // cards
  surfaceAlt:  '#FBF7FA', // subtle alt surface (table header, hover)
  text:        '#241626', // primary text (ink)
  textMuted:   '#6B5F6B', // secondary text
  textFaint:   '#9A8C99', // tertiary / axis ticks
  border:      '#E9E0E8', // hairline borders (rule)
  borderStrong:'#D8CBD7',

  // Deep plum chrome — sidebar and any dark band
  plum:        '#2A1830',
  plumDeep:    '#150A19',
  plumLine:    '#3A2240',
  plumRaise:   '#3A2240', // hover / active surface inside the plum chrome
  onPlum:      '#E8DCE6', // primary text on plum
  onPlumMuted: '#C9B6C6', // secondary text on plum
  onPlumFaint: '#9C87A0', // labels on plum

  shadow:      '0 1px 2px rgba(42,24,48,0.05), 0 6px 20px rgba(42,24,48,0.07)',
  shadowSm:    '0 1px 2px rgba(42,24,48,0.07)',
  radius:      16,
  radiusSm:    10,
} as const
