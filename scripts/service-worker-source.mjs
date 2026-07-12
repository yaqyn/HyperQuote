export const SERVICE_WORKER_APPS = [
	{
		key: 'website',
		cacheName: 'hyperquote-website-v5',
		file: 'service-worker.js',
		offlineText: 'HyperQuote is offline.',
	},
	{
		key: 'portal',
		cacheName: 'hyperquote-portal-v5',
		file: 'sw.js',
		offlineText: 'Lyon is offline.',
		pushNotifications: true,
	},
	{
		key: 'internal',
		cacheName: 'hyperquote-internal-v6',
		file: 'service-worker.js',
		offlineText: 'Base is offline.',
	},
	{
		key: 'driver',
		cacheName: 'hyperquote-driver-v5',
		file: 'service-worker.js',
		offlineText: 'Drive is offline.',
	},
]

const SHARED_PRECACHE_PATHS = [
	'/browserconfig.xml',
	'/site.webmanifest',
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

function precachePathsFor({ key }) {
	if (key !== 'portal') return SHARED_PRECACHE_PATHS
	return [
		'/site.webmanifest',
		'/manifest.json',
		...SHARED_PRECACHE_PATHS.filter((path) => path !== '/site.webmanifest'),
	]
}

function jsArrayLiteral(values) {
	return values.map((value) => `\t'${value}',`).join('\n')
}

function portalPushHandlers() {
	return `
self.addEventListener('push', (event) => {
\tif (!event.data) return

\tlet rawData
\ttry {
\t\trawData = event.data.json()
\t} catch {
\t\treturn
\t}
\tconst data =
\t\trawData && typeof rawData === 'object' && !Array.isArray(rawData)
\t\t\t? rawData
\t\t\t: {}
\tconst body = boundedNotificationText(data.body, 500)
\tconst title = boundedNotificationText(data.title, 120) || 'Lyon'
\tconst icon = sameOriginPath(data.icon, '/pwa/icon-192.png')
\tconst url = sameOriginPath(data.url, '/')

\tevent.waitUntil(
\t\tself.registration.showNotification(title, {
\t\t\tbody,
\t\t\ticon,
\t\t\tbadge: '/pwa/icon-192.png',
\t\t\tdata: { url },
\t\t\tdir: 'auto',
\t\t}),
\t)
})

self.addEventListener('notificationclick', (event) => {
\tevent.notification.close()

\tconst targetPath = sameOriginPath(event.notification.data?.url, '/')

\tevent.waitUntil(
\t\tself.clients
\t\t\t.matchAll({ type: 'window', includeUncontrolled: true })
\t\t\t.then((clientList) => {
\t\t\t\tfor (const client of clientList) {
\t\t\t\t\tconst clientUrl = new URL(client.url)
\t\t\t\t\tconst clientPath =
\t\t\t\t\t\tclientUrl.pathname + clientUrl.search + clientUrl.hash
\t\t\t\t\tif (
\t\t\t\t\t\tclientUrl.origin === self.location.origin &&
\t\t\t\t\t\tclientPath === targetPath &&
\t\t\t\t\t\t'focus' in client
\t\t\t\t\t) {
\t\t\t\t\t\treturn client.focus()
\t\t\t\t\t}
\t\t\t\t}
\t\t\t\treturn self.clients.openWindow(targetPath)
\t\t\t}),
\t)
})

function boundedNotificationText(value, maxLength) {
\treturn typeof value === 'string' ? value.slice(0, maxLength) : ''
}

function sameOriginPath(value, fallback) {
\tif (typeof value !== 'string') return fallback
\ttry {
\t\tconst url = new URL(value, self.location.origin)
\t\tif (url.origin !== self.location.origin) return fallback
\t\treturn url.pathname + url.search + url.hash
\t} catch {
\t\treturn fallback
\t}
}
`
}

export function serviceWorkerSourceForApp(app) {
	const precachePaths = precachePathsFor(app)
	const pushHandlers = app.pushNotifications ? portalPushHandlers() : ''

	return `const CACHE_NAME = '${app.cacheName}'

const PRECACHE_PATHS = [
${jsArrayLiteral(precachePaths)}
]

const CACHEABLE_PUBLIC_PATHS = new Set(PRECACHE_PATHS)

self.addEventListener('install', (event) => {
\tevent.waitUntil(
\t\tcaches
\t\t\t.open(CACHE_NAME)
\t\t\t.then((cache) => cache.addAll(PRECACHE_PATHS))
\t\t\t.then(() => self.skipWaiting()),
\t)
})

self.addEventListener('activate', (event) => {
\tevent.waitUntil(
\t\tcaches
\t\t\t.keys()
\t\t\t.then((keys) =>
\t\t\t\tPromise.all(
\t\t\t\t\tkeys
\t\t\t\t\t\t.filter((key) => key !== CACHE_NAME)
\t\t\t\t\t\t.map((key) => caches.delete(key)),
\t\t\t\t),
\t\t\t)
\t\t\t.then(() => self.clients.claim()),
\t)
})

self.addEventListener('fetch', (event) => {
\tconst { request } = event
\tif (request.method !== 'GET') return

\tconst url = new URL(request.url)
\tif (url.origin !== self.location.origin) return
\tif (url.pathname.startsWith('/api/')) return

\tif (request.mode === 'navigate') {
\t\tevent.respondWith(networkOnlyNavigation(request))
\t\treturn
\t}

\tif (isCacheableAsset(request, url)) {
\t\tevent.respondWith(cacheFirstAsset(request))
\t}
})
${pushHandlers}
function isCacheableAsset(request, url) {
\tif (CACHEABLE_PUBLIC_PATHS.has(url.pathname)) return true
\tif (!url.pathname.startsWith('/assets/')) return false

\treturn (
\t\trequest.destination === 'script' ||
\t\trequest.destination === 'style' ||
\t\trequest.destination === 'font' ||
\t\trequest.destination === 'image'
\t)
}

async function networkOnlyNavigation(request) {
\ttry {
\t\treturn await fetch(request)
\t} catch {
\t\treturn new Response('${app.offlineText}', {
\t\t\tstatus: 503,
\t\t\theaders: { 'Content-Type': 'text/plain; charset=utf-8' },
\t\t})
\t}
}

async function cacheFirstAsset(request) {
\tconst cache = await caches.open(CACHE_NAME)
\tconst cached = await cache.match(request)
\tif (cached) return cached

\tconst response = await fetch(request)
\tif (response.ok) {
\t\tawait cache.put(request, response.clone())
\t}
\treturn response
}
`
}
