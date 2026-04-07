import { Button } from 'react-aria-components'
import { ArrowLeft } from 'lucide-react'
import { useFinanceStore } from '../../stores/finance'
import { FinanceTabStrip } from './FinanceTabStrip'
import { FinanceShortcuts } from './FinanceShortcuts'
import { InvoiceList } from './invoicing/InvoiceList'
import { InvoiceDetail } from './invoicing/InvoiceDetail'
import { ARDashboard } from './ar/ARDashboard'
import { PaymentFlow } from './payments/PaymentFlow'
import { PDCContainer } from './pdc/PDCContainer'
import { APDashboard } from './ap/APDashboard'
import { CreditDashboard } from './credit/CreditDashboard'
import { BankReconDashboard } from './recon/BankReconDashboard'
import { DisputeDetail } from './disputes/DisputeDetail'

/**
 * Root finance module — "The Ledger".
 * 5 tabs grouped by person: Home | Receivables | Payables | Recon | Reports.
 * Receivables = AR clerk's full day (invoices + aging + credit + disputes).
 * Payables = AP clerk's full day (vendor invoices + payments + cheques).
 */
export function FinanceModule() {
  const activeTab = useFinanceStore((s) => s.activeTab)
  const selectedInvoiceId = useFinanceStore((s) => s.selectedInvoiceId)
  const setSelectedInvoiceId = useFinanceStore((s) => s.setSelectedInvoiceId)
  const selectedDisputeId = useFinanceStore((s) => s.selectedDisputeId)
  const setSelectedDisputeId = useFinanceStore((s) => s.setSelectedDisputeId)
  const selectedCustomerId = useFinanceStore((s) => s.selectedCustomerId)
  const setSelectedCustomerId = useFinanceStore((s) => s.setSelectedCustomerId)
  const selectedChequeId = useFinanceStore((s) => s.selectedChequeId)
  const setSelectedChequeId = useFinanceStore((s) => s.setSelectedChequeId)

  // ─── Receivables drill-downs ───────────────────────────
  // Invoice detail inline (back arrow returns to receivables scroll)
  if (selectedInvoiceId && activeTab === 'receivables') {
    return (
      <Shell>
        <div className="px-6 pt-3">
          <Button
            onPress={() => setSelectedInvoiceId(null)}
            className="flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 cursor-pointer hover:text-black dark:hover:text-white transition-colors outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40 rounded-md px-1 py-0.5"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            Back
          </Button>
        </div>
        <InvoiceDetail />
      </Shell>
    )
  }

  // Dispute detail inline
  if (selectedDisputeId && activeTab === 'receivables') {
    return (
      <Shell>
        <div className="px-6 pt-3">
          <Button
            onPress={() => setSelectedDisputeId(null)}
            className="flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 cursor-pointer hover:text-black dark:hover:text-white transition-colors outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40 rounded-md px-1 py-0.5"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            Back
          </Button>
        </div>
        <DisputeDetail disputeId={selectedDisputeId} onBack={() => setSelectedDisputeId(null)} />
      </Shell>
    )
  }

  const renderTab = () => {
    switch (activeTab) {
      // ─── Receivables: AR clerk's single scrollable page ──
      case 'receivables':
        return (
          <div className="flex flex-col gap-8 pb-12">
            {/* 1. AR KPI Strip + Filters + Aging Table */}
            <ARDashboard />
            {/* 2. Credit overview */}
            <div className="px-6">
              <h2 className="text-xs uppercase tracking-wider text-black/40 dark:text-white/40 mb-4">
                Credit Management
              </h2>
              <CreditDashboard />
            </div>
            {/* 3. Recent invoices */}
            <div className="px-6">
              <h2 className="text-xs uppercase tracking-wider text-black/40 dark:text-white/40 mb-4">
                Invoices
              </h2>
              <InvoiceList />
            </div>
          </div>
        )

      // ─── Payables: AP clerk's single scrollable page ─────
      case 'payables':
        return (
          <div className="flex flex-col gap-8 pb-12">
            {/* 1. AP summary + invoice list */}
            <APDashboard />
            {/* 2. Payment recording flow */}
            <div className="px-6">
              <h2 className="text-xs uppercase tracking-wider text-black/40 dark:text-white/40 mb-4">
                Record Payment
              </h2>
              <PaymentFlow />
            </div>
            {/* 3. Post-dated cheques */}
            <div className="px-6">
              <h2 className="text-xs uppercase tracking-wider text-black/40 dark:text-white/40 mb-4">
                Post-Dated Cheques
              </h2>
              <PDCContainer />
            </div>
          </div>
        )

      case 'recon':
        return <BankReconDashboard />
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
    <div className="flex flex-col h-full bg-white dark:bg-black">
      <FinanceShortcuts />
      <FinanceTabStrip />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
