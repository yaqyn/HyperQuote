const CACHE_NAME = 'hyperquote-driver-v1'

const APP_SHELL = [
	'/',
	'/site.webmanifest',
	'/favicon.ico',
	'/favicon.svg',
	'/favicon-96x96.png',
	'/apple-touch-icon.png',
	'/icon-192.png',
	'/icon-512.png',
]

const CACHEABLE_PUBLIC_PATHS = new Set(APP_SHELL.filter((path) => path !== '/'))

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(APP_SHELL))
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

	if (request.mode === 'navigate') {
		event.respondWith(networkFirstNavigation(request))
		return
	}

	if (isCacheableAsset(request, url)) {
		event.respondWith(cacheFirstAsset(request))
	}
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

async function networkFirstNavigation(request) {
	const cache = await caches.open(CACHE_NAME)
	try {
		const response = await fetch(request)
		if (response.ok) await cache.put('/', response.clone())
		return response
	} catch {
		const cached = await cache.match('/')
		if (cached) return cached
		return new Response('HyperQuote Driver is offline.', {
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
