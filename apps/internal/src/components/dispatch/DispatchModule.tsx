import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClientOnly } from '../../lib/client-only'
import { useDispatchStore } from '../../stores/dispatch'
import { getDispatchBoard } from '../../lib/server/dispatch'
import { DispatchMap } from './DispatchMap'
import { DispatchSidePanel } from './DispatchSidePanel'

export function DispatchModule() {
  const [panelOpen, setPanelOpen] = useState(true)
  const selectedQuoteId = useDispatchStore((s) => s.selectedQuoteId)
  const setSelectedQuoteId = useDispatchStore((s) => s.setSelectedQuoteId)

  const { data } = useQuery({
    queryKey: ['dispatch-board'],
    queryFn: () => getDispatchBoard({ data: {} }),
    staleTime: 5_000,
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
        <DispatchMap
          routes={routes}
          selectedQuoteId={selectedQuoteId}
          onSelectRoute={(id) => {
            setSelectedQuoteId(id)
            if (!panelOpen) setPanelOpen(true)
          }}
        />
      </ClientOnly>

      {/* Side panel overlay */}
      <DispatchSidePanel
        isOpen={panelOpen}
        onToggle={() => setPanelOpen((o) => !o)}
      />
    </div>
  )
}
