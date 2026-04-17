/// <reference lib="webworker" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import {
	CacheFirst,
	NetworkFirst,
	StaleWhileRevalidate,
} from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

// Precache app shell (injected by workbox-build)
precacheAndRoute(self.__WB_MANIFEST)

// Navigation requests: NetworkFirst with 3s timeout fallback to cache
// Prevents stale SSR HTML from being served when online (Pitfall 5)
registerRoute(
	new NavigationRoute(
		new NetworkFirst({
			cacheName: 'navigations',
			networkTimeoutSeconds: 3,
			plugins: [new CacheableResponsePlugin({ statuses: [200] })],
		}),
	),
)

// EXCLUDE /_server routes — TanStack Start server functions use POST to /_server
// These should never be cached by the service worker (Open Question 3)
registerRoute(
	({ url }) => url.pathname.startsWith('/_server'),
	new NetworkFirst({
		cacheName: 'server-fns',
		networkTimeoutSeconds: 5,
		plugins: [new CacheableResponsePlugin({ statuses: [200] })],
	}),
)

// API responses: StaleWhileRevalidate with 30min TTL for GET endpoints
registerRoute(
	({ url, request }) =>
		url.pathname.startsWith('/api/') && request.method === 'GET',
	new StaleWhileRevalidate({
		cacheName: 'api-cache',
		plugins: [
			new CacheableResponsePlugin({ statuses: [200] }),
			new ExpirationPlugin({ maxAgeSeconds: 30 * 60 }),
		],
	}),
)

// Fonts: CacheFirst with 1-year TTL, max 10 entries
registerRoute(
	({ request }) => request.destination === 'font',
	new CacheFirst({
		cacheName: 'fonts',
		plugins: [
			new CacheableResponsePlugin({ statuses: [0, 200] }),
			new ExpirationPlugin({
				maxEntries: 10,
				maxAgeSeconds: 365 * 24 * 60 * 60,
			}),
		],
	}),
)

// Images: CacheFirst with 7-day TTL
registerRoute(
	({ request }) => request.destination === 'image',
	new CacheFirst({
		cacheName: 'images',
		plugins: [
			new CacheableResponsePlugin({ statuses: [0, 200] }),
			new ExpirationPlugin({
				maxEntries: 60,
				maxAgeSeconds: 7 * 24 * 60 * 60,
			}),
		],
	}),
)

// Skip waiting + claim clients on install for immediate activation
self.addEventListener('install', () => {
	self.skipWaiting()
})

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim())
})
