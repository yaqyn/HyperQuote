// Dispatch scheduling constraint validators — pure functions
// Enforces Cairo truck ban, prayer times, Jumu'ah, Khamsin, equipment restrictions

import type {
	ConstraintViolation,
	Driver,
	DriverType,
	PrayerTime,
	RouteStop,
	Vehicle,
} from '../types/dispatch'

// ─── Cairo Timezone Helpers ──────────────────────────────

const cairoHourFormatter = new Intl.DateTimeFormat('en', {
	timeZone: 'Africa/Cairo',
	hour: 'numeric',
	hour12: false,
})

const cairoMinuteFormatter = new Intl.DateTimeFormat('en', {
	timeZone: 'Africa/Cairo',
	minute: 'numeric',
})

const cairoDayFormatter = new Intl.DateTimeFormat('en', {
	timeZone: 'Africa/Cairo',
	weekday: 'short',
})

function getCairoHour(date: Date): number {
	return Number(cairoHourFormatter.format(date))
}

function getCairoMinute(date: Date): number {
	return Number(cairoMinuteFormatter.format(date))
}

function isFridayInCairo(date: Date): boolean {
	return cairoDayFormatter.format(date) === 'Fri'
}

// ─── Greater Cairo Detection ─────────────────────────────
// Bounding box for Greater Cairo metropolitan area

const CAIRO_BOUNDS = {
	minLat: 29.75,
	maxLat: 30.35,
	minLng: 30.85,
	maxLng: 31.75,
}

function isGreaterCairoCoords(lat: number, lng: number): boolean {
	return (
		lat >= CAIRO_BOUNDS.minLat &&
		lat <= CAIRO_BOUNDS.maxLat &&
		lng >= CAIRO_BOUNDS.minLng &&
		lng <= CAIRO_BOUNDS.maxLng
	)
}

// ─── Cairo Truck Ban ─────────────────────────────────────
// Heavy trucks (5+ tons) banned 6AM-midnight in Greater Cairo

export function isCairoTruckBanViolation(
	weightKg: number,
	scheduledTime: Date,
	isGreaterCairo: boolean,
): boolean {
	if (!isGreaterCairo) return false
	if (weightKg < 5000) return false

	const hour = getCairoHour(scheduledTime)
	// Ban: 6AM (hour 6) to midnight (hour 0 next day)
	// Allowed: midnight to 6AM (hours 0-5)
	return hour >= 6
}

// ─── Prayer Time Conflict ────────────────────────────────
// Returns conflicting prayer if scheduled time is within buffer of any prayer

export function isPrayerTimeConflict(
	scheduledTime: Date,
	prayerTimes: PrayerTime[],
	bufferMinutes = 15,
): PrayerTime | null {
	const scheduledMs = scheduledTime.getTime()
	const bufferMs = bufferMinutes * 60 * 1000

	for (const prayer of prayerTimes) {
		const prayerMs = prayer.time.getTime()
		if (Math.abs(scheduledMs - prayerMs) <= bufferMs) {
			return prayer
		}
	}
	return null
}

// ─── Friday Jumu'ah Blackout ─────────────────────────────
// Friday 11:30-13:30 Cairo time blocked

export function isFridayJumuahBlocked(scheduledTime: Date): boolean {
	if (!isFridayInCairo(scheduledTime)) return false

	const hour = getCairoHour(scheduledTime)
	const minute = getCairoMinute(scheduledTime)
	const totalMinutes = hour * 60 + minute

	// 11:30 (690 min) to 13:30 (810 min)
	return totalMinutes >= 690 && totalMinutes <= 810
}

// ─── Khamsin Wind Restriction ────────────────────────────
// Wind > 30 km/h + sheet materials = blocked

export function isKhamsinBlocked(
	windSpeedKmh: number,
	hasSheetMaterials: boolean,
): boolean {
	return windSpeedKmh > 30 && hasSheetMaterials
}

// ─── Equipment Restriction ───────────────────────────────
// Equipment jobs (moffett/boom/crane) only for INTERNAL or CONTRACTED

export function isEquipmentRestricted(
	equipmentNeeded: string,
	driverType: DriverType,
): boolean {
	if (equipmentNeeded === 'none') return false
	const requiresCertified = ['moffett', 'boom', 'crane']
	if (!requiresCertified.includes(equipmentNeeded)) return false
	return driverType === 'ON_DEMAND'
}

// ─── Driver Compliance ───────────────────────────────────
// Checks license and medical expiry

export function isDriverComplianceValid(driver: Driver): boolean {
	const now = new Date()
	const licenseExpiry = new Date(driver.licenseExpiry)
	const medicalExpiry = new Date(driver.medicalExpiry)

	if (licenseExpiry < now) return false
	if (medicalExpiry < now) return false

	return true
}

// ─── Static Cairo Prayer Times (approximate by month) ────
// Per RESEARCH.md: approximate times for scheduling, not for worship

const CAIRO_PRAYER_TIMES_BY_MONTH: Record<
	number,
	{ name: string; hour: number; minute: number }[]
> = {
	1: [
		{ name: 'Fajr', hour: 5, minute: 20 },
		{ name: 'Dhuhr', hour: 12, minute: 15 },
		{ name: 'Asr', hour: 15, minute: 0 },
		{ name: 'Maghrib', hour: 17, minute: 15 },
		{ name: 'Isha', hour: 18, minute: 35 },
	],
	2: [
		{ name: 'Fajr', hour: 5, minute: 10 },
		{ name: 'Dhuhr', hour: 12, minute: 15 },
		{ name: 'Asr', hour: 15, minute: 20 },
		{ name: 'Maghrib', hour: 17, minute: 40 },
		{ name: 'Isha', hour: 18, minute: 55 },
	],
	3: [
		{ name: 'Fajr', hour: 4, minute: 50 },
		{ name: 'Dhuhr', hour: 12, minute: 10 },
		{ name: 'Asr', hour: 15, minute: 30 },
		{ name: 'Maghrib', hour: 18, minute: 0 },
		{ name: 'Isha', hour: 19, minute: 15 },
	],
	4: [
		{ name: 'Fajr', hour: 4, minute: 20 },
		{ name: 'Dhuhr', hour: 12, minute: 0 },
		{ name: 'Asr', hour: 15, minute: 35 },
		{ name: 'Maghrib', hour: 18, minute: 20 },
		{ name: 'Isha', hour: 19, minute: 40 },
	],
	5: [
		{ name: 'Fajr', hour: 3, minute: 55 },
		{ name: 'Dhuhr', hour: 12, minute: 0 },
		{ name: 'Asr', hour: 15, minute: 40 },
		{ name: 'Maghrib', hour: 18, minute: 40 },
		{ name: 'Isha', hour: 20, minute: 5 },
	],
	6: [
		{ name: 'Fajr', hour: 3, minute: 40 },
		{ name: 'Dhuhr', hour: 12, minute: 5 },
		{ name: 'Asr', hour: 15, minute: 45 },
		{ name: 'Maghrib', hour: 18, minute: 55 },
		{ name: 'Isha', hour: 20, minute: 20 },
	],
	7: [
		{ name: 'Fajr', hour: 3, minute: 50 },
		{ name: 'Dhuhr', hour: 12, minute: 10 },
		{ name: 'Asr', hour: 15, minute: 45 },
		{ name: 'Maghrib', hour: 18, minute: 50 },
		{ name: 'Isha', hour: 20, minute: 15 },
	],
	8: [
		{ name: 'Fajr', hour: 4, minute: 5 },
		{ name: 'Dhuhr', hour: 12, minute: 5 },
		{ name: 'Asr', hour: 15, minute: 35 },
		{ name: 'Maghrib', hour: 18, minute: 30 },
		{ name: 'Isha', hour: 19, minute: 50 },
	],
	9: [
		{ name: 'Fajr', hour: 4, minute: 20 },
		{ name: 'Dhuhr', hour: 12, minute: 0 },
		{ name: 'Asr', hour: 15, minute: 15 },
		{ name: 'Maghrib', hour: 18, minute: 0 },
		{ name: 'Isha', hour: 19, minute: 15 },
	],
	10: [
		{ name: 'Fajr', hour: 4, minute: 35 },
		{ name: 'Dhuhr', hour: 11, minute: 45 },
		{ name: 'Asr', hour: 14, minute: 50 },
		{ name: 'Maghrib', hour: 17, minute: 25 },
		{ name: 'Isha', hour: 18, minute: 40 },
	],
	11: [
		{ name: 'Fajr', hour: 4, minute: 55 },
		{ name: 'Dhuhr', hour: 11, minute: 45 },
		{ name: 'Asr', hour: 14, minute: 35 },
		{ name: 'Maghrib', hour: 17, minute: 0 },
		{ name: 'Isha', hour: 18, minute: 15 },
	],
	12: [
		{ name: 'Fajr', hour: 5, minute: 15 },
		{ name: 'Dhuhr', hour: 11, minute: 55 },
		{ name: 'Asr', hour: 14, minute: 40 },
		{ name: 'Maghrib', hour: 17, minute: 0 },
		{ name: 'Isha', hour: 18, minute: 20 },
	],
}

/**
 * Get approximate prayer times for a given date in Cairo timezone.
 * Uses static lookup by month — suitable for scheduling, not worship.
 */
export function getCairoPrayerTimes(date: Date): PrayerTime[] {
	const month = date.getMonth() + 1 // 1-indexed
	const prayers =
		CAIRO_PRAYER_TIMES_BY_MONTH[month] ?? CAIRO_PRAYER_TIMES_BY_MONTH[1] ?? []

	return prayers.map((p) => {
		const prayerDate = new Date(date)
		prayerDate.setHours(p.hour, p.minute, 0, 0)
		return { name: p.name, time: prayerDate }
	})
}

// ─── Aggregate Validator ─────────────────────────────────

export function validateAllConstraints(
	stop: RouteStop,
	driver: Driver,
	vehicle: Vehicle,
	date: Date,
	weather?: { windSpeedKmh: number },
): ConstraintViolation[] {
	const violations: ConstraintViolation[] = []

	// Cairo truck ban — use coordinate check for Greater Cairo
	const isGCairo = isGreaterCairoCoords(stop.lat, stop.lng)
	if (isCairoTruckBanViolation(stop.weight, date, isGCairo)) {
		violations.push({
			type: 'cairo_ban',
			message: `Heavy vehicle (${stop.weight}kg) blocked during Cairo truck ban hours (6AM-midnight)`,
			severity: 'error',
		})
	}

	// Equipment restriction
	if (isEquipmentRestricted(stop.equipmentNeeded, driver.type)) {
		violations.push({
			type: 'equipment',
			message: `Equipment job (${stop.equipmentNeeded}) cannot be assigned to ${driver.type} driver`,
			severity: 'error',
		})
	}

	// Friday Jumu'ah
	if (isFridayJumuahBlocked(date)) {
		violations.push({
			type: 'jumuah',
			message:
				"Delivery blocked during Friday Jumu'ah prayer period (11:30-13:30)",
			severity: 'error',
		})
	}

	// Khamsin wind
	if (weather) {
		const hasSheets = stop.equipmentNeeded !== 'none'
		// More accurate: check if cargo has sheet materials
		// For now, use weight as proxy — light loads without equipment are less wind-sensitive
		if (isKhamsinBlocked(weather.windSpeedKmh, hasSheets)) {
			violations.push({
				type: 'khamsin',
				message: `High wind (${weather.windSpeedKmh} km/h) unsafe for sheet materials`,
				severity: 'warning',
			})
		}
	}

	// Prayer time conflict
	const prayerTimes = getCairoPrayerTimes(date)
	const conflictingPrayer = isPrayerTimeConflict(date, prayerTimes)
	if (conflictingPrayer) {
		violations.push({
			type: 'prayer_time',
			message: `Scheduled time conflicts with ${conflictingPrayer.name} prayer`,
			severity: 'warning',
		})
	}

	// Driver compliance
	if (!isDriverComplianceValid(driver)) {
		violations.push({
			type: 'cdl',
			message: 'Driver has expired license or medical certification',
			severity: 'error',
		})
	}

	// Capacity check
	if (stop.weight > vehicle.capacityKg) {
		violations.push({
			type: 'capacity',
			message: `Stop weight (${stop.weight}kg) exceeds vehicle capacity (${vehicle.capacityKg}kg)`,
			severity: 'error',
		})
	}

	return violations
}
