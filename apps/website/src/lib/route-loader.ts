export function isAbortedRouteLoad(
	error: unknown,
	signal: AbortSignal,
): boolean {
	if (!signal.aborted) return false
	if (!(error instanceof Error)) return false
	return /abort|aborted|failed to fetch/i.test(error.message)
}
