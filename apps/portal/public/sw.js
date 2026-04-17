/* eslint-disable no-restricted-globals */

import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import {
	CacheFirst,
	NetworkFirst,
	StaleWhileRevalidate,
} from 'workbox-strategies'

// Precache app shell (injected by workbox-build)
precacheAndRoute(self.__WB_MANIFEST || [])

// Cleanup old caches from previous versions
cleanupOutdatedCaches()

// Runtime cache: API responses (stale-while-revalidate, 5min max age)
registerRoute(
	({ url }) => url.pathname.startsWith('/api/'),
	new StaleWhileRevalidate({
		cacheName: 'api-cache',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 100,
				maxAgeSeconds: 300, // 5 minutes
			}),
		],
	}),
)

// Static assets: CacheFirst (long-lived)
registerRoute(
	({ request }) =>
		request.destination === 'style' ||
		request.destination === 'script' ||
		request.destination === 'font' ||
		request.destination === 'image',
	new CacheFirst({
		cacheName: 'static-assets',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 200,
				maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
			}),
		],
	}),
)

// Navigation: NetworkFirst with 3s timeout fallback to cache
const navigationHandler = new NetworkFirst({
	cacheName: 'navigation',
	networkTimeoutSeconds: 3,
})
registerRoute(new NavigationRoute(navigationHandler))

// Push notification handler
self.addEventListener('push', (event) => {
	if (!event.data) return

	const data = event.data.json()
	const { title, body, icon, url } = data

	event.waitUntil(
		self.registration.showNotification(title || 'HyperQuote', {
			body: body || '',
			icon: icon || '/icons/icon-192.png',
			badge: '/icons/icon-192.png',
			data: { url: url || '/' },
			dir: 'auto',
		}),
	)
})

// Notification click: open portal URL
self.addEventListener('notificationclick', (event) => {
	event.notification.close()

	const targetUrl = event.notification.data?.url || '/'

	event.waitUntil(
		self.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then((clientList) => {
				// Focus existing window if available
				for (const client of clientList) {
					if (client.url.includes(targetUrl) && 'focus' in client) {
						return client.focus()
					}
				}
				// Otherwise open new window
				return self.clients.openWindow(targetUrl)
			}),
	)
})

// Skip waiting and claim clients immediately on activation
self.addEventListener('install', () => {
	self.skipWaiting()
})

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim())
})
