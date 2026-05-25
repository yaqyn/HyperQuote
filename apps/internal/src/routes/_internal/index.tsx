import { createFileRoute } from '@tanstack/react-router'
import { InternalCanvas } from '../../components/shell/InternalCanvas'
import { internalHead } from '../../lib/page-meta'

export const Route = createFileRoute('/_internal/')({
	head: () =>
		internalHead({
			title: 'Operations Canvas — HyperQuote Internal Ops',
			description:
				'Private HyperQuote operations canvas with live attention feed, module launcher, notifications, and team status.',
			path: '/',
		}),
	component: InternalIndex,
})

function InternalIndex() {
	const { auth } = Route.useRouteContext()

	return (
		<div className="h-full">
			<InternalCanvas auth={auth} />
		</div>
	)
}
