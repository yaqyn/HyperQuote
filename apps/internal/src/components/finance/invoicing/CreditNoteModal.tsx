import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Modal, ModalOverlay, Heading, Button } from 'react-aria-components'
import { motion } from 'motion/react'
import { createCreditNote } from '../../../lib/server/finance-invoices'
import { CurrencyCell } from '../shared/CurrencyCell'
import type { Invoice } from '../../../types/finance'

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

const APPROVAL_THRESHOLD = 50_000

/**
 * Credit note modal — clean form with reason pills, adjustable line items,
 * auto-calculated amount with manual override. Approval indicator for large amounts.
 */
export function CreditNoteModal({ invoice, onClose }: CreditNoteModalProps) {
  const { t } = useTranslation('finance')
  const [reason, setReason] = useState('')
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set())
  const [manualAmount, setManualAmount] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const autoAmount = useMemo(() => {
    return invoice.items
      .filter((item) => selectedLines.has(item.id))
      .reduce((sum, item) => sum + item.lineTotal + item.vatAmount, 0)
  }, [invoice.items, selectedLines])

  const effectiveAmount = manualAmount ?? autoAmount
  const needsApproval = effectiveAmount > APPROVAL_THRESHOLD

  const toggleLine = (itemId: string) => {
    setSelectedLines((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
    setManualAmount(null)
  }

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
        <Dialog
          className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-black/95 backdrop-blur-2xl p-0 outline-none"
        >
          {({ close }) => (
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                <Heading slot="title" className="text-sm font-medium">
                  {t('invoicing.issueCreditNote', 'Credit Note')}
                </Heading>
                <div className="text-xs text-black/30 dark:text-white/30 mt-0.5">
                  {t('invoicing.linkedToInvoice', 'Against')}{' '}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[#2563EB]">
                    {invoice.number}
                  </span>
                </div>
              </div>

              {submitted ? (
                /* ─── Success state ─────────────────────────── */
                <div className="px-6 py-10 text-center">
                  <div className="size-8 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <span className="size-2 rounded-full bg-green-500" />
                  </div>
                  <div className="text-xs font-medium text-black/70 dark:text-white/70 mb-1">
                    {needsApproval
                      ? t('invoicing.creditNoteSubmittedForApproval', 'Submitted for Approval')
                      : t('invoicing.creditNoteCreated', 'Credit Note Created')}
                  </div>
                  <div className="mt-2">
                    <CurrencyCell amount={effectiveAmount} className="text-lg" />
                  </div>
                  <Button
                    onPress={close}
                    className="mt-6 rounded-md bg-black/[0.04] dark:bg-white/[0.04] px-4 py-1.5 text-xs hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors"
                  >
                    {t('invoicing.done', 'Done')}
                  </Button>
                </div>
              ) : (
                <div className="px-6 py-5 space-y-5">
                  {/* ─── Reason pills ───────────────────────── */}
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25 mb-2">
                      {t('invoicing.reason', 'Reason')}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CREDIT_NOTE_REASONS.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setReason(r.value)}
                          className={`rounded-full px-3 py-1 text-xs transition-colors ${
                            reason === r.value
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-black/[0.04] dark:bg-white/[0.04] text-black/50 dark:text-white/50 hover:bg-black/[0.08] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ─── Selectable line items ──────────────── */}
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25 mb-2">
                      {t('invoicing.selectLines', 'Line Items')}
                    </div>
                    <div className="border border-black/[0.06] dark:border-white/[0.06] rounded-lg overflow-hidden">
                      {/* Header */}
                      <div className="grid grid-cols-[24px_1fr_60px_90px_70px] gap-0 px-3 py-1.5 text-[10px] tracking-wider uppercase text-black/25 dark:text-white/25 border-b border-black/[0.04] dark:border-white/[0.04]">
                        <div />
                        <div>{t('invoicing.product', 'Product')}</div>
                        <div className="text-end">{t('invoicing.qty', 'Qty')}</div>
                        <div className="text-end">{t('invoicing.lineTotal', 'Total')}</div>
                        <div className="text-end">{t('invoicing.vatAmount', 'VAT')}</div>
                      </div>
                      {invoice.items.map((item) => (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleLine(item.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleLine(item.id) }}
                          className={`grid grid-cols-[24px_1fr_60px_90px_70px] gap-0 px-3 py-2 items-center cursor-pointer transition-colors border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0 ${
                            selectedLines.has(item.id)
                              ? 'bg-[#2563EB]/[0.04]'
                              : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                          }`}
                        >
                          <div>
                            <input
                              type="checkbox"
                              checked={selectedLines.has(item.id)}
                              onChange={() => toggleLine(item.id)}
                              className="rounded border-black/15 dark:border-white/15 size-3"
                            />
                          </div>
                          <div className="text-xs text-black/60 dark:text-white/60 truncate">{item.productName}</div>
                          <div className="text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
                            {item.quantity}
                          </div>
                          <div className="text-end">
                            <CurrencyCell amount={item.lineTotal} className="text-xs" />
                          </div>
                          <div className="text-end">
                            <CurrencyCell amount={item.vatAmount} className="text-xs text-black/30 dark:text-white/30" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ─── Amount ──────────────────────────────── */}
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25 mb-1">
                        {t('invoicing.creditAmount', 'Credit Amount')}
                      </div>
                      <CurrencyCell amount={effectiveAmount} className="text-lg" />
                    </div>
                    <input
                      type="number"
                      value={manualAmount ?? ''}
                      onChange={(e) => setManualAmount(e.target.value ? Number(e.target.value) : null)}
                      placeholder={t('invoicing.manualOverride', 'Override...')}
                      className="w-36 bg-transparent border-b border-black/10 dark:border-white/10 px-0 py-1 text-xs font-[family-name:var(--font-geist-mono)] tabular-nums outline-none placeholder:text-black/20 dark:placeholder:text-white/20 focus:border-[#2563EB] transition-colors text-end"
                    />
                  </div>

                  {/* ─── Approval indicator ──────────────────── */}
                  {needsApproval && (
                    <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
                      <span className="size-1.5 rounded-full bg-yellow-500" />
                      <span className="text-[11px] text-black/50 dark:text-white/50">
                        {t('invoicing.approvalRequired', 'Approval required for amounts exceeding')} EGP{' '}
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                          {APPROVAL_THRESHOLD.toLocaleString()}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* ─── Actions ─────────────────────────────── */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <Button
                      onPress={close}
                      className="rounded-md px-4 py-1.5 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                    >
                      {t('invoicing.cancel', 'Cancel')}
                    </Button>
                    <Button
                      onPress={handleSubmit}
                      isDisabled={isSubmitting || !reason || effectiveAmount <= 0}
                      className="rounded-md bg-[#2563EB] text-white px-4 py-1.5 text-xs font-medium hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors disabled:opacity-40"
                    >
                      {isSubmitting
                        ? t('invoicing.submitting', 'Submitting...')
                        : t('invoicing.submitCreditNote', 'Submit')}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
