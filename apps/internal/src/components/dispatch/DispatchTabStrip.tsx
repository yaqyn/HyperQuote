import { Tab, TabList, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useDispatchStore } from '../../stores/dispatch'
import type { DispatchTab } from '../../types/dispatch'

const TAB_KEYS: DispatchTab[] = [
  'home',
  'route-planning',
  'live-map',
  'driver-management',
  'delivery-log',
]

const TAB_CONFIG: Record<DispatchTab, { key: string; fallback: string }> = {
  home: { key: 'dispatch:tabs.home', fallback: 'Home' },
  'route-planning': { key: 'dispatch:tabs.routePlanning', fallback: 'Route Planning' },
  'live-map': { key: 'dispatch:tabs.liveMap', fallback: 'Live Map' },
  'driver-management': { key: 'dispatch:tabs.driverManagement', fallback: 'Driver Management' },
  'delivery-log': { key: 'dispatch:tabs.deliveryLog', fallback: 'Delivery Log' },
}

export function DispatchTabStrip() {
  const { t } = useTranslation('dispatch')
  const activeTab = useDispatchStore((s) => s.activeTab)
  const setActiveTab = useDispatchStore((s) => s.setActiveTab)

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => setActiveTab(key as DispatchTab)}
    >
      <TabList
        aria-label={t('tabs.home', 'Dispatch')}
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
              {t(config.key.replace('dispatch:', ''), config.fallback)}
            </Tab>
          )
        })}
      </TabList>
    </Tabs>
  )
}
