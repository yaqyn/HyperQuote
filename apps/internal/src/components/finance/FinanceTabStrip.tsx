import { Tab, TabList, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useFinanceStore } from '../../stores/finance'
import type { FinanceTab } from '../../types/finance'

const TAB_KEYS: FinanceTab[] = [
  'home',
  'invoicing',
  'ar',
  'ap',
  'payments',
  'credit',
  'recon',
  'reports',
]

const TAB_CONFIG: Record<FinanceTab, { key: string; fallback: string }> = {
  home: { key: 'finance:tabs.home', fallback: 'Home' },
  invoicing: { key: 'finance:tabs.invoicing', fallback: 'Invoicing' },
  ar: { key: 'finance:tabs.ar', fallback: 'AR' },
  ap: { key: 'finance:tabs.ap', fallback: 'AP' },
  payments: { key: 'finance:tabs.payments', fallback: 'Payments' },
  credit: { key: 'finance:tabs.credit', fallback: 'Credit' },
  recon: { key: 'finance:tabs.recon', fallback: 'Bank Recon' },
  reports: { key: 'finance:tabs.reports', fallback: 'Reports' },
}

export function FinanceTabStrip() {
  const { t } = useTranslation('finance')
  const activeTab = useFinanceStore((s) => s.activeTab)
  const setActiveTab = useFinanceStore((s) => s.setActiveTab)

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => setActiveTab(key as FinanceTab)}
    >
      <TabList
        aria-label={t('tabs.home', 'Finance')}
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
              {t(config.key.replace('finance:', ''), config.fallback)}
            </Tab>
          )
        })}
      </TabList>
    </Tabs>
  )
}
