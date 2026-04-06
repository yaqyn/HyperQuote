import { createRoute, redirect } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useAuthStore } from '@/stores/auth'

function JobOffersScreen() {
  return <div>Job Offers</div>
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/job-offers',
  beforeLoad: () => {
    const isExternalDriver = useAuthStore.getState().isExternalDriver
    if (!isExternalDriver) {
      throw redirect({ to: '/' })
    }
  },
  component: JobOffersScreen,
})
