import { Tab, TabList, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useCustomerServiceStore } from '../../stores/customer-service'
import type { CSTab } from '../../types/customer-service'

const TAB_KEYS: CSTab[] = [
  'home',
  'whatsapp',
  'tickets',
  'returns',
  'knowledge-base',
]

const TAB_CONFIG: Record<CSTab, { key: string; fallback: string }> = {
  home: { key: 'tabs.home', fallback: 'Home' },
  whatsapp: { key: 'tabs.whatsapp', fallback: 'WhatsApp Inbox' },
  tickets: { key: 'tabs.tickets', fallback: 'Tickets' },
  returns: { key: 'tabs.returns', fallback: 'Returns / Claims' },
  'knowledge-base': { key: 'tabs.knowledgeBase', fallback: 'Knowledge Base' },
}

export function CustomerServiceTabStrip() {
  const { t } = useTranslation('customer-service')
  const activeTab = useCustomerServiceStore((s) => s.activeTab)
  const setActiveTab = useCustomerServiceStore((s) => s.setActiveTab)

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => setActiveTab(key as CSTab)}
    >
      <TabList
        aria-label={t('tabs.home', 'Customer Service')}
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
