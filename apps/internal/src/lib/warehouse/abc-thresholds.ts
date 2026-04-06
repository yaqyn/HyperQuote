import type { ABCClass } from '../../types/warehouse'

/**
 * ABC classification configuration.
 * Structured as a config object for future admin override (per Pitfall 3).
 * Thresholds represent the maximum acceptable variance percentage before recount is required.
 */
const ABC_CONFIG: Record<ABCClass, { varianceThreshold: number }> = {
  A: { varianceThreshold: 0.02 },  // 2% — cement, steel rebar (tight control)
  B: { varianceThreshold: 0.05 },  // 5% — lumber, aggregates, pipe (moderate control)
  C: { varianceThreshold: 0.10 },  // 10% — roofing, insulation, misc (looser control)
}

/**
 * Category-to-ABC class mapping.
 * Cement and steel rebar = A (high value, tight control).
 * Lumber, aggregates, pipe = B (moderate).
 * Everything else = C (lower value, looser control).
 */
const CATEGORY_ABC_MAP: Record<string, ABCClass> = {
  cement: 'A',
  steel_rebar: 'A',
  lumber: 'B',
  aggregates: 'B',
  pipe: 'B',
  roofing: 'C',
  insulation: 'C',
}

/**
 * Get the ABC class for a product category.
 * Defaults to C for unknown categories.
 */
export function getABCClass(productCategory: string): ABCClass {
  return CATEGORY_ABC_MAP[productCategory] ?? 'C'
}

/**
 * Get the variance threshold for an ABC class.
 * Returns the decimal fraction (e.g., 0.02 for 2%).
 */
export function getVarianceThreshold(abcClass: ABCClass): number {
  return ABC_CONFIG[abcClass].varianceThreshold
}

/**
 * Determine if a recount is needed based on variance and ABC class.
 * Uses absolute value of variance for comparison.
 */
export function needsRecount(variancePercent: number, abcClass: ABCClass): boolean {
  const threshold = getVarianceThreshold(abcClass)
  return Math.abs(variancePercent) > threshold
}
