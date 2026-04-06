import { createRoute, redirect } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useAuthStore } from '@/stores/auth'

function JobDetailScreen() {
  return <div>Job Detail</div>
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/job-detail/$jobId',
  beforeLoad: () => {
    const isExternalDriver = useAuthStore.getState().isExternalDriver
    if (!isExternalDriver) {
      throw redirect({ to: '/' })
    }
  },
  component: JobDetailScreen,
})
