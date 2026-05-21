interface SupabaseAddressParts {
	area: string | null
	city: string | null
	governorate: string | null
	landmark: string | null
	street: string | null
}

export function formatSupabaseAddress(
	address: SupabaseAddressParts | null,
): string {
	if (!address) return ''
	return [
		address.street,
		address.area,
		address.city,
		address.governorate,
		address.landmark,
	]
		.filter((part): part is string => Boolean(part?.trim()))
		.join(', ')
}
