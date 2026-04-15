import { Button } from 'react-aria-components'
import { ArrowLeft } from 'lucide-react'
import { useProcurementStore } from '../../stores/procurement'
import { ProcurementTabStrip } from './ProcurementTabStrip'
import { ProcurementShortcuts } from './ProcurementShortcuts'
import { InquiryBuilder } from './inquiry/InquiryBuilder'
import { ResponseTracker } from './inquiry/ResponseTracker'
import { PriceComparisonMatrix } from './comparison/PriceComparisonMatrix'
import { POList } from './po/POList'
import { PODetail } from './po/PODetail'
import { SupplierDirectory } from './supplier/SupplierDirectory'
import { SupplierScorecard } from './supplier/SupplierScorecard'
import { InventoryView } from './inventory/InventoryView'

export function ProcurementModule() {
  const activeTab = useProcurementStore((s) => s.activeTab)
  const selectedInquiryId = useProcurementStore((s) => s.selectedInquiryId)
  const selectedSupplierId = useProcurementStore((s) => s.selectedSupplierId)
  const setSelectedSupplierId = useProcurementStore((s) => s.setSelectedSupplierId)
  const selectedPOId = useProcurementStore((s) => s.selectedPOId)
  const setSelectedPOId = useProcurementStore((s) => s.setSelectedPOId)
  const sourcingView = useProcurementStore((s) => s.sourcingView)
  const setSourcingView = useProcurementStore((s) => s.setSourcingView)

  // If an inquiry is selected, show the response tracker
  if (selectedInquiryId && activeTab === 'sourcing') {
    return (
      <div className="flex flex-col h-full">
        <ProcurementShortcuts />
        <div className="shrink-0 pt-1 pb-2">
          <ProcurementTabStrip />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
          <ResponseTracker inquiryId={selectedInquiryId} />
        </div>
      </div>
    )
  }

  // PO tab: detail drill-down
  if (selectedPOId && activeTab === 'po-management') {
    return (
      <div className="flex flex-col h-full">
        <ProcurementShortcuts />
        <div className="shrink-0 pt-1 pb-2">
          <ProcurementTabStrip />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
          <PODetail poId={selectedPOId} onBack={() => setSelectedPOId(null)} />
        </div>
      </div>
    )
  }

  // Suppliers tab: scorecard detail drill-down
  if (selectedSupplierId && activeTab === 'suppliers') {
    return (
      <div className="flex flex-col h-full">
        <ProcurementShortcuts />
        <div className="shrink-0 pt-1 pb-2">
          <ProcurementTabStrip />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
          <div className="px-4 pt-3">
            <Button
              onPress={() => setSelectedSupplierId(null)}
              className="flex items-center gap-1.5 text-sm text-[var(--color-text-subtle)] cursor-pointer hover:text-[var(--color-text)] transition-colors outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40 rounded-md px-1 py-0.5"
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
              Back to list
            </Button>
          </div>
          <SupplierScorecard supplierId={selectedSupplierId} onBack={() => setSelectedSupplierId(null)} />
        </div>
      </div>
    )
  }

  // Sourcing tab: inquiry list by default, comparison matrix with back arrow
  const sourcingContent = sourcingView === 'comparison' ? (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center gap-2 px-5 py-2 border-b border-black/[0.04] dark:border-white/[0.04]">
        <Button
          onPress={() => setSourcingView('inquiry')}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer outline-none transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <PriceComparisonMatrix items={[]} />
      </div>
    </div>
  ) : (
    <InquiryBuilder />
  )

  const tabContent: Record<string, React.ReactNode> = {
    inventory: <InventoryView />,
    sourcing: sourcingContent,
    'po-management': <POList />,
    suppliers: <SupplierDirectory />,
  }

  return (
    <div className="flex flex-col h-full">
      <ProcurementShortcuts />

      <div className="shrink-0 pt-1 pb-2">
        <ProcurementTabStrip />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-module-content>
        {tabContent[activeTab] ?? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--color-text-subtle)]">Coming soon</p>
          </div>
        )}
      </div>
    </div>
  )
}
