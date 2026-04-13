import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
	const router = createRouter({
		routeTree,
		defaultPreload: 'intent',
		scrollRestoration: true,
	})

	// Disable smooth scroll during navigation so scroll-to-top is instant
	if (typeof window !== 'undefined') {
		router.subscribe('onBeforeNavigate', () => {
			document.documentElement.style.scrollBehavior = 'auto'
		})
		router.subscribe('onLoad', () => {
			requestAnimationFrame(() => {
				document.documentElement.style.scrollBehavior = ''
			})
		})
	}

	return router
}
