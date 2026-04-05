import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormContext, useWatch } from 'react-hook-form'
import {
  DialogTrigger,
  Modal,
  ModalOverlay,
  Dialog,
  Button as AriaButton,
  Heading,
  Switch,
} from 'react-aria-components'
import type { QuoteFormValues } from './LineItemsTable'

// ─── QuotePreviewModal ────────────────────────────────────
// Step 9: PDF preview in elevated glass modal.
// Customer-facing: NO cost, NO margin, NO supplier columns.
// Since PDF generation is Phase 28, this is a styled HTML preview.

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
  const { t, i18n } = useTranslation('internal')
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

  // Watch form values for preview
  const lineItems = useWatch({ control, name: 'lineItems' })
  const paymentTerms = useWatch({ control, name: 'paymentTerms' })
  const coverNote = useWatch({ control, name: 'coverNote' })

  // Compute totals -- customer-facing (NO cost/margin)
  const subtotal = lineItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) ?? 0
  const vatAmount = Math.round(subtotal * 14) / 100
  const grandTotal = subtotal + vatAmount

  const today = new Date()
  const expiryDate = new Date(today)
  expiryDate.setDate(expiryDate.getDate() + validityDays)

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl">
        <Dialog
          className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white/90 shadow-2xl outline-none backdrop-blur-2xl dark:border-white/10 dark:bg-black/90"
          isKeyboardDismissDisabled
        >
          {({ close }) => (
            <>
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <Heading slot="title" className="text-base font-semibold">
                    Quote Preview
                  </Heading>
                  <span className="rounded bg-black/5 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs tabular-nums dark:bg-white/10">
                    {quoteNumber} v{version}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    isSelected={showSpecDetails}
                    onChange={setShowSpecDetails}
                    className="group flex items-center gap-2"
                  >
                    <div className="h-5 w-9 rounded-full border border-black/10 bg-black/5 p-0.5 transition-colors group-data-[selected]:bg-[#2563EB] dark:border-white/10 dark:bg-white/10">
                      <div className="h-4 w-4 rounded-full bg-white shadow transition-transform group-data-[selected]:translate-x-4 dark:bg-black" />
                    </div>
                    <span className="text-xs text-black/50 dark:text-white/50">
                      {showSpecDetails ? 'Spec details' : 'Summary view'}
                    </span>
                  </Switch>
                  <AriaButton
                    onPress={close}
                    className="rounded-md p-1.5 text-black/40 outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:text-white/40 dark:data-[hovered]:bg-white/10"
                  >
                    &#10005;
                  </AriaButton>
                </div>
              </div>

              {/* Scrollable Preview Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {/* Customer-facing document preview */}
                <div className="mx-auto max-w-2xl space-y-6">

                  {/* Seller Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold">هايبر كوت للتجارة</p>
                      <p className="text-sm font-medium">HyperQuote Trading Co.</p>
                      <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                        CR: 12345 | TRN: 100-234-567
                      </p>
                      <p className="text-xs text-black/50 dark:text-white/50">
                        Cairo, Egypt
                      </p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-black/10 bg-black/3 text-xs text-black/30 dark:border-white/10 dark:bg-white/5 dark:text-white/30">
                      Logo
                    </div>
                  </div>

                  {/* Buyer Info */}
                  <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                    <p className="text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">Bill To</p>
                    <p className="mt-1 text-sm font-semibold">{customerName}</p>
                    <p className="text-xs text-black/50 dark:text-white/50">TRN: Customer TRN</p>
                    <p className="text-xs text-black/50 dark:text-white/50">Contact: Primary Contact</p>
                  </div>

                  {/* Quote Metadata */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-black/40 dark:text-white/40">Reference</p>
                      <p className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums">{quoteNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-black/40 dark:text-white/40">Date</p>
                      <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">{dateFmt.format(today)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-black/40 dark:text-white/40">Valid Until</p>
                      <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">{dateFmt.format(expiryDate)}</p>
                    </div>
                  </div>

                  {/* Cover Note */}
                  {coverNote && (
                    <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                      <p className="text-xs font-medium text-black/40 dark:text-white/40">Note</p>
                      <p className="mt-1 text-sm">{coverNote}</p>
                    </div>
                  )}

                  {/* Line Items Table -- CUSTOMER FACING: NO cost, NO margin columns */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" role="grid">
                      <thead>
                        <tr className="border-b border-black/10 dark:border-white/10">
                          <th className="pb-2 pe-4 text-start text-xs font-medium text-black/40 dark:text-white/40">#</th>
                          <th className="pb-2 pe-4 text-start text-xs font-medium text-black/40 dark:text-white/40">Product</th>
                          {showSpecDetails && (
                            <th className="pb-2 pe-4 text-start text-xs font-medium text-black/40 dark:text-white/40">Specification</th>
                          )}
                          <th className="pb-2 pe-4 text-end text-xs font-medium text-black/40 dark:text-white/40">Qty</th>
                          <th className="pb-2 pe-4 text-end text-xs font-medium text-black/40 dark:text-white/40">Unit</th>
                          <th className="pb-2 pe-4 text-end text-xs font-medium text-black/40 dark:text-white/40">Unit Price</th>
                          <th className="pb-2 text-end text-xs font-medium text-black/40 dark:text-white/40">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(lineItems ?? []).map((item, idx) => (
                          <tr
                            key={item.id}
                            className="border-b border-black/5 dark:border-white/5"
                          >
                            <td className="py-2 pe-4 font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/40 dark:text-white/40">
                              {idx + 1}
                            </td>
                            <td className="py-2 pe-4">{item.productName}</td>
                            {showSpecDetails && (
                              <td className="py-2 pe-4 text-xs text-black/60 dark:text-white/60">
                                {item.specification}
                              </td>
                            )}
                            <td className="py-2 pe-4 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                              {item.quantity.toLocaleString(locale)}
                            </td>
                            <td className="py-2 pe-4 text-end text-xs text-black/50 dark:text-white/50">
                              {item.unit}
                            </td>
                            <td className="py-2 pe-4 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                              {fmt.format(item.sellPrice)}
                            </td>
                            <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] font-medium tabular-nums">
                              {fmt.format(item.lineTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Delivery Line */}
                  <div className="rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
                    <p className="text-xs font-medium text-black/40 dark:text-white/40">Delivery</p>
                    <p className="mt-1 text-sm">Greater Cairo area -- DAP (Delivered at Place)</p>
                  </div>

                  {/* Totals -- Customer Facing */}
                  <div className="ms-auto w-64 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-black/50 dark:text-white/50">Subtotal</span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                        {fmt.format(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-black/50 dark:text-white/50">VAT (14%)</span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                        {fmt.format(vatAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-black/10 pt-1 text-sm font-semibold dark:border-white/10">
                      <span>Grand Total</span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                        {fmt.format(grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Terms */}
                  {paymentTerms && (
                    <div>
                      <p className="text-xs font-medium text-black/40 dark:text-white/40">Payment Terms</p>
                      <p className="mt-1 text-sm">{paymentTerms}</p>
                    </div>
                  )}

                  {/* Price Disclaimer */}
                  <p className="text-xs italic text-black/40 dark:text-white/40">
                    Prices valid for {validityDays} days. Subject to supplier cost changes for volatile materials.
                  </p>

                  {/* Digital Stamp Placeholder */}
                  <div className="flex items-center justify-between border-t border-black/10 pt-4 dark:border-white/10">
                    <div>
                      <p className="text-xs text-black/40 dark:text-white/40">Authorized Signature</p>
                      <div className="mt-2 h-12 w-32 border-b border-black/20 dark:border-white/20" />
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-black/20 text-[8px] text-black/30 dark:border-white/20 dark:text-white/30">
                      ختم الشركة
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-black/10 px-6 py-4 dark:border-white/10">
                <AriaButton
                  onPress={close}
                  className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:border-white/10 dark:data-[hovered]:bg-white/10"
                >
                  Close
                </AriaButton>
                <AriaButton
                  className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white outline-none data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
                  onPress={() => {
                    // Phase 28: actual PDF download
                    console.log('Download PDF -- Phase 28')
                  }}
                >
                  Download PDF
                </AriaButton>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
