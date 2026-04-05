import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'
import { CustomerHeader } from './CustomerHeader'
import { OverviewTab } from './OverviewTab'
import { ContactsTab } from './ContactsTab'
import { QuotesTab } from './QuotesTab'

// Lazy-imported in Task 1b
const OrdersTab = lazyTabPlaceholder('Orders')
const FinancialsTab = lazyTabPlaceholder('Financials')
const ProjectsTab = lazyTabPlaceholder('Projects')
const CommunicationsTab = lazyTabPlaceholder('Communications')
const DocumentsTab = lazyTabPlaceholder('Documents')
const NotesTab = lazyTabPlaceholder('Notes')

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
    queryFn: () => getCustomer360({ customerId }),
    staleTime: 120_000,
  })

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-24 rounded-xl bg-black/5 dark:bg-white/5" />
        <div className="h-8 rounded bg-black/5 dark:bg-white/5 w-2/3" />
        <div className="h-64 rounded-xl bg-black/5 dark:bg-white/5" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="shrink-0 p-4 pb-0">
        <CustomerHeader
          customer={data.customer}
          accountManager={data.customer.assignedSalesRep}
        />
      </div>

      {/* Tabbed Content */}
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as TabKey)}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabList
          aria-label={t('sales.customer360.tabs')}
          className="flex overflow-x-auto border-b border-black/10 dark:border-white/10 px-4 gap-1 shrink-0"
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
              {t(`sales.customer360.tabNames.${key}`)}
            </Tab>
          ))}
        </TabList>

        <div className="flex-1 overflow-auto">
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
        </div>
      </Tabs>
    </div>
  )
}

/** Temporary placeholder for tabs built in Task 1b */
function lazyTabPlaceholder(label: string) {
  return function PlaceholderTab({ enabled }: { customerId: string; enabled: boolean }) {
    if (!enabled) return null
    return (
      <div className="flex items-center justify-center h-48 text-sm text-black/40 dark:text-white/40">
        {label} — Loading...
      </div>
    )
  }
}
