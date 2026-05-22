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
	if (typeof window === 'undefined') return ''
	return window.location.hostname
}
