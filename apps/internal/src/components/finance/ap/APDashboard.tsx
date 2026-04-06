import { useState } from 'react'
import { APInvoiceList } from './APInvoiceList'
import { ThreeWayMatchReview } from './ThreeWayMatchReview'
import type { APInvoice } from '../../../types/finance'

type APView = 'list' | 'review'

/**
 * Container for the AP tab.
 * Shows APInvoiceList by default. When an invoice is selected,
 * switches to ThreeWayMatchReview. Back nav returns to list.
 * WithholdingTaxSection and APAgingTable rendered as sub-sections below.
 */
export function APDashboard() {
  const [view, setView] = useState<APView>('list')
  const [selectedInvoice, setSelectedInvoice] = useState<APInvoice | null>(null)

  const handleSelectInvoice = (invoice: APInvoice) => {
    setSelectedInvoice(invoice)
    setView('review')
  }

  const handleBack = () => {
    setSelectedInvoice(null)
    setView('list')
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {view === 'list' && (
        <APInvoiceList onSelectInvoice={handleSelectInvoice} />
      )}
      {view === 'review' && selectedInvoice && (
        <ThreeWayMatchReview invoice={selectedInvoice} onBack={handleBack} />
      )}
    </div>
  )
}
