import { createFileRoute } from '@tanstack/react-router'
import { ChatView } from '../../components/chat/ChatView'

export const Route = createFileRoute('/_portal/')({
	component: PortalHome,
	head: () => ({
		meta: [{ name: 'theme-color', content: '#060606' }],
		links: [{ rel: 'manifest', href: '/manifest.json' }],
	}),
})

function PortalHome() {
	// Merged context from `__root__` + `_portal` — `locale` and `auth` both live here.
	const ctx = Route.useRouteContext() as {
		auth?: { user?: { user_metadata?: { name?: string } } } | null
		locale?: 'ar' | 'en'
	}
	const userName = ctx.auth?.user?.user_metadata?.name ?? ''
	const currentLocale: 'ar' | 'en' =
		ctx.locale === 'ar' || ctx.locale === 'en' ? ctx.locale : 'en'

	return (
		<div className="flex-1 flex flex-col h-full min-h-0">
			<ChatView userName={userName} locale={currentLocale} />
		</div>
	)
}
