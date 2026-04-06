import { Tab, TabList, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../../stores/admin'
import type { AdminTab } from '../../types/admin'

const TAB_KEYS: AdminTab[] = [
  'users',
  'permissions',
  'settings',
  'margins',
  'approvals',
  'holidays',
  'integrations',
  'audit',
]

const TAB_CONFIG: Record<AdminTab, { key: string; fallback: string }> = {
  users: { key: 'tabs.users', fallback: 'Users & Roles' },
  permissions: { key: 'tabs.permissions', fallback: 'Permissions' },
  settings: { key: 'tabs.settings', fallback: 'System Settings' },
  margins: { key: 'tabs.margins', fallback: 'Margin Rules' },
  approvals: { key: 'tabs.approvals', fallback: 'Approval Thresholds' },
  holidays: { key: 'tabs.holidays', fallback: 'Holiday Calendar' },
  integrations: { key: 'tabs.integrations', fallback: 'Integrations' },
  audit: { key: 'tabs.audit', fallback: 'Audit Log' },
}

export function AdminTabStrip() {
  const { t } = useTranslation('admin')
  const activeTab = useAdminStore((s) => s.activeTab)
  const setActiveTab = useAdminStore((s) => s.setActiveTab)

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => setActiveTab(key as AdminTab)}
    >
      <TabList
        aria-label={t('tabs.users', 'Admin')}
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
