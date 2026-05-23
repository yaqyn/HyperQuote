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

	if (!driverLocation) {
		return destination
			? `no live ping yet; destination is ${destination}`
			: 'no live location is available yet'
	}

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

	if (destination) {
		const distance = readableDistance(route.distanceKm ?? destinationDistance)
		return distance
			? `en route to ${destination} (${distance} away)`
			: `en route to ${destination}`
	}

	return 'active, but no named place is saved for the latest ping'
}

export function formatDeliveryTimestamp(value: string): string {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

function cleanPlaceLabel(value: string | null | undefined): string | null {
	const cleaned = value?.replace(/\s+/g, ' ').trim()
	if (!cleaned || isRecordLikeLabel(cleaned) || isDriverPlaceholder(cleaned)) {
		return null
	}
	return cleaned
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

function readableDistance(value: number | null | undefined): string | null {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		return null
	}
	if (value < 1) return `${Math.round(value * 1000)} m`
	return `${new Intl.NumberFormat('en-EG', {
		maximumFractionDigits: value < 10 ? 1 : 0,
	}).format(value)} km`
}

function toRadians(value: number): number {
	return (value * Math.PI) / 180
}
