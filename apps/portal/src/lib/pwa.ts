export function registerPortalServiceWorker() {
	if (!('serviceWorker' in navigator) || !window.isSecureContext) return

	const register = () => {
		void navigator.serviceWorker
			.register('/sw.js', { scope: '/' })
			.then((registration) => registration.update())
			.catch(() => undefined)
	}

	if (document.readyState === 'complete') {
		register()
	} else {
		window.addEventListener('load', register, { once: true })
	}
}
