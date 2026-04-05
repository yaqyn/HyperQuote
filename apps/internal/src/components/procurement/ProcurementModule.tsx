import { useTranslation } from 'react-i18next'
import { useProcurementStore } from '../../stores/procurement'
import { ProcurementTabStrip } from './ProcurementTabStrip'
import { ProcurementShortcuts } from './ProcurementShortcuts'
import { ProcurementHomeView } from './home/ProcurementHomeView'
import { InquiryBuilder } from './inquiry/InquiryBuilder'
import { ResponseTracker } from './inquiry/ResponseTracker'

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-black/40 dark:text-white/40">{label}</p>
    </div>
  )
}

export function ProcurementModule() {
  const { t } = useTranslation('internal')
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
    comparison: <TabPlaceholder label={t('procurement.tabs.comparison')} />,
    'po-management': <TabPlaceholder label={t('procurement.tabs.poManagement')} />,
    directory: <TabPlaceholder label={t('procurement.tabs.directory')} />,
    scorecard: <TabPlaceholder label={t('procurement.tabs.scorecard')} />,
  }

  return (
    <div className="flex flex-col h-full">
      <ProcurementShortcuts />
      <ProcurementTabStrip />
      <div className="flex-1 overflow-auto">
        {tabContent[activeTab] ?? <TabPlaceholder label="Unknown tab" />}
      </div>
    </div>
  )
}
