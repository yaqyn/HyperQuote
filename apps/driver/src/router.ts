import { createRouter } from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { Route as cockpitRoute } from './routes/cockpit'
import { Route as loginRoute } from './routes/login'

const routeTree = rootRoute.addChildren([cockpitRoute, loginRoute] as const)

export const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}
