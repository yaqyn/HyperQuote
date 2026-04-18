/**
 * Egyptian business day validation.
 * Egyptian weekend: Friday + Saturday.
 * Uses @internationalized/date isWeekend with 'ar-EG' locale.
 * Always uses ar-EG regardless of user's display locale.
 */
import {
	type DateValue,
	getLocalTimeZone,
	isWeekend,
	today,
} from '@internationalized/date'

// ============================================================================
// Egyptian Public Holidays 2026 (approximate dates)
// Lunar holidays shift -- these are best estimates.
// ============================================================================

interface Holiday {
	month: number
	day: number
	name: string
}

const EGYPTIAN_HOLIDAYS_2026: Holiday[] = [
	// Fixed holidays
	{ month: 1, day: 7, name: 'Coptic Christmas' },
	{ month: 1, day: 25, name: 'January 25 Revolution' },
	{ month: 4, day: 25, name: 'Sinai Liberation Day' },
	{ month: 5, day: 1, name: 'Labour Day' },
	{ month: 6, day: 30, name: 'June 30 Revolution' },
	{ month: 7, day: 23, name: 'July 23 Revolution' },
	{ month: 10, day: 6, name: 'Armed Forces Day' },

	// Islamic holidays 2026 (approximate, shift ~10 days/year)
	// Eid al-Fitr (end of Ramadan) -- approximately March 20-22, 2026
	{ month: 3, day: 20, name: 'Eid al-Fitr Day 1' },
	{ month: 3, day: 21, name: 'Eid al-Fitr Day 2' },
	{ month: 3, day: 22, name: 'Eid al-Fitr Day 3' },

	// Eid al-Adha -- approximately May 27-30, 2026
	{ month: 5, day: 27, name: 'Eid al-Adha Day 1' },
	{ month: 5, day: 28, name: 'Eid al-Adha Day 2' },
	{ month: 5, day: 29, name: 'Eid al-Adha Day 3' },
	{ month: 5, day: 30, name: 'Eid al-Adha Day 4' },

	// Islamic New Year -- approximately June 17, 2026
	{ month: 6, day: 17, name: 'Islamic New Year' },

	// Prophet's Birthday -- approximately August 26, 2026
	{ month: 8, day: 26, name: "Prophet's Birthday" },

	// Coptic Easter Monday -- approximately April 13, 2026
	{ month: 4, day: 13, name: 'Sham el-Nessim' },
]

// ============================================================================
// Functions
// ============================================================================

/**
 * Check if a date is an Egyptian weekend day (Friday or Saturday).
 * Always uses 'ar-EG' locale regardless of user's display locale.
 */
function isEgyptianWeekend(date: DateValue): boolean {
	return isWeekend(date, 'ar-EG')
}

/**
 * Check if a date is an Egyptian business day (not weekend, not holiday).
 */
function isEgyptianBusinessDay(date: DateValue): boolean {
	if (isEgyptianWeekend(date)) return false
	if (isEgyptianHoliday(date)) return false
	return true
}

/**
 * Check if a date falls on an Egyptian public holiday.
 */
function isEgyptianHoliday(date: DateValue): boolean {
	return EGYPTIAN_HOLIDAYS_2026.some(
		(h) => date.month === h.month && date.day === h.day,
	)
}

/**
 * Combined unavailability check for DatePicker's isDateUnavailable prop.
 * Returns true if the date is a weekend or holiday.
 */
export function isDateUnavailable(date: DateValue): boolean {
	return !isEgyptianBusinessDay(date)
}

/**
 * Get the next Egyptian business day from a given date.
 */
function getNextBusinessDay(from: DateValue): DateValue {
	let candidate = from.add({ days: 1 })
	let safety = 0
	while (!isEgyptianBusinessDay(candidate) && safety < 14) {
		candidate = candidate.add({ days: 1 })
		safety++
	}
	return candidate
}

/**
 * Get the minimum delivery date (next business day from today in Cairo timezone).
 */
function getMinDeliveryDate(): DateValue {
	const now = today(getLocalTimeZone())
	return getNextBusinessDay(now)
}
