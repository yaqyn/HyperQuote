export function registerWebsiteServiceWorker() {
	if (!('serviceWorker' in navigator) || !window.isSecureContext) return

	const register = () => {
		void navigator.serviceWorker
			.register('/service-worker.js', { scope: '/' })
			.then((registration) => registration.update())
			.catch(() => undefined)
	}

	if (document.readyState === 'complete') {
		register()
	} else {
		window.addEventListener('load', register, { once: true })
	}
}
