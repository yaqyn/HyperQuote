/**
 * Weight conversion utilities.
 * All internal calculations in kg (per Pitfall 4).
 * Display converts based on user preference.
 */

type WeightUnit = 'lbs' | 'tons' | 'tonnes' | 'kg'

/** Conversion factors to kg */
const TO_KG: Record<WeightUnit, number> = {
  kg: 1,
  lbs: 0.45359237,
  tons: 907.18474,      // US short ton
  tonnes: 1000,         // Metric tonne
}

/**
 * Convert a weight value to kilograms.
 */
export function toKg(value: number, unit: WeightUnit): number {
  return value * TO_KG[unit]
}

/**
 * Convert a weight from kilograms to the target unit.
 */
export function fromKg(kg: number, unit: WeightUnit): number {
  return kg / TO_KG[unit]
}

/**
 * Calculate net weight from gross and tare.
 * Returns the absolute difference (gross - tare).
 */
export function calculateNetWeight(gross: number, tare: number): number {
  return gross - tare
}
