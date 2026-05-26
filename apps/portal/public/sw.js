const CACHE_NAME = 'hyperquote-portal-v2'

const APP_ASSETS = [
	'/site.webmanifest',
	'/manifest.json',
	'/browserconfig.xml',
	'/favicon.ico',
	'/favicon.svg',
	'/favicon-96x96.png',
	'/apple-touch-icon.png',
	'/apple-touch-icon-152x152.png',
	'/apple-touch-icon-167x167.png',
	'/apple-touch-icon-180x180.png',
	'/icon-192.png',
	'/icon-512.png',
	'/mstile-150x150.png',
	'/pwa/icon-192.png',
	'/pwa/icon-512.png',
	'/pwa/maskable-192.png',
	'/pwa/maskable-512.png',
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
		self.registration.showNotification(title || 'Lyon', {
			body: body || '',
			icon: icon || '/pwa/icon-192.png',
			badge: '/pwa/icon-192.png',
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
			return new Response('Lyon is offline.', {
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
