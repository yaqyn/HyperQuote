const CACHE_NAME = 'hyperquote-portal-v1'

const APP_ASSETS = [
	'/site.webmanifest',
	'/manifest.json',
	'/favicon.ico',
	'/favicon.svg',
	'/favicon-96x96.png',
	'/apple-touch-icon.png',
	'/icon-192.png',
	'/icon-512.png',
]

const CACHEABLE_PUBLIC_PATHS = new Set(APP_ASSETS)

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(APP_ASSETS))
			.then(() => self.skipWaiting()),
	)
})

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	)
})

self.addEventListener('fetch', (event) => {
	const { request } = event
	if (request.method !== 'GET') return

	const url = new URL(request.url)
	if (url.origin !== self.location.origin) return
	if (url.pathname.startsWith('/api/')) return

	if (isCacheableAsset(request, url)) {
		event.respondWith(cacheFirstAsset(request))
		return
	}

	if (request.mode === 'navigate') {
		event.respondWith(networkOnlyNavigation(request))
	}
})

self.addEventListener('push', (event) => {
	if (!event.data) return

	const data = event.data.json()
	const { body, icon, title, url } = data

	event.waitUntil(
		self.registration.showNotification(title || 'HyperQuote Portal', {
			body: body || '',
			icon: icon || '/icon-192.png',
			badge: '/icon-192.png',
			data: { url: url || '/' },
			dir: 'auto',
		}),
	)
})

self.addEventListener('notificationclick', (event) => {
	event.notification.close()

	const targetUrl = event.notification.data?.url || '/'

	event.waitUntil(
		self.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					if (client.url.includes(targetUrl) && 'focus' in client) {
						return client.focus()
					}
				}
				return self.clients.openWindow(targetUrl)
			}),
	)
})

function isCacheableAsset(request, url) {
	if (CACHEABLE_PUBLIC_PATHS.has(url.pathname)) return true
	if (!url.pathname.startsWith('/assets/')) return false

	return (
		request.destination === 'script' ||
		request.destination === 'style' ||
		request.destination === 'font' ||
		request.destination === 'image'
	)
}

async function networkOnlyNavigation(request) {
	try {
		return await fetch(request)
	} catch {
		return new Response('HyperQuote Portal is offline.', {
			status: 503,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' },
		})
	}
}

async function cacheFirstAsset(request) {
	const cached = await caches.match(request)
	if (cached) return cached

	const response = await fetch(request)
	if (response.ok) {
		const cache = await caches.open(CACHE_NAME)
		await cache.put(request, response.clone())
	}
	return response
}
