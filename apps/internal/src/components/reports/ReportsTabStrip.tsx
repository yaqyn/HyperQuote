import { Tab, TabList, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useReportsStore } from '../../stores/reports'
import type { ReportsTab } from '../../types/reports'

const TAB_KEYS: ReportsTab[] = [
  'sales',
  'procurement',
  'operations',
  'finance',
  'warehouse',
  'dispatch',
  'cs',
]

const TAB_CONFIG: Record<ReportsTab, { key: string; fallback: string }> = {
  sales: { key: 'tabs.sales', fallback: 'Sales' },
  procurement: { key: 'tabs.procurement', fallback: 'Procurement' },
  operations: { key: 'tabs.operations', fallback: 'Operations' },
  finance: { key: 'tabs.finance', fallback: 'Finance' },
  warehouse: { key: 'tabs.warehouse', fallback: 'Warehouse' },
  dispatch: { key: 'tabs.dispatch', fallback: 'Dispatch' },
  cs: { key: 'tabs.cs', fallback: 'Customer Service' },
}

export function ReportsTabStrip() {
  const { t } = useTranslation('reports')
  const activeTab = useReportsStore((s) => s.activeTab)
  const setActiveTab = useReportsStore((s) => s.setActiveTab)

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => setActiveTab(key as ReportsTab)}
    >
      <TabList
        aria-label={t('tabs.sales', 'Reports')}
        className="flex overflow-x-auto border-b border-black/10 dark:border-white/10 px-4 gap-1"
      >
        {TAB_KEYS.map((key) => {
          const config = TAB_CONFIG[key]
          return (
            <Tab
              key={key}
              id={key}
              className="shrink-0 cursor-pointer whitespace-nowrap px-3 py-2.5 text-sm font-medium text-black/60 dark:text-white/60 outline-none transition-colors
                data-[selected]:text-[#2563EB] data-[selected]:border-b-2 data-[selected]:border-[#2563EB]
                data-[hovered]:text-black/80 dark:data-[hovered]:text-white/80
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-1 rounded-t
                flex items-center gap-1.5"
            >
              {t(config.key, config.fallback)}
            </Tab>
          )
        })}
      </TabList>
    </Tabs>
  )
}
