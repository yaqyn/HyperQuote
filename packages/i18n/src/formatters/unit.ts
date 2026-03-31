import { formatNumber } from './number'

// Unit abbreviation lookup tables (duplicated from JSON for use without i18next runtime)
const EN_UNITS: Record<string, string> = {
  kg: 'kg', ton: 'ton', metric_ton: 'metric ton', meter: 'm',
  sqm: 'm\u00B2', cubic_meter: 'm\u00B3', liter: 'L', piece: 'pc',
  bag: 'bag', bundle: 'bundle', pallet: 'pallet', roll: 'roll',
  sheet: 'sheet', box: 'box', carton: 'carton', set: 'set',
  pair: 'pair', foot: 'ft', inch: 'in', yard: 'yd',
  sqft: 'ft\u00B2', cubic_yard: 'yd\u00B3', gallon: 'gal', lb: 'lb',
  linear_foot: 'LF', linear_meter: 'LM', board_foot: 'BF', truck_load: 'TL',
}

const AR_UNITS: Record<string, string> = {
  kg: '\u0643\u062C\u0645', ton: '\u0637\u0646', metric_ton: '\u0637.\u0645', meter: '\u0645',
  sqm: '\u0645\u00B2', cubic_meter: '\u0645\u00B3', liter: '\u0644', piece: '\u0642\u0637\u0639\u0629',
  bag: '\u0643\u064A\u0633', bundle: '\u062D\u0632\u0645\u0629', pallet: '\u0644\u0648\u062D', roll: '\u0644\u0641\u0629',
  sheet: '\u0644\u0648\u062D', box: '\u0635\u0646\u062F\u0648\u0642', carton: '\u0643\u0631\u062A\u0648\u0646\u0629', set: '\u0637\u0642\u0645',
  pair: '\u0632\u0648\u062C', foot: '\u0642\u062F\u0645', inch: '\u0628\u0648\u0635\u0629', yard: '\u064A\u0627\u0631\u062F\u0629',
  sqft: '\u0642\u062F\u0645\u00B2', cubic_yard: '\u064A\u0627\u0631\u062F\u0647\u00B3', gallon: '\u062C\u0627\u0644\u0648\u0646', lb: '\u0631\u0637\u0644',
  linear_foot: '\u0642.\u0637', linear_meter: '\u0645.\u0637', board_foot: '\u0642.\u062E', truck_load: '\u062D\u0645\u0648\u0644\u0629',
}

const UNIT_MAPS = { ar: AR_UNITS, en: EN_UNITS } as const

/**
 * Format a value with its unit abbreviation.
 * Returns "500 kg" (en) or "\u0665\u0660\u0660 \u0643\u062C\u0645" (ar).
 */
export function formatUnit(value: number, unit: string, locale: 'ar' | 'en'): string {
  const formattedValue = formatNumber(value, locale)
  const unitLabel = UNIT_MAPS[locale][unit] ?? unit
  return `${formattedValue} ${unitLabel}`
}
