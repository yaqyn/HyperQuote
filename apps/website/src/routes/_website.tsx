import { Outlet, createFileRoute } from '@tanstack/react-router'
import { WebsiteHeader } from '../components/layout/WebsiteHeader'
import { WebsiteFooter } from '../components/layout/WebsiteFooter'

export const Route = createFileRoute('/_website')({
	component: WebsiteLayout,
})

function WebsiteLayout() {
	return (
		<>
			<WebsiteHeader />
			<main id="main">
				<Outlet />
			</main>
			<WebsiteFooter />
		</>
	)
}
