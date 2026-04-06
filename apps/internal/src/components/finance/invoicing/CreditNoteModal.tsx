import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Modal, ModalOverlay, Heading } from 'react-aria-components'
import { createCreditNote } from '../../../lib/server/finance-invoices'
import { CurrencyCell } from '../shared/CurrencyCell'
import type { Invoice, InvoiceItem } from '../../../types/finance'

interface CreditNoteModalProps {
  invoice: Invoice
  onClose: () => void
}

const CREDIT_NOTE_REASONS = [
  { value: 'goods_returned', label: 'Goods Returned' },
  { value: 'price_adjustment', label: 'Price Adjustment' },
  { value: 'damaged_goods', label: 'Damaged Goods' },
  { value: 'other', label: 'Other' },
]

const APPROVAL_THRESHOLD = 50_000 // EGP — configurable

/**
 * Credit note generation modal (React Aria Dialog).
 * Linked to original invoice. Reason dropdown, selectable line items,
 * auto-calculated amount with manual override, approval indicator.
 */
export function CreditNoteModal({ invoice, onClose }: CreditNoteModalProps) {
  const { t } = useTranslation('finance')
  const [reason, setReason] = useState('')
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set())
  const [manualAmount, setManualAmount] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Auto-calculate amount from selected lines (lineTotal + vatAmount)
  const autoAmount = useMemo(() => {
    return invoice.items
      .filter((item) => selectedLines.has(item.id))
      .reduce((sum, item) => sum + item.lineTotal + item.vatAmount, 0)
  }, [invoice.items, selectedLines])

  const effectiveAmount = manualAmount ?? autoAmount

  const toggleLine = (itemId: string) => {
    setSelectedLines((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
    // Reset manual override when selection changes
    setManualAmount(null)
  }

  const needsApproval = effectiveAmount > APPROVAL_THRESHOLD

  const handleSubmit = async () => {
    if (!reason || effectiveAmount <= 0) return
    setIsSubmitting(true)
    try {
      await createCreditNote({
        data: {
          invoiceId: invoice.id,
          reason,
          lineItems: Array.from(selectedLines).map((itemId) => {
            const item = invoice.items.find((i) => i.id === itemId)
            return { itemId, amount: item ? item.lineTotal + item.vatAmount : 0 }
          }),
          amount: effectiveAmount,
        },
      })
      setSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOverlay
      isDismissable
      isOpen
      onOpenChange={(open) => { if (!open) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <Dialog className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-2xl p-6 outline-none">
          {({ close }) => (
            <>
              <Heading slot="title" className="text-lg font-semibold mb-1">
                {t('invoicing.issueCreditNote', 'Issue Credit Note')}
              </Heading>
              <div className="text-sm text-black/50 dark:text-white/50 mb-4">
                {t('invoicing.linkedToInvoice', 'Linked to Invoice')} #{' '}
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{invoice.number}</span>
              </div>

              {submitted ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <div className="text-sm font-medium mb-1">
                    {needsApproval
                      ? t('invoicing.creditNoteSubmittedForApproval', 'Credit Note Submitted for Approval')
                      : t('invoicing.creditNoteCreated', 'Credit Note Created')}
                  </div>
                  <div className="text-lg mt-2">
                    <CurrencyCell amount={effectiveAmount} />
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-4 rounded-lg bg-[#2563EB] text-white px-4 py-2 text-sm font-medium hover:bg-[#2563EB]/90 transition-colors"
                  >
                    {t('invoicing.done', 'Done')}
                  </button>
                </div>
              ) : (
                <>
                  {/* Reason dropdown */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-black/60 dark:text-white/60 mb-1 block">
                      {t('invoicing.reason', 'Reason')}
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-2 text-sm"
                    >
                      <option value="">{t('invoicing.selectReason', 'Select reason...')}</option>
                      {CREDIT_NOTE_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Selectable line items */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-black/60 dark:text-white/60 mb-2 block">
                      {t('invoicing.selectLines', 'Select Lines')}
                    </label>
                    <div className="rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-black/10 dark:border-white/10 text-xs text-black/50 dark:text-white/50">
                            <th className="py-2 ps-3 w-8" />
                            <th className="py-2 px-2 font-medium text-start">{t('invoicing.product', 'Product')}</th>
                            <th className="py-2 px-2 font-medium text-end">{t('invoicing.qty', 'Qty')}</th>
                            <th className="py-2 px-2 font-medium text-end">{t('invoicing.lineTotal', 'Line Total')}</th>
                            <th className="py-2 px-2 pe-3 font-medium text-end">{t('invoicing.vatAmount', 'VAT')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items.map((item) => (
                            <tr
                              key={item.id}
                              className={`border-b border-black/5 dark:border-white/5 cursor-pointer transition-colors ${selectedLines.has(item.id) ? 'bg-[#2563EB]/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                              onClick={() => toggleLine(item.id)}
                            >
                              <td className="py-2 ps-3">
                                <input
                                  type="checkbox"
                                  checked={selectedLines.has(item.id)}
                                  onChange={() => toggleLine(item.id)}
                                  className="rounded border-black/20 dark:border-white/20"
                                />
                              </td>
                              <td className="py-2 px-2">{item.productName}</td>
                              <td className="py-2 px-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{item.quantity}</td>
                              <td className="py-2 px-2 text-end"><CurrencyCell amount={item.lineTotal} /></td>
                              <td className="py-2 px-2 pe-3 text-end"><CurrencyCell amount={item.vatAmount} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Amount (auto-calculated / manual override) */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-black/60 dark:text-white/60 mb-1 block">
                      {t('invoicing.creditAmount', 'Credit Note Amount')}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="text-lg">
                        <CurrencyCell amount={effectiveAmount} />
                      </div>
                      <input
                        type="number"
                        value={manualAmount ?? ''}
                        onChange={(e) => setManualAmount(e.target.value ? Number(e.target.value) : null)}
                        placeholder={t('invoicing.manualOverride', 'Manual override...')}
                        className="flex-1 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-1.5 text-sm font-[family-name:var(--font-geist-mono)] tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Approval indicator */}
                  {needsApproval && (
                    <div className="mb-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-300">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        {t('invoicing.approvalRequired', 'Approval required for credit notes exceeding')} EGP{' '}
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{APPROVAL_THRESHOLD.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {t('invoicing.cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || !reason || effectiveAmount <= 0}
                      className="rounded-lg bg-[#2563EB] text-white px-4 py-2 text-sm font-medium hover:bg-[#2563EB]/90 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting
                        ? t('invoicing.submitting', 'Submitting...')
                        : t('invoicing.submitCreditNote', 'Submit Credit Note')}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
