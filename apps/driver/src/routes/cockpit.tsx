/**
 * Root in-app route. Auth-gated: bounce to /login if no session.
 */

import { createRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '../components/shell/AppShell'
import { useAuth } from '../stores/auth'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	beforeLoad: () => {
		if (!useAuth.getState().session) throw redirect({ to: '/login' })
	},
	component: AppShell,
})
