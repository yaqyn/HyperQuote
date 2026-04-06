import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { generateProformaPDF } from '../../../lib/server/finance-invoices'
import { useFinanceStore } from '../../../stores/finance'
import { SendInvoiceModal } from './SendInvoiceModal'
import { CreditNoteModal } from './CreditNoteModal'
import type { Invoice } from '../../../types/finance'

interface InvoiceActionsProps {
  invoice: Invoice
}

/**
 * Action buttons based on invoice status.
 * [View PDF] [Send to Customer] [Record Payment] [Issue Credit Note] [Dispute]
 */
export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const { t } = useTranslation('finance')
  const setActiveTab = useFinanceStore((s) => s.setActiveTab)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const handleViewPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const result = await generateProformaPDF({ data: { invoiceId: invoice.id } })
      // In production, open the PDF URL
      if (result.url) {
        window.open(result.url, '_blank')
      }
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleRecordPayment = () => {
    // Navigate to payments tab with invoice pre-selected
    setActiveTab('payments')
  }

  const handleDispute = () => {
    // Future: open dispute modal
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleViewPDF}
          disabled={isGeneratingPDF}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          {isGeneratingPDF
            ? t('invoicing.generating', 'Generating...')
            : t('invoicing.viewPDF', 'View PDF')}
        </button>

        <button
          type="button"
          onClick={() => setShowSendModal(true)}
          className="rounded-lg bg-[#2563EB] text-white px-3 py-1.5 text-sm font-medium hover:bg-[#2563EB]/90 transition-colors"
        >
          {t('invoicing.sendToCustomer', 'Send to Customer')}
        </button>

        <button
          type="button"
          onClick={handleRecordPayment}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {t('invoicing.recordPayment', 'Record Payment')}
        </button>

        <button
          type="button"
          onClick={() => setShowCreditNoteModal(true)}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {t('invoicing.issueCreditNote', 'Issue Credit Note')}
        </button>

        <button
          type="button"
          onClick={handleDispute}
          className="rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-1.5 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          {t('invoicing.dispute', 'Dispute')}
        </button>
      </div>

      {showSendModal && (
        <SendInvoiceModal
          invoice={invoice}
          onClose={() => setShowSendModal(false)}
        />
      )}

      {showCreditNoteModal && (
        <CreditNoteModal
          invoice={invoice}
          onClose={() => setShowCreditNoteModal(false)}
        />
      )}
    </>
  )
}
