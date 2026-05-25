import { createFileRoute, Outlet } from '@tanstack/react-router'
import { portalHead } from '../../lib/page-meta'

export const Route = createFileRoute('/_portal/market')({
	head: () =>
		portalHead({
			title: 'Market — HyperQuote Portal',
			description:
				'Private HyperQuote material catalog for adding products to customer quote drafts.',
			path: '/market',
		}),
	component: MarketLayout,
})

function MarketLayout() {
	return <Outlet />
}
