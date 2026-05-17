import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
} from '@tanstack/react-router'
import { DriverApp, DriverRouteError } from './app'

const rootRoute = createRootRoute({
	component: Outlet,
	errorComponent: DriverRouteError,
})

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: DriverApp,
})

const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}
