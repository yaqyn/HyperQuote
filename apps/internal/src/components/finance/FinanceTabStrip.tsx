import { useFinanceStore } from '../../stores/finance'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS = [
  { id: 'receivables', label: 'Receivables' },
  { id: 'payables', label: 'Payables' },
  { id: 'recon', label: 'Bank Recon' },
]

export function FinanceTabStrip() {
  const activeTab = useFinanceStore((s) => s.activeTab)
  const setActiveTab = useFinanceStore((s) => s.setActiveTab)

  return (
    <ModuleTabStrip
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as typeof activeTab)}
      ariaLabel="Finance"
    />
  )
}
