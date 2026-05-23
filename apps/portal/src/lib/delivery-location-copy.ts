interface DeliveryPoint {
	lat: number
	lng: number
}

interface DeliveryRouteForCopy {
	destination?: string | null
	destinationLocation?: DeliveryPoint | null
	distanceKm?: number | null
	driverLocation?: DeliveryPoint | null
}

interface DeliveryForLocationCopy {
	driverPlace?: string | null
	route: DeliveryRouteForCopy
}

const NEAR_PLACE_KM = 0.25
const EARTH_RADIUS_KM = 6371

export function customerDeliveryDestinationPlace(
	delivery: DeliveryForLocationCopy,
): string | null {
	return cleanPlaceLabel(delivery.route.destination)
}

export function describeDriverLocationForCustomer(
	delivery: DeliveryForLocationCopy,
): string {
	const route = delivery.route
	const destination = cleanPlaceLabel(route.destination)
	const driverLocation = route.driverLocation ?? null
	const driverPlace = cleanPlaceLabel(delivery.driverPlace)

	if (!driverLocation) {
		return destination
			? `no live ping yet; destination is ${destination}`
			: 'no live location is available yet'
	}

	if (driverPlace) return `in ${driverPlace}`

	const destinationDistance = distanceBetween(
		driverLocation,
		route.destinationLocation ?? null,
	)
	if (
		destination &&
		destinationDistance !== null &&
		destinationDistance <= NEAR_PLACE_KM
	) {
		return `near ${destination}`
	}

	return 'live ping active; place name is still resolving'
}

export function formatDeliveryTimestamp(value: string): string {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

function cleanPlaceLabel(value: string | null | undefined): string | null {
	const parts = value
		?.split(',')
		.map((part) => cleanPlacePart(part))
		.filter((part): part is string => Boolean(part))
	if (!parts || parts.length === 0) return null
	return uniquePlaceParts(parts).join(', ')
}

function cleanPlacePart(value: string | null | undefined): string | null {
	const cleaned = value?.replace(/\s+/g, ' ').trim()
	if (!cleaned) return null
	if (/^(?:street|egypt)$/i.test(cleaned)) return null
	if (isRecordLikeLabel(cleaned) || isDriverPlaceholder(cleaned)) return null
	return cleaned
}

function uniquePlaceParts(parts: string[]): string[] {
	const seen = new Set<string>()
	const unique: string[] = []
	for (const part of parts) {
		const key = part.toLocaleLowerCase('en')
		if (seen.has(key)) continue
		seen.add(key)
		unique.push(part)
	}
	return unique
}

function isRecordLikeLabel(value: string): boolean {
	return /^(?:QR|RFQ|REQ|ORD|ORDER|QUOTE|DEL|DLV|DELIVERY)[-_ ]?\d/i.test(value)
}

function isDriverPlaceholder(value: string): boolean {
	return /^(?:driver|driver[-_ ]?\d+|truck[-_ ]?\d+)$/i.test(value)
}

function distanceBetween(
	left: DeliveryPoint,
	right: DeliveryPoint | null,
): number | null {
	if (!right) return null
	if (!isFinitePoint(left) || !isFinitePoint(right)) return null
	const latDelta = toRadians(right.lat - left.lat)
	const lngDelta = toRadians(right.lng - left.lng)
	const leftLat = toRadians(left.lat)
	const rightLat = toRadians(right.lat)
	const haversine =
		Math.sin(latDelta / 2) ** 2 +
		Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(lngDelta / 2) ** 2
	return (
		EARTH_RADIUS_KM *
		2 *
		Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
	)
}

function isFinitePoint(point: DeliveryPoint): boolean {
	return Number.isFinite(point.lat) && Number.isFinite(point.lng)
}

function toRadians(value: number): number {
	return (value * Math.PI) / 180
}
