export function getPortalHref(hostname = currentHostname()): string {
	const configured = import.meta.env.VITE_PORTAL_URL
	if (typeof configured === 'string' && configured.length > 0) {
		return configured
	}
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return 'http://localhost:3001/'
	}
	return 'https://portal.hyperquote.net/'
}

function currentHostname(): string {
	if (typeof window === 'undefined') return ''
	return window.location.hostname
}
