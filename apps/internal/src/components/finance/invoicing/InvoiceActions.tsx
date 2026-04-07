import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TooltipTrigger, Tooltip } from 'react-aria-components'
import { generateProformaPDF } from '../../../lib/server/finance-invoices'
import { useFinanceStore } from '../../../stores/finance'
import { SendInvoiceModal } from './SendInvoiceModal'
import { CreditNoteModal } from './CreditNoteModal'
import type { Invoice } from '../../../types/finance'

interface InvoiceActionsProps {
  invoice: Invoice
}

/**
 * Horizontal icon-only action bar with tooltips.
 * Icons expand to text on hover. Send | Download | Credit Note | Duplicate | Dispute.
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
      if (result.url) {
        window.open(result.url, '_blank')
      }
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleRecordPayment = () => {
    setActiveTab('payables')
  }

  const handleDispute = () => {
    // Future: open dispute modal
  }

  return (
    <>
      <div className="flex items-center gap-0.5">
        {/* Send */}
        <ActionIconButton
          label={t('invoicing.sendToCustomer', 'Send')}
          onClick={() => setShowSendModal(true)}
          icon={
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          }
          primary
        />

        {/* Download PDF */}
        <ActionIconButton
          label={isGeneratingPDF ? t('invoicing.generating', 'Generating...') : t('invoicing.viewPDF', 'Download')}
          onClick={handleViewPDF}
          disabled={isGeneratingPDF}
          icon={
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          }
        />

        {/* Credit Note */}
        <ActionIconButton
          label={t('invoicing.issueCreditNote', 'Credit Note')}
          onClick={() => setShowCreditNoteModal(true)}
          icon={
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          }
        />

        {/* Record Payment */}
        <ActionIconButton
          label={t('invoicing.recordPayment', 'Payment')}
          onClick={handleRecordPayment}
          icon={
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          }
        />

        {/* Divider */}
        <div className="w-px h-4 bg-black/[0.06] dark:bg-white/[0.06] mx-1" />

        {/* Dispute */}
        <ActionIconButton
          label={t('invoicing.dispute', 'Dispute')}
          onClick={handleDispute}
          icon={
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          }
          danger
        />
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

function ActionIconButton({
  label,
  onClick,
  icon,
  primary,
  danger,
  disabled,
}: {
  label: string
  onClick: () => void
  icon: React.ReactNode
  primary?: boolean
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <TooltipTrigger delay={300}>
      <Button
        onPress={onClick}
        isDisabled={disabled}
        className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-all disabled:opacity-40 ${
          primary
            ? 'bg-[#2563EB] text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80'
            : danger
              ? 'text-black/40 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/[0.05]'
              : 'text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
        }`}
      >
        {icon}
        <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-200 whitespace-nowrap">
          {label}
        </span>
      </Button>
      <Tooltip className="rounded-md bg-black/80 dark:bg-white/80 text-white dark:text-black px-2 py-1 text-[10px]">
        {label}
      </Tooltip>
    </TooltipTrigger>
  )
}
