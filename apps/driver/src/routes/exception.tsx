import { createRoute, redirect } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'

function ExceptionScreen() {
  return <div>Exception Reporting</div>
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/exception',
  validateSearch: (search: Record<string, unknown>) => ({
    deliveryId: (search.deliveryId as string) ?? undefined,
    stopId: (search.stopId as string) ?? undefined,
  }),
  component: ExceptionScreen,
})
