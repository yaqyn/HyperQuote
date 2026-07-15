export function getPortalHref(
	path = '/',
	hostname = currentHostname(),
): string {
	const configured = import.meta.env.VITE_PORTAL_URL
	const suffix = path.startsWith('/') ? path : `/${path}`
	if (typeof configured === 'string' && configured.length > 0) {
		return new URL(suffix, configured).toString()
	}
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return new URL(suffix, 'http://localhost:3001/').toString()
	}
	return new URL(suffix, 'https://portal.hyperquote.net/').toString()
}

function currentHostname(): string {
	// Keep SSR and hydration deterministic in local development. The browser
	// hostname is unavailable during SSR, but both sides should still point to
	// the local portal rather than render different href values.
	if (import.meta.env.DEV) return 'localhost'
	if (typeof window === 'undefined') return ''
	return window.location.hostname
}
