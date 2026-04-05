import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSalesStore } from '../../stores/sales'
import { SalesTabStrip } from './SalesTabStrip'
import { RFQInboxTable } from './rfq/RFQInboxTable'
import { QuoteBuilderView } from './quote-builder/QuoteBuilderView'

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-black/40 dark:text-white/40">{label}</p>
    </div>
  )
}

export function SalesModule() {
  const { t } = useTranslation('internal')
  const activeTab = useSalesStore((s) => s.activeTab)
  const [negotiatingQuoteId, setNegotiatingQuoteId] = useState<string | null>(null)

  // When a quote is in negotiation, render the negotiation view instead of tab content
  if (negotiatingQuoteId) {
    return (
      <div className="flex flex-col h-full">
        <SalesTabStrip />
        <div className="flex-1 overflow-auto">
          <TabPlaceholder label={`${t('sales.negotiation.actions.reviseQuote')} — ${negotiatingQuoteId}`} />
        </div>
      </div>
    )
  }

  const tabContent: Record<string, React.ReactNode> = {
    home: <TabPlaceholder label={`${t('sales.tabs.home')} — Coming Soon`} />,
    'rfq-inbox': <RFQInboxTable />,
    'quote-builder': <QuoteBuilderView rfqId="rfq-001" />,
    pipeline: <TabPlaceholder label={`${t('sales.tabs.pipeline')} — Coming Soon`} />,
    'customer-360': <TabPlaceholder label={`${t('sales.tabs.customer360')} — Coming Soon`} />,
    contacts: <TabPlaceholder label={`${t('sales.tabs.contacts')} — Coming Soon`} />,
    calendar: <TabPlaceholder label={`${t('sales.tabs.calendar')} — Coming Soon`} />,
    reports: <TabPlaceholder label={`${t('sales.tabs.reports')} — Coming Soon`} />,
  }

  return (
    <div className="flex flex-col h-full">
      <SalesTabStrip />
      <div className="flex-1 overflow-auto">
        {tabContent[activeTab] ?? <TabPlaceholder label="Unknown tab" />}
      </div>
    </div>
  )
}
