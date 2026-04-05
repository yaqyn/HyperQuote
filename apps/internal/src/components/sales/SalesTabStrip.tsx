import { Tab, TabList, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useSalesStore } from '../../stores/sales'

const TAB_KEYS = [
  'home',
  'rfq-inbox',
  'quote-builder',
  'pipeline',
  'customer-360',
  'contacts',
  'calendar',
  'reports',
] as const

const TAB_I18N_MAP: Record<string, string> = {
  home: 'sales.tabs.home',
  'rfq-inbox': 'sales.tabs.rfqInbox',
  'quote-builder': 'sales.tabs.quoteBuilder',
  pipeline: 'sales.tabs.pipeline',
  'customer-360': 'sales.tabs.customer360',
  contacts: 'sales.tabs.contacts',
  calendar: 'sales.tabs.calendar',
  reports: 'sales.tabs.reports',
}

export function SalesTabStrip() {
  const { t } = useTranslation('internal')
  const activeTab = useSalesStore((s) => s.activeTab)
  const setActiveTab = useSalesStore((s) => s.setActiveTab)

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => setActiveTab(key as typeof activeTab)}
    >
      <TabList
        aria-label={t('modules.sales')}
        className="flex overflow-x-auto border-b border-black/10 dark:border-white/10 px-4 gap-1"
      >
        {TAB_KEYS.map((key) => (
          <Tab
            key={key}
            id={key}
            className="shrink-0 cursor-pointer whitespace-nowrap px-3 py-2.5 text-sm font-medium text-black/60 dark:text-white/60 outline-none transition-colors
              data-[selected]:text-[#2563EB] data-[selected]:border-b-2 data-[selected]:border-[#2563EB]
              data-[hovered]:text-black/80 dark:data-[hovered]:text-white/80
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-1 rounded-t"
          >
            {t(TAB_I18N_MAP[key])}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  )
}
