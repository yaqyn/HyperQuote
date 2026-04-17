/** Portal is dark-only. These functions exist for API compatibility. */

export function getTheme(): 'dark' {
	return 'dark'
}

export function setTheme(_theme: 'light' | 'dark') {
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', 'dark')
	}
}

export function toggleTheme() {
	// No-op — portal is always dark
}

export function initTheme() {
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', 'dark')
	}
}

export function persistTheme(_theme: 'light' | 'dark') {
	// No-op — portal is always dark
}
