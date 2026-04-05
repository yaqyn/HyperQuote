import { Tab, TabList, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useProcurementStore } from '../../stores/procurement'
import type { ProcurementTab } from '../../types/procurement'

const TAB_KEYS: ProcurementTab[] = [
  'home',
  'inquiries',
  'comparison',
  'po-management',
  'directory',
  'scorecard',
]

const TAB_I18N_MAP: Record<ProcurementTab, string> = {
  home: 'procurement.tabs.home',
  inquiries: 'procurement.tabs.inquiries',
  comparison: 'procurement.tabs.comparison',
  'po-management': 'procurement.tabs.poManagement',
  directory: 'procurement.tabs.directory',
  scorecard: 'procurement.tabs.scorecard',
}

export function ProcurementTabStrip() {
  const { t } = useTranslation('internal')
  const activeTab = useProcurementStore((s) => s.activeTab)
  const setActiveTab = useProcurementStore((s) => s.setActiveTab)

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => setActiveTab(key as ProcurementTab)}
    >
      <TabList
        aria-label={t('modules.procurement')}
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
