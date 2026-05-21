import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useState } from 'react'
import { ClientOnly } from '../../lib/client-only'
import {
	INTERNAL_LIVE_REFETCH_MS,
	INTERNAL_LIVE_STALE_MS,
} from '../../lib/internal-live-query'
import { getDispatchBoard } from '../../lib/server/dispatch'
import { useDispatchStore } from '../../stores/dispatch'
import { DispatchSidePanel } from './DispatchSidePanel'

const DispatchMap = lazy(() =>
	import('./DispatchMap').then((module) => ({ default: module.DispatchMap })),
)

export function DispatchModule() {
	const [panelOpen, setPanelOpen] = useState(true)
	const selectedQuoteId = useDispatchStore((s) => s.selectedQuoteId)
	const setSelectedQuoteId = useDispatchStore((s) => s.setSelectedQuoteId)

	const { data } = useQuery({
		queryKey: ['dispatch-board'],
		queryFn: () => getDispatchBoard({ data: {} }),
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})
	const routes = data?.routes ?? []

	return (
		<div className="relative h-full min-h-full w-full overflow-hidden">
			{/* Full-bleed map */}
			<ClientOnly
				fallback={
					<div className="flex h-full items-center justify-center bg-[var(--color-surface)]">
						<div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
					</div>
				}
			>
				<Suspense
					fallback={
						<div className="flex h-full items-center justify-center bg-[var(--color-surface)]">
							<div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
						</div>
					}
				>
					<DispatchMap
						routes={routes}
						selectedQuoteId={selectedQuoteId}
						onSelectRoute={(id) => {
							setSelectedQuoteId(id)
							if (!panelOpen) setPanelOpen(true)
						}}
					/>
				</Suspense>
			</ClientOnly>

			{/* Side panel overlay */}
			<DispatchSidePanel
				isOpen={panelOpen}
				onToggle={() => setPanelOpen((o) => !o)}
			/>
		</div>
	)
}
