import { createFileRoute } from '@tanstack/react-router'
import { ChatView } from '../../components/chat/ChatView'
import { portalHead } from '../../lib/page-meta'

export const Route = createFileRoute('/_portal/')({
	component: PortalHome,
	head: () =>
		portalHead({
			title: 'Lyon Workspace — HyperQuote Portal',
			description:
				'Private HyperQuote portal workspace for customer requests, account help, order answers, and quote drafting with Lyon.',
			path: '/',
		}),
})

function PortalHome() {
	// Merged context from `__root__` + `_portal` — `locale` and `auth` both live here.
	const ctx = Route.useRouteContext() as {
		locale?: 'ar' | 'en'
	}
	const currentLocale: 'ar' | 'en' =
		ctx.locale === 'ar' || ctx.locale === 'en' ? ctx.locale : 'en'

	return (
		<div className="flex-1 flex flex-col h-full min-h-0">
			<ChatView locale={currentLocale} />
		</div>
	)
}
