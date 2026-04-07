import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components'
import { AnimatePresence, motion } from 'motion/react'
import { getCustomer360 } from '../../../lib/server/sales-customers'
import { CustomerHeader } from './CustomerHeader'
import { OverviewTab } from './OverviewTab'
import { ContactsTab } from './ContactsTab'
import { QuotesTab } from './QuotesTab'
import { OrdersTab } from './OrdersTab'
import { FinancialsTab } from './FinancialsTab'
import { ProjectsTab } from './ProjectsTab'
import { CommunicationsTab } from './CommunicationsTab'
import { DocumentsTab } from './DocumentsTab'
import { NotesTab } from './NotesTab'

const TAB_KEYS = [
  'overview',
  'contacts',
  'quotes',
  'orders',
  'financials',
  'projects',
  'communications',
  'documents',
  'notes',
] as const

type TabKey = (typeof TAB_KEYS)[number]

interface Customer360ViewProps {
  customerId: string
}

export function Customer360View({ customerId }: Customer360ViewProps) {
  const { t } = useTranslation('internal')
  const [selectedTab, setSelectedTab] = useState<TabKey>('overview')

  // Root query for header data
  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', customerId],
    queryFn: () => getCustomer360({ data: { customerId } }),
    staleTime: 120_000,
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-20 rounded-none bg-black/[0.03] dark:bg-white/[0.03]" />
        <div className="h-6 rounded-none bg-black/[0.03] dark:bg-white/[0.03] w-1/2" />
        <div className="h-64 rounded-none bg-black/[0.03] dark:bg-white/[0.03]" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col h-full">
      {/* Full-width header — no card wrapper */}
      <div className="shrink-0 px-6 pt-6 pb-4">
        <CustomerHeader
          customer={data.customer}
          accountManager={data.customer.assignedSalesRep}
          healthScore={data.healthScore}
          financials={data.financials}
          orders={data.orders}
          quotes={data.quotes}
        />
      </div>

      {/* Vertical sidebar tabs + content */}
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as TabKey)}
        orientation="vertical"
        className="flex-1 flex min-h-0"
      >
        {/* Left sidebar navigation */}
        <TabList
          aria-label={t('sales.customer360.tabs')}
          className="w-[160px] shrink-0 flex flex-col py-2 border-e border-black/[0.06] dark:border-white/[0.06]"
        >
          {TAB_KEYS.map((key) => (
            <Tab
              key={key}
              id={key}
              className="relative cursor-pointer text-start px-5 py-2 text-[13px] outline-none transition-colors
                text-black/40 dark:text-white/40
                data-[selected]:text-[var(--color-text)] data-[selected]:font-semibold dark:data-[selected]:text-white
                data-[hovered]:bg-black/[0.02] dark:data-[hovered]:bg-white/[0.03]
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40 data-[focus-visible]:ring-inset"
            >
              {/* Active indicator dot */}
              <span
                className="absolute start-0 top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-[#2563EB] opacity-0 transition-opacity
                  [[data-selected]_&]:opacity-100"
              />
              {t(`sales.customer360.tabNames.${key}`)}
            </Tab>
          ))}
        </TabList>

        {/* Tab content area */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                enter: { type: 'spring', stiffness: 200, damping: 20 },
                exit: { duration: 0.2, ease: 'easeIn' },
              }}
              className="h-full"
            >
              <TabPanel id="overview" className="h-full outline-none">
                <OverviewTab customerId={customerId} enabled={selectedTab === 'overview'} />
              </TabPanel>
              <TabPanel id="contacts" className="h-full outline-none">
                <ContactsTab customerId={customerId} enabled={selectedTab === 'contacts'} />
              </TabPanel>
              <TabPanel id="quotes" className="h-full outline-none">
                <QuotesTab customerId={customerId} enabled={selectedTab === 'quotes'} />
              </TabPanel>
              <TabPanel id="orders" className="h-full outline-none">
                <OrdersTab customerId={customerId} enabled={selectedTab === 'orders'} />
              </TabPanel>
              <TabPanel id="financials" className="h-full outline-none">
                <FinancialsTab customerId={customerId} enabled={selectedTab === 'financials'} />
              </TabPanel>
              <TabPanel id="projects" className="h-full outline-none">
                <ProjectsTab customerId={customerId} enabled={selectedTab === 'projects'} />
              </TabPanel>
              <TabPanel id="communications" className="h-full outline-none">
                <CommunicationsTab customerId={customerId} enabled={selectedTab === 'communications'} />
              </TabPanel>
              <TabPanel id="documents" className="h-full outline-none">
                <DocumentsTab customerId={customerId} enabled={selectedTab === 'documents'} />
              </TabPanel>
              <TabPanel id="notes" className="h-full outline-none">
                <NotesTab customerId={customerId} enabled={selectedTab === 'notes'} />
              </TabPanel>
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  )
}
