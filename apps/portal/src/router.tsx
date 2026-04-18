import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
	const router = createRouter({
		routeTree,
		defaultPreload: 'intent',
		scrollRestoration: true,
		// Browser snapshots the old DOM on navigation and crossfades to the new
		// one via the View Transitions API. Eliminates the "split-second of new
		// content before animation starts" issue that AnimatePresence had.
		defaultViewTransition: true,
	})
	return router
}
