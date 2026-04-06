import { Tab, TabList, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useOperationsStore } from '../../stores/operations'
import type { OperationsTab } from '../../types/operations'

const TAB_KEYS: OperationsTab[] = [
  'dashboard',
  'kanban',
  'order-detail',
  'delivery-schedule',
]

const TAB_I18N_MAP: Record<OperationsTab, { key: string; fallback: string }> = {
  dashboard: { key: 'operations.tabs.dashboard', fallback: 'Dashboard' },
  kanban: { key: 'operations.tabs.kanban', fallback: 'Kanban' },
  'order-detail': { key: 'operations.tabs.orderDetail', fallback: 'Order Detail' },
  'delivery-schedule': { key: 'operations.tabs.deliverySchedule', fallback: 'Delivery Schedule' },
}

export function OperationsTabStrip() {
  const { t } = useTranslation('internal')
  const activeTab = useOperationsStore((s) => s.activeTab)
  const setActiveTab = useOperationsStore((s) => s.setActiveTab)

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => setActiveTab(key as OperationsTab)}
    >
      <TabList
        aria-label={t('modules.operations', 'Operations')}
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
            {t(TAB_I18N_MAP[key].key, TAB_I18N_MAP[key].fallback)}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  )
}
