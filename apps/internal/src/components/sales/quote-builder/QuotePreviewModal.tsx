import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormContext, useWatch } from 'react-hook-form'
import {
  Modal,
  ModalOverlay,
  Dialog,
  Button as AriaButton,
  Heading,
} from 'react-aria-components'
import { Button, Toggle } from '../../ui'
import type { QuoteFormValues } from './types'

interface QuotePreviewModalProps {
  quoteNumber: string
  version: number
  customerName: string
  validityDays: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function QuotePreviewModal({
  quoteNumber,
  version,
  customerName,
  validityDays,
  isOpen,
  onOpenChange,
}: QuotePreviewModalProps) {
  const { i18n } = useTranslation('internal')
  const { control } = useFormContext<QuoteFormValues>()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
  })
  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const [showSpecDetails, setShowSpecDetails] = useState(false)

  const lineItems = useWatch({ control, name: 'lineItems' })
  const paymentTerms = useWatch({ control, name: 'paymentTerms' })
  const coverNote = useWatch({ control, name: 'coverNote' })

  const subtotal = lineItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) ?? 0
  const vatAmount = Math.round(subtotal * 14) / 100
  const grandTotal = subtotal + vatAmount

  const todayDate = new Date()
  const expiryDate = new Date(todayDate)
  expiryDate.setDate(expiryDate.getDate() + validityDays)

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      isKeyboardDismissDisabled
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <Modal className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl">
        <Dialog
          className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white/90 shadow-2xl outline-none dark:border-white/[0.06] dark:bg-black/90"
        >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-3.5 dark:border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <Heading slot="title" className="text-[16px] font-semibold">
                    Preview
                  </Heading>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
                    {quoteNumber} v{version}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle
                    isSelected={showSpecDetails}
                    onChange={setShowSpecDetails}
                    label={showSpecDetails ? 'Detailed' : 'Summary'}
                  />
                  <AriaButton
                    onPress={() => onOpenChange(false)}
                    className="rounded-md p-1.5 text-[var(--color-text-subtle)] outline-none data-[hovered]:bg-black/[0.03] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 dark:data-[hovered]:bg-white/[0.06]"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </AriaButton>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="mx-auto max-w-2xl space-y-6">

                  {/* Seller */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold">HyperQuote Trading Co.</p>
                      <p className="text-[13px] font-medium text-[var(--color-text-muted)]">
                        CR: 12345 | TRN: 100-234-567
                      </p>
                      <p className="text-[11px] text-[var(--color-text-subtle)]">Cairo, Egypt</p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-black/[0.06] text-[10px] text-[var(--color-text-subtle)] dark:border-white/[0.06]">
                      Logo
                    </div>
                  </div>

                  {/* Buyer */}
                  <div className="border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">Bill To</p>
                    <p className="mt-1 text-[14px] font-semibold">{customerName}</p>
                  </div>

                  {/* Metadata */}
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[10px] text-[var(--color-text-subtle)]">Reference</p>
                      <p className="font-[family-name:var(--font-geist-mono)] text-[13px] font-medium tabular-nums">{quoteNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--color-text-subtle)]">Date</p>
                      <p className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums">{dateFmt.format(todayDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--color-text-subtle)]">Valid Until</p>
                      <p className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums">{dateFmt.format(expiryDate)}</p>
                    </div>
                  </div>

                  {/* Cover Note */}
                  {coverNote && (
                    <p className="text-[13px] text-[var(--color-text-muted)] italic">{coverNote}</p>
                  )}

                  {/* Line Items -- customer facing: NO cost, NO margin */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]" role="grid">
                      <thead>
                        <tr className="border-b border-black/[0.08] dark:border-white/[0.08]">
                          <th className="pb-2 pe-4 text-start text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">#</th>
                          <th className="pb-2 pe-4 text-start text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">Product</th>
                          {showSpecDetails && (
                            <th className="pb-2 pe-4 text-start text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">Spec</th>
                          )}
                          <th className="pb-2 pe-4 text-end text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">Qty</th>
                          <th className="pb-2 pe-4 text-end text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">Unit Price</th>
                          <th className="pb-2 text-end text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(lineItems ?? []).map((item, idx) => (
                          <tr key={item.id} className="h-10">
                            <td className="pe-4 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
                              {idx + 1}
                            </td>
                            <td className="pe-4">{item.productName}</td>
                            {showSpecDetails && (
                              <td className="pe-4 text-[11px] text-[var(--color-text-muted)]">
                                {item.specification}
                              </td>
                            )}
                            <td className="pe-4 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                              {item.quantity.toLocaleString(locale)} {item.unit}
                            </td>
                            <td className="pe-4 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                              {fmt.format(item.sellPrice)}
                            </td>
                            <td className="text-end font-[family-name:var(--font-geist-mono)] font-medium tabular-nums">
                              {fmt.format(item.lineTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="ms-auto w-56 space-y-1.5">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[var(--color-text-muted)]">Subtotal</span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{fmt.format(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[var(--color-text-muted)]">VAT (14%)</span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{fmt.format(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-black/[0.08] pt-1.5 text-[14px] font-semibold dark:border-white/[0.08]">
                      <span>Total</span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{fmt.format(grandTotal)}</span>
                    </div>
                  </div>

                  {/* Payment Terms */}
                  {paymentTerms && (
                    <div className="text-[12px]">
                      <span className="text-[var(--color-text-subtle)]">Payment: </span>
                      <span className="font-medium">{paymentTerms}</span>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <p className="text-[10px] italic text-[var(--color-text-subtle)]">
                    Prices valid for {validityDays} days. Subject to supplier cost changes for volatile materials.
                  </p>

                  {/* Signature */}
                  <div className="flex items-end justify-between border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
                    <div>
                      <p className="text-[10px] text-[var(--color-text-subtle)]">Authorized Signature</p>
                      <div className="mt-2 h-10 w-28 border-b border-black/[0.15] dark:border-white/[0.15]" />
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-black/[0.12] text-[8px] text-[var(--color-text-subtle)] dark:border-white/[0.12]">
                      Company Stamp
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-black/[0.06] px-6 py-3 dark:border-white/[0.06]">
                <Button
                  variant="outline"
                  onPress={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onPress={() => {
                    console.log('Download PDF -- Phase 28')
                  }}
                >
                  Download PDF
                </Button>
              </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
