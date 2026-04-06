import { createRoute, redirect } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useAuthStore } from '@/stores/auth'

function EarningsScreen() {
  return <div>Earnings</div>
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/earnings',
  beforeLoad: () => {
    const isExternalDriver = useAuthStore.getState().isExternalDriver
    if (!isExternalDriver) {
      throw redirect({ to: '/' })
    }
  },
  component: EarningsScreen,
})
