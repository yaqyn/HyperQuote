const DELIVERY_SECRET_CODE_PATTERN =
	/^(?:HQDELIVERY:[0-9A-F]{32}:)?([2-9A-HJ-NP-Z]{8})$/

export function normalizeDeliverySecretInput(value: string): string {
	return value.toUpperCase().replace(/[\s-]+/g, '')
}

export function extractDeliverySecretCode(value: string): string | null {
	const normalized = normalizeDeliverySecretInput(value)
	if (!normalized) return null

	const match = normalized.match(DELIVERY_SECRET_CODE_PATTERN)
	return match?.[1] ?? null
}

export function isDeliverySecretCodeReady(value: string): boolean {
	return extractDeliverySecretCode(value) !== null
}
