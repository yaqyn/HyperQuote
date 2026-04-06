import { useProcurementStore } from '../../stores/procurement'
import { ProcurementTabStrip } from './ProcurementTabStrip'
import { ProcurementShortcuts } from './ProcurementShortcuts'
import { ProcurementHomeView } from './home/ProcurementHomeView'
import { InquiryBuilder } from './inquiry/InquiryBuilder'
import { ResponseTracker } from './inquiry/ResponseTracker'
import { PriceComparisonMatrix } from './comparison/PriceComparisonMatrix'
import { POList } from './po/POList'
import { SupplierDirectory } from './supplier/SupplierDirectory'
import { SupplierScorecard } from './supplier/SupplierScorecard'

export function ProcurementModule() {
  const activeTab = useProcurementStore((s) => s.activeTab)
  const selectedInquiryId = useProcurementStore((s) => s.selectedInquiryId)

  // If an inquiry is selected, show the response tracker
  if (selectedInquiryId && activeTab === 'inquiries') {
    return (
      <div className="flex flex-col h-full">
        <ProcurementShortcuts />
        <ProcurementTabStrip />
        <div className="flex-1 overflow-auto">
          <ResponseTracker inquiryId={selectedInquiryId} />
        </div>
      </div>
    )
  }

  const tabContent: Record<string, React.ReactNode> = {
    home: <ProcurementHomeView />,
    inquiries: <InquiryBuilder />,
    comparison: <PriceComparisonMatrix />,
    'po-management': <POList />,
    directory: <SupplierDirectory />,
    scorecard: <SupplierScorecard />,
  }

  return (
    <div className="flex flex-col h-full">
      <ProcurementShortcuts />
      <ProcurementTabStrip />
      <div className="flex-1 overflow-auto">
        {tabContent[activeTab] ?? null}
      </div>
    </div>
  )
}
