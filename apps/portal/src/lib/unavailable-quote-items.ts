const UNAVAILABLE_QUOTE_ITEMS_ERROR = 'unavailable_quote_items:'

export function serializeUnavailableItemsError(names: string[]) {
	return `${UNAVAILABLE_QUOTE_ITEMS_ERROR}${JSON.stringify(names)}`
}

export function unavailableItemNamesFromError(error: unknown): string[] {
	const message =
		error instanceof Error
			? error.message
			: typeof error === 'string'
				? error
				: ''
	const markerIndex = message.indexOf(UNAVAILABLE_QUOTE_ITEMS_ERROR)
	if (markerIndex < 0) return []

	try {
		const parsed = JSON.parse(
			message.slice(markerIndex + UNAVAILABLE_QUOTE_ITEMS_ERROR.length),
		)
		return Array.isArray(parsed)
			? parsed.filter((item): item is string => typeof item === 'string')
			: []
	} catch {
		return []
	}
}
