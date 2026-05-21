function setTheme(theme: 'light' | 'dark') {
	document.documentElement.setAttribute('data-theme', theme)
}

export function initTheme() {
	if (typeof window === 'undefined') return
	const stored = localStorage.getItem('hq-theme')
	if (stored === 'dark' || stored === 'light') {
		setTheme(stored)
	} else {
		setTheme('light')
	}
}

export function persistTheme(theme: 'light' | 'dark') {
	localStorage.setItem('hq-theme', theme)

	// Smooth transition: add transition class, swap theme, remove after animation
	const root = document.documentElement
	root.style.setProperty(
		'--theme-transition',
		'background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
	)
	root.classList.add('theme-transitioning')
	setTheme(theme)
	setTimeout(() => {
		root.classList.remove('theme-transitioning')
		root.style.removeProperty('--theme-transition')
	}, 150)
}
