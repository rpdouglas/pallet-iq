import type { BadgeTone } from '../../components/Badge'

// restock.ca condition strings, as observed server-side (RestockLot.condition
// is raw free text, not a closed enum - see src/types/restockLot.ts). Only
// map the values SPEC-DISCOVERED-LOTS-CARD-VIEW-001 calls out explicitly;
// anything else falls back to the neutral `slate` tone rather than throwing
// or rendering an undefined class.
const CONDITION_BADGE_TONES: Record<string, BadgeTone> = {
  Returns: 'amber',
  'Like New': 'emerald',
  New: 'sky',
}

export function getConditionBadgeTone(condition: string): BadgeTone {
  return CONDITION_BADGE_TONES[condition] ?? 'slate'
}
