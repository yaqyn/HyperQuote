export function registerServiceWorker(scriptPath = '/service-worker.js') {
	if (!('serviceWorker' in navigator) || !window.isSecureContext) return

	const register = () => {
		void navigator.serviceWorker
			.register(scriptPath, { scope: '/' })
			.then((registration) => registration.update())
			.catch(() => undefined)
	}

	if (document.readyState === 'complete') {
		register()
	} else {
		window.addEventListener('load', register, { once: true })
	}
}
