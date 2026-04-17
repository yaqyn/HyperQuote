/**
 * Register the service worker.
 * Call once in the root component's useEffect (client-side only).
 */
export function registerServiceWorker() {
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('/sw.js').catch((err) => {
				console.warn('SW registration failed:', err)
			})
		})
	}
}
