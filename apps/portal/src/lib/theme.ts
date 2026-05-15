export type PortalTheme = 'dark' | 'light'

const PORTAL_THEME_STORAGE_KEY = 'hq-portal-theme'
const PORTAL_THEME_COOKIE = 'hq-portal-theme'
const PORTAL_THEME_COOKIE_MAX_AGE = 31_536_000

export function isPortalTheme(value: unknown): value is PortalTheme {
	return value === 'dark' || value === 'light'
}

export function portalThemeColor(theme: PortalTheme): string {
	return theme === 'dark' ? '#060606' : '#ffffff'
}

function readThemeFromCookie(cookieHeader: string): PortalTheme | undefined {
	const match = cookieHeader.match(
		/(?:^|;\s*)hq-portal-theme=(dark|light)(?:;|$)/,
	)
	const theme = match?.[1]
	return isPortalTheme(theme) ? theme : undefined
}

export function readStoredPortalTheme(): PortalTheme | undefined {
	if (typeof localStorage !== 'undefined') {
		const stored = localStorage.getItem(PORTAL_THEME_STORAGE_KEY)
		if (isPortalTheme(stored)) return stored
	}

	if (typeof document !== 'undefined') {
		return readThemeFromCookie(document.cookie)
	}

	return undefined
}

export function detectPortalTheme(request?: Request): PortalTheme {
	if (request) {
		const cookieTheme = readThemeFromCookie(request.headers.get('cookie') ?? '')
		if (cookieTheme) return cookieTheme
	}

	return readStoredPortalTheme() ?? 'light'
}

export function getCurrentPortalTheme(
	fallback: PortalTheme = 'light',
): PortalTheme {
	if (typeof document !== 'undefined') {
		const attrTheme = document.documentElement.getAttribute('data-theme')
		if (isPortalTheme(attrTheme)) return attrTheme
	}

	return readStoredPortalTheme() ?? fallback
}

export function applyPortalTheme(theme: PortalTheme) {
	if (typeof document === 'undefined') return

	document.documentElement.setAttribute('data-theme', theme)
	document
		.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
		.forEach((meta) => {
			meta.content = portalThemeColor(theme)
		})
}

export function persistPortalTheme(theme: PortalTheme) {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(PORTAL_THEME_STORAGE_KEY, theme)
	}

	if (typeof document !== 'undefined') {
		const doc = document as unknown as Record<'cookie', string>
		doc.cookie = `${PORTAL_THEME_COOKIE}=${theme};path=/;max-age=${PORTAL_THEME_COOKIE_MAX_AGE};samesite=lax`
	}
}

export function setPortalTheme(theme: PortalTheme) {
	persistPortalTheme(theme)
	applyPortalTheme(theme)
}
