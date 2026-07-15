export const QUOTE_REQUEST_AGREEMENT_VERSION = '2026-07-15'

export const QUOTE_DELIVERY_WINDOW_IDS = [
	'08:00-13:00',
	'13:00-17:00',
	'17:00-20:00',
	'00:00-06:00',
] as const

export const QUOTE_DELIVERY_WINDOWS = [
	{ id: '08:00-13:00', labelKey: 'morning' },
	{ id: '13:00-17:00', labelKey: 'midday' },
	{ id: '17:00-20:00', labelKey: 'evening' },
	{ id: '00:00-06:00', labelKey: 'night' },
] as const

export type QuoteDeliveryWindow = (typeof QUOTE_DELIVERY_WINDOW_IDS)[number]

export interface QuoteRequestAddress {
	area: string
	city: string
	governorate: string
	id: string
	isDefault: boolean
	label: string | null
	latitude: number | null
	longitude: number | null
	street: string
}

export interface QuoteDeliveryLocation {
	area: string
	city: string
	governorate: string
	latitude: number
	locationName: string
	locationNameAr: string
	longitude: number
	street: string
}

export interface QuoteLocationSearchResult {
	area: string
	city: string
	displayName: string
	governorate: string
	id: string
	latitude: number
	locationName: string
	longitude: number
	street: string
}

export interface QuoteProjectSummary {
	description: string | null
	draftCount: number
	id: string
	lastActivityAt: string
	name: string
	orderCount: number
	requestCount: number
}

export interface QuoteRecentLocation extends QuoteDeliveryLocation {
	id: string
	lastUsedAt: string
	useCount: number
}

export function buildDetailedQuoteLocationName(
	address: Record<string, string>,
	displayName: string,
): string {
	const first = (...keys: string[]) => {
		for (const key of keys) {
			const value = address[key]?.trim()
			if (value) return value
		}
		return ''
	}
	const houseNumber = first('house_number')
	const road = first('road', 'pedestrian', 'residential', 'path')
	const street = [houseNumber, road].filter(Boolean).join(' ')
	const candidates = [
		first(
			'amenity',
			'building',
			'tourism',
			'shop',
			'leisure',
			'office',
			'commercial',
			'industrial',
		),
		street,
		first('neighbourhood'),
		first('suburb'),
		first('quarter'),
		first('city_district', 'borough'),
		first('village'),
		first('town'),
		first('city', 'municipality'),
		first('state_district', 'county'),
		first('state', 'province'),
	]
	const seen = new Set<string>()
	const parts = candidates.filter((candidate) => {
		const normalized = candidate.trim().toLocaleLowerCase()
		if (!normalized || seen.has(normalized)) return false
		seen.add(normalized)
		return true
	})
	if (parts.length >= 2) return parts.join(', ')
	return displayName
		.split(',')
		.map((part) => part.trim())
		.filter(
			(part, index) =>
				index < 7 &&
				part.length > 0 &&
				!/^\d{4,}$/.test(part) &&
				!['egypt', 'مصر'].includes(part.toLocaleLowerCase()),
		)
		.join(', ')
}

export function toEgyptMobileInput(value: string): string {
	let normalized = value.replace(/\D/g, '')
	if (normalized.startsWith('20') && normalized.length > 10) {
		normalized = normalized.slice(2)
	}
	if (normalized.startsWith('0') && normalized.length > 10) {
		normalized = normalized.slice(1)
	}
	return normalized.slice(0, 10)
}

export function isEgyptMobileInput(value: string): boolean {
	return /^(10|11|12|15)\d{8}$/.test(value)
}

export function cairoDateString(date = new Date()): string {
	let day = ''
	let month = ''
	let year = ''
	const parts = new Intl.DateTimeFormat('en', {
		day: '2-digit',
		month: '2-digit',
		timeZone: 'Africa/Cairo',
		year: 'numeric',
	}).formatToParts(date)
	for (const part of parts) {
		if (part.type === 'day') day = part.value
		if (part.type === 'month') month = part.value
		if (part.type === 'year') year = part.value
	}
	if (!day || !month || !year) {
		throw new Error('Could not resolve the current Cairo date')
	}
	return `${year}-${month}-${day}`
}

export function isValidQuoteDeliveryDate(
	value: string,
	now = new Date(),
): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value <= cairoDateString(now)) {
		return false
	}
	const date = new Date(`${value}T00:00:00Z`)
	if (
		Number.isNaN(date.getTime()) ||
		date.toISOString().slice(0, 10) !== value
	) {
		return false
	}
	const weekday = date.getUTCDay()
	return weekday !== 5 && weekday !== 6
}

export function formatQuoteRequestAddress(
	address: Pick<
		QuoteDeliveryLocation,
		'area' | 'city' | 'governorate' | 'street'
	> &
		Partial<Pick<QuoteDeliveryLocation, 'locationName'>>,
): string {
	if (address.locationName?.trim()) return address.locationName.trim()
	return Array.from(
		new Set(
			[address.street, address.area, address.city, address.governorate]
				.map((part) => part.trim())
				.filter(Boolean),
		),
	).join(', ')
}
