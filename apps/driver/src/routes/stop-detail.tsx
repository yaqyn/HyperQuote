import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'

// Stub -- full implementation in Task 2
function StopDetailPage() {
  return <div>Stop Detail</div>
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stop-detail/$stopId',
  component: StopDetailPage,
})
