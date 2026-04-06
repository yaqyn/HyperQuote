import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'

function EndOfDayScreen() {
  return <div>End of Day</div>
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/end-of-day',
  component: EndOfDayScreen,
})
