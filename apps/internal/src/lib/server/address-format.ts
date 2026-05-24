interface SupabaseAddressParts {
	area: string | null
	city: string | null
	governorate: string | null
	landmark?: string | null
	label?: string | null
	street: string | null
}

export const SALES_QUOTE_ADDRESS_LABEL = 'Sales quote site'

function normalizeAddressPart(value: string): string {
	return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function formatAddressParts(parts: Array<string | null | undefined>): string {
	const seen = new Set<string>()
	const formatted: string[] = []
	for (const part of parts) {
		const cleaned = part?.trim().replace(/\s+/g, ' ')
		if (!cleaned) continue
		const key = normalizeAddressPart(cleaned)
		if (seen.has(key)) continue
		seen.add(key)
		formatted.push(cleaned)
	}
	return formatted.join(', ')
}

export function normalizeAddressText(value: string | null | undefined): string {
	return formatAddressParts((value ?? '').split(','))
}

export function isSalesQuoteAddress(
	address: { label?: string | null } | null | undefined,
): boolean {
	return address?.label === SALES_QUOTE_ADDRESS_LABEL
}

export function formatSupabaseAddress(
	address: SupabaseAddressParts | null,
): string {
	if (!address) return ''
	return formatAddressParts([
		address.street,
		address.area,
		address.city,
		address.governorate,
		address.landmark,
	])
}
