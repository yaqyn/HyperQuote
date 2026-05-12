import { createFileRoute } from '@tanstack/react-router'
import { InternalCanvas } from '../../components/shell/InternalCanvas'

export const Route = createFileRoute('/_internal/')({
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
