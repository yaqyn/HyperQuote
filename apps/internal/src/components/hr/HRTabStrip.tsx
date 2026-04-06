import { Tab, TabList, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useHRStore } from '../../stores/hr'
import type { HRTab } from '../../types/hr'

const TAB_KEYS: HRTab[] = [
  'home',
  'employees',
  'compliance',
  'leave',
  'attendance',
  'documents',
  'settings',
]

const TAB_CONFIG: Record<HRTab, { key: string; fallback: string }> = {
  home: { key: 'tabs.home', fallback: 'Home' },
  employees: { key: 'tabs.employees', fallback: 'Employees' },
  compliance: { key: 'tabs.compliance', fallback: 'Driver Compliance' },
  leave: { key: 'tabs.leave', fallback: 'Leave' },
  attendance: { key: 'tabs.attendance', fallback: 'Attendance' },
  documents: { key: 'tabs.documents', fallback: 'Documents' },
  settings: { key: 'tabs.settings', fallback: 'Settings' },
}

export function HRTabStrip() {
  const { t } = useTranslation('hr')
  const activeTab = useHRStore((s) => s.activeTab)
  const setActiveTab = useHRStore((s) => s.setActiveTab)

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => setActiveTab(key as HRTab)}
    >
      <TabList
        aria-label={t('title', 'HR')}
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
