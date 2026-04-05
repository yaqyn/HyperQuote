import type { SupplierTier } from '../../../types/procurement'

/**
 * Compute fill rate as received / ordered, capped at 1.0.
 * Returns 0 if ordered is 0.
 */
export function computeFillRate(received: number, ordered: number): number {
  if (ordered === 0) return 0
  return Math.min(received / ordered, 1.0)
}

/**
 * Map overall score (1-5 scale) to star rating.
 * Uses 0.5 thresholds: 4.5+ = 5, 3.5-4.49 = 4, etc.
 *
 * For scores on 0-100 scale, caller must normalize first.
 */
export function computeStarRating(score: number): number {
  if (score >= 4.5) return 5
  if (score >= 3.5) return 4
  if (score >= 2.5) return 3
  if (score >= 1.5) return 2
  return 1
}

/**
 * Map supplier tier to inspection level description.
 * Matches spec exactly -- do not modify strings.
 */
const TIER_INSPECTION_MAP: Record<SupplierTier, string> = {
  preferred: 'Skip-lot inspection, priority dispatch',
  approved: 'AQL sampling inspection',
  conditional: 'Tightened inspection required',
  new: '100% inspection required',
}

export function getTierInspectionLevel(tier: SupplierTier): string {
  return TIER_INSPECTION_MAP[tier]
}

/**
 * Normalize a 0-100 score to 1-5 star scale.
 */
export function normalizeToStars(score100: number): number {
  return computeStarRating(score100 / 20)
}
