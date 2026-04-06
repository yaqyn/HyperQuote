import { createRouter } from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { Route as loginRoute } from './routes/login'
import { Route as homeRoute } from './routes/home'
import { Route as shiftStartRoute } from './routes/shift-start'
import { Route as routeOverviewRoute } from './routes/route-overview'
import { Route as stopDetailRoute } from './routes/stop-detail'

const routeTree = rootRoute.addChildren([
  loginRoute,
  homeRoute,
  shiftStartRoute,
  routeOverviewRoute,
  stopDetailRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
