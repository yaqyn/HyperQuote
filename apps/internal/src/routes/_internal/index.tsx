import { createFileRoute } from '@tanstack/react-router'
import { InternalCanvas } from '../../components/shell/InternalCanvas'
import { MobileModuleGrid } from '../../components/shell/MobileModuleGrid'

export const Route = createFileRoute('/_internal/')({
	component: InternalIndex,
})

function InternalIndex() {
	const { auth } = Route.useRouteContext()

	return (
		<div className="h-full">
			{/* Desktop: spatial canvas with greeting */}
			<div className="max-md:hidden h-full">
				<InternalCanvas auth={auth} />
			</div>
			{/* Mobile: 2-column card grid */}
			<div className="md:hidden">
				<MobileModuleGrid auth={auth} />
			</div>
		</div>
	)
}
