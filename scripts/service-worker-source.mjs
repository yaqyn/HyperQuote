export const SERVICE_WORKER_APPS = [
	{
		key: 'website',
		cacheName: 'hyperquote-website-v4',
		file: 'service-worker.js',
		offlineText: 'HyperQuote is offline.',
	},
	{
		key: 'portal',
		cacheName: 'hyperquote-portal-v4',
		file: 'sw.js',
		offlineText: 'Lyon is offline.',
		pushNotifications: true,
	},
	{
		key: 'internal',
		cacheName: 'hyperquote-internal-v5',
		file: 'service-worker.js',
		offlineText: 'Base is offline.',
	},
	{
		key: 'driver',
		cacheName: 'hyperquote-driver-v4',
		file: 'service-worker.js',
		offlineText: 'Drive is offline.',
	},
]

const SHARED_APP_SHELL = [
	'/',
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

function appShellFor({ key }) {
	if (key !== 'portal') return SHARED_APP_SHELL
	return [
		'/',
		'/site.webmanifest',
		'/manifest.json',
		...SHARED_APP_SHELL.filter(
			(path) => path !== '/' && path !== '/site.webmanifest',
		),
	]
}

function jsArrayLiteral(values) {
	return values.map((value) => `\t'${value}',`).join('\n')
}

function portalPushHandlers() {
	return `
self.addEventListener('push', (event) => {
\tif (!event.data) return

\tconst data = event.data.json()
\tconst { body, icon, title, url } = data

\tevent.waitUntil(
\t\tself.registration.showNotification(title || 'Lyon', {
\t\t\tbody: body || '',
\t\t\ticon: icon || '/pwa/icon-192.png',
\t\t\tbadge: '/pwa/icon-192.png',
\t\t\tdata: { url: url || '/' },
\t\t\tdir: 'auto',
\t\t}),
\t)
})

self.addEventListener('notificationclick', (event) => {
\tevent.notification.close()

\tconst targetUrl = event.notification.data?.url || '/'

\tevent.waitUntil(
\t\tself.clients
\t\t\t.matchAll({ type: 'window', includeUncontrolled: true })
\t\t\t.then((clientList) => {
\t\t\t\tfor (const client of clientList) {
\t\t\t\t\tif (client.url.includes(targetUrl) && 'focus' in client) {
\t\t\t\t\t\treturn client.focus()
\t\t\t\t\t}
\t\t\t\t}
\t\t\t\treturn self.clients.openWindow(targetUrl)
\t\t\t}),
\t)
})
`
}

export function serviceWorkerSourceForApp(app) {
	const appShell = appShellFor(app)
	const pushHandlers = app.pushNotifications ? portalPushHandlers() : ''

	return `const CACHE_NAME = '${app.cacheName}'

const APP_SHELL = [
${jsArrayLiteral(appShell)}
]

const CACHEABLE_PUBLIC_PATHS = new Set(APP_SHELL.filter((path) => path !== '/'))

self.addEventListener('install', (event) => {
\tevent.waitUntil(
\t\tcaches
\t\t\t.open(CACHE_NAME)
\t\t\t.then((cache) => cache.addAll(APP_SHELL))
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
\t\tevent.respondWith(networkFirstNavigation(request))
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

async function networkFirstNavigation(request) {
\tconst cache = await caches.open(CACHE_NAME)
\ttry {
\t\tconst response = await fetch(request)
\t\tif (response.ok) await cache.put('/', response.clone())
\t\treturn response
\t} catch {
\t\tconst cached = await cache.match('/')
\t\tif (cached) return cached
\t\treturn new Response('${app.offlineText}', {
\t\t\tstatus: 503,
\t\t\theaders: { 'Content-Type': 'text/plain; charset=utf-8' },
\t\t})
\t}
}

async function cacheFirstAsset(request) {
\tconst cached = await caches.match(request)
\tif (cached) return cached

\tconst response = await fetch(request)
\tif (response.ok) {
\t\tconst cache = await caches.open(CACHE_NAME)
\t\tawait cache.put(request, response.clone())
\t}
\treturn response
}
`
}
