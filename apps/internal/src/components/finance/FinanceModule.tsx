import { useFinanceStore } from '../../stores/finance'
import { FinanceTabStrip } from './FinanceTabStrip'
import { FinanceShortcuts } from './FinanceShortcuts'
import { FinanceHome } from './home/FinanceHome'
import { InvoiceList } from './invoicing/InvoiceList'
import { InvoiceDetail } from './invoicing/InvoiceDetail'
import { ARDashboard } from './ar/ARDashboard'
import { PaymentFlow } from './payments/PaymentFlow'
import { PDCContainer } from './pdc/PDCContainer'
import { APDashboard } from './ap/APDashboard'
import { CreditDashboard } from './credit/CreditDashboard'
import { BankReconDashboard } from './recon/BankReconDashboard'
import { ReportsDashboard } from './reports/ReportsDashboard'
import { DisputeWorkflow } from './disputes/DisputeWorkflow'

/**
 * Root finance module component.
 * All tabs wired to actual components — no placeholders.
 */
export function FinanceModule() {
  const activeTab = useFinanceStore((s) => s.activeTab)
  const selectedInvoiceId = useFinanceStore((s) => s.selectedInvoiceId)

  // Invoice detail drill-down
  if (selectedInvoiceId && activeTab === 'invoicing') {
    return (
      <Shell>
        <InvoiceDetail />
      </Shell>
    )
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <FinanceHome />
      case 'invoicing':
        return <InvoiceList />
      case 'ar':
        return <ARDashboard />
      case 'payments':
        return <PaymentFlow />
      case 'pdc':
        return <PDCContainer />
      case 'ap':
        return <APDashboard />
      case 'credit':
        return <CreditDashboard />
      case 'recon':
        return <BankReconDashboard />
      case 'reports':
        return <ReportsDashboard />
      case 'disputes':
        return <DisputeWorkflow />
      default:
        return null
    }
  }

  return (
    <Shell>
      {renderTab()}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <FinanceShortcuts />
      <FinanceTabStrip />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
