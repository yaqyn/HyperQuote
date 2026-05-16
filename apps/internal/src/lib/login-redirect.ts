export function getSafeRedirectPath(
	redirect: string | undefined,
	currentOrigin?: string,
): string {
	if (!redirect) return '/'

	const value = redirect.trim()
	if (!value || value.startsWith('//')) return '/'

	if (value.startsWith('/')) {
		return toPathOnly(value)
	}

	if (!currentOrigin) return '/'

	try {
		const url = new URL(value)
		if (url.origin !== currentOrigin) return '/'
		return toPathOnly(`${url.pathname}${url.search}${url.hash}`)
	} catch {
		return '/'
	}
}

function toPathOnly(value: string): string {
	try {
		const url = new URL(value, 'https://internal.hyperquote.local')
		return `${url.pathname}${url.search}${url.hash}` || '/'
	} catch {
		return '/'
	}
}
