import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_portal/market')({
  component: MarketLayout,
})

function MarketLayout() {
  return <Outlet />
}
