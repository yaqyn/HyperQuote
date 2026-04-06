import { Tab, TabList, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useWarehouseStore } from '../../stores/warehouse'
import { getWarehouseDashboard } from '../../lib/server/warehouse-dashboard'
import type { WarehouseTab, WarehouseDashboard } from '../../types/warehouse'

const TAB_KEYS: WarehouseTab[] = [
  'home',
  'receiving',
  'putaway',
  'picking',
  'staging',
  'count',
  'lookup',
  'yard',
]

const TAB_CONFIG: Record<WarehouseTab, { key: string; fallback: string; badgeField?: keyof WarehouseDashboard }> = {
  home: { key: 'warehouse.tabs.home', fallback: 'Home' },
  receiving: { key: 'warehouse.tabs.receiving', fallback: 'RCV', badgeField: 'pendingReceiving' },
  putaway: { key: 'warehouse.tabs.putaway', fallback: 'PUTWY', badgeField: 'pendingPutaway' },
  picking: { key: 'warehouse.tabs.picking', fallback: 'PICK', badgeField: 'pendingPicking' },
  staging: { key: 'warehouse.tabs.staging', fallback: 'LOAD', badgeField: 'pendingLoading' },
  count: { key: 'warehouse.tabs.count', fallback: 'COUNT', badgeField: 'pendingCounts' },
  lookup: { key: 'warehouse.tabs.lookup', fallback: 'Lookup' },
  yard: { key: 'warehouse.tabs.yard', fallback: 'Yard' },
}

export function WarehouseTabStrip() {
  const { t } = useTranslation('internal')
  const activeTab = useWarehouseStore((s) => s.activeTab)
  const setActiveTab = useWarehouseStore((s) => s.setActiveTab)

  const { data: dashboard } = useQuery({
    queryKey: ['warehouse', 'dashboard'],
    queryFn: () => getWarehouseDashboard({ data: {} }),
    staleTime: 30_000,
  })

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => setActiveTab(key as WarehouseTab)}
    >
      <TabList
        aria-label={t('modules.warehouse', 'Warehouse')}
        className="flex overflow-x-auto border-b border-black/10 dark:border-white/10 px-4 gap-1"
      >
        {TAB_KEYS.map((key) => {
          const config = TAB_CONFIG[key]
          const badgeCount = config.badgeField && dashboard ? dashboard[config.badgeField] as number : 0

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
              {badgeCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-[#2563EB] px-1.5 text-[10px] font-[family-name:var(--font-geist-mono)] tabular-nums font-semibold text-white">
                  {badgeCount}
                </span>
              )}
            </Tab>
          )
        })}
      </TabList>
    </Tabs>
  )
}
