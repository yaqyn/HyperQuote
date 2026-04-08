import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { motion } from 'motion/react'
import { QuoteBuilderHeader } from './QuoteBuilderHeader'
import { LineItemsTable } from './LineItemsTable'
import { MarginControlPanel } from './MarginControlPanel'
import { ApprovalWorkflow } from './ApprovalWorkflow'
import { DeliveryTerms } from './DeliveryTerms'
import { PaymentTerms } from './PaymentTerms'
import { ValidityPeriod } from './ValidityPeriod'
import { QuotePreviewModal } from './QuotePreviewModal'
import { SendQuote } from './SendQuote'
import { CreditStatusBanner } from '../shared/CreditStatusBanner'
import { getQuoteBuilderData, saveQuoteDraft } from '../../../lib/server/sales-quotes'
import type { QuoteFormValues } from './LineItemsTable'
import type { MarginThresholds, FreshnessIndicator, QuoteStatus } from '../../../types/sales'

interface QuoteBuilderViewProps {
  quoteId?: string
  rfqId: string
}

/**
 * Document section -- flows naturally, no step numbers.
 * Large title + optional description text.
 */
function DocumentSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="pt-8 first:pt-4"
    >
      <h2 className="text-[16px] font-semibold text-[var(--color-text)]">
        {title}
      </h2>
      {description && (
        <p className="mt-0.5 text-[12px] text-[var(--color-text-subtle)]">
          {description}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </motion.section>
  )
}

export function QuoteBuilderView({ quoteId, rfqId }: QuoteBuilderViewProps) {
  const { t } = useTranslation('internal')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [status, setStatus] = useState<QuoteStatus>('draft')
  const [quoteNumber] = useState(() => `QT-2026-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`)
  const [version] = useState(1)
  const [marginThresholds, setMarginThresholds] = useState<MarginThresholds[]>([])
  const [customerCredit, setCustomerCredit] = useState<{
    creditLimit: number
    currentExposure: number
    availableCredit: number
  } | null>(null)
  const [customerName] = useState('Al-Nour Construction')
  const [customerTier] = useState('A')
  const [rfqReference] = useState(() => `QR-2026-${rfqId.slice(-5).padStart(5, '0')}`)
  const [previewOpen, setPreviewOpen] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const methods = useForm<QuoteFormValues>({
    defaultValues: {
      lineItems: [],
      validityDays: 14,
      paymentTerms: '',
      deliveryMethod: '',
      deliveryDate: '',
      deliveryWindow: '08:00-17:00',
      specialInstructions: '',
      earlyPaymentDiscount: '',
      scheduledSendAt: null,
      coverNote: '',
      sendVia: null,
    },
  })

  // Load quote builder data from server
  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const data = await getQuoteBuilderData({ data: { rfqId } })
        if (cancelled) return

        setMarginThresholds(data.marginThresholds)
        setCustomerCredit(data.customerCredit)

        if (data.suggestedProducts && data.suggestedProducts.length > 0) {
          const getTargetMargin = (category?: string) => {
            const threshold = data.marginThresholds.find(t => t.productCategory === category)
            return threshold?.target ?? data.marginThresholds[0]?.target ?? 18
          }

          const items = data.suggestedProducts.map((p, i) => ({
            id: p.id ?? `item-${i}`,
            productName: p.productName,
            specification: p.specification,
            quantity: 100,
            unit: 'piece',
            supplierCost: p.supplierCost,
            marginPercent: getTargetMargin(p.category),
            sellPrice: Math.round((p.supplierCost / (1 - getTargetMargin(p.category) / 100)) * 100) / 100,
            lineTotal: Math.round((p.supplierCost / (1 - getTargetMargin(p.category) / 100)) * 100),
            freshnessIndicator: p.freshness as FreshnessIndicator,
            supplierName: p.supplierName,
          }))
          methods.reset({ ...methods.getValues(), lineItems: items })
        }
      } catch (err) {
        console.error('Failed to load quote builder data:', err)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [rfqId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save every 30 seconds
  const handleAutoSave = useCallback(async () => {
    const values = methods.getValues()
    if (values.lineItems.length === 0) return
    try {
      await saveQuoteDraft({
        data: {
          quoteId: quoteId ?? 'new',
          lineItems: values.lineItems.map((item) => ({
            id: item.id,
            productName: item.productName,
            specification: item.specification,
            quantity: item.quantity,
            unit: item.unit,
            supplierCost: item.supplierCost,
            marginPercent: item.marginPercent,
            sellPrice: item.sellPrice,
          })),
          terms: values.paymentTerms || undefined,
        },
      })
      setLastSavedAt(new Date())
    } catch (err) {
      console.error('Auto-save failed:', err)
    }
  }, [methods, quoteId])

  useEffect(() => {
    autoSaveTimerRef.current = setInterval(handleAutoSave, 30_000)
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    }
  }, [handleAutoSave])

  // Compute totals from watched items (useWatch, NOT watch)
  const watchedItems = useWatch({ control: methods.control, name: 'lineItems' })
  const subtotal = watchedItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) ?? 0
  const vatAmount = Math.round(subtotal * 14) / 100
  const total = subtotal + vatAmount

  return (
    <div className="flex h-full flex-col">
      {/* Minimal top bar */}
      <QuoteBuilderHeader
        quoteNumber={quoteNumber}
        version={version}
        status={status}
        customerName={customerName}
        customerTier={customerTier}
        rfqReference={rfqReference}
        lastSavedAt={lastSavedAt}
        onSaveDraft={handleAutoSave}
        onPreviewPdf={() => setPreviewOpen(true)}
        onRequestApproval={() => setStatus('pending_approval')}
        onSendToCustomer={() => setStatus('sent')}
      />

      {/* Document + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main document -- continuous vertical scroll */}
        <div className="flex-1 overflow-y-auto px-8 pb-16">
          <FormProvider {...methods}>
            {/* Customer context */}
            <div className="flex items-center gap-4 border-b border-black/[0.06] pb-4 pt-5 dark:border-white/[0.06]">
              <span className="text-[15px] font-semibold">{customerName}</span>
              <span className="rounded-full border border-black/[0.08] px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-medium tabular-nums dark:border-white/[0.08]">
                Tier {customerTier}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
                RFQ {rfqReference}
              </span>
            </div>

            {/* Credit banner */}
            {customerCredit && (
              <div className="pt-4">
                <CreditStatusBanner
                  creditLimit={customerCredit.creditLimit}
                  currentExposure={customerCredit.currentExposure}
                  availableCredit={customerCredit.availableCredit}
                />
              </div>
            )}

            {/* Line Items */}
            <DocumentSection
              title="Materials"
              description="Add line items, adjust pricing and margins inline."
            >
              <LineItemsTable marginThresholds={marginThresholds} />

              {/* Totals */}
              <div className="mt-6 flex justify-end gap-8 border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
                <div className="text-end">
                  <p className="text-[11px] text-[var(--color-text-subtle)]">Subtotal</p>
                  <p className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium tabular-nums">
                    EGP {subtotal.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-[11px] text-[var(--color-text-subtle)]">VAT 14%</p>
                  <p className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text-muted)]">
                    EGP {vatAmount.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-[11px] text-[var(--color-text-subtle)]">Total</p>
                  <p className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums">
                    EGP {total.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </DocumentSection>

            {/* Delivery */}
            <DocumentSection title="Delivery">
              <DeliveryTerms
                deliveryAddress="Cairo, Egypt"
                totalWeightTons={12}
                leadTimeDays={3}
              />
            </DocumentSection>

            {/* Payment */}
            <DocumentSection title="Payment">
              <PaymentTerms
                customerCredit={customerCredit}
                isNewCustomer={customerTier === 'new'}
              />
            </DocumentSection>

            {/* Validity */}
            <DocumentSection title="Validity">
              <ValidityPeriod />
            </DocumentSection>

            {/* Approval */}
            <DocumentSection title="Approval">
              {/* Approval Required banner — prominent when not yet approved */}
              {status === 'draft' && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/[0.04] px-4 py-3">
                  <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-primary)]/10">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M7 3v4M7 10h.01" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-medium text-[var(--color-primary)]">
                    Approval Required — Submit for review before sending
                  </p>
                </div>
              )}
              <ApprovalWorkflow
                quoteId={quoteId ?? 'new'}
                marginPercent={subtotal > 0 ? Math.round((1 - (watchedItems ?? []).reduce((s, i) => s + i.supplierCost * i.quantity, 0) / subtotal) * 10000) / 100 : 0}
                totalValue={total}
                customerTier="A"
                thresholds={marginThresholds}
                status={status === 'pending_approval' ? 'pending_approval' : status === 'approved' ? 'approved' : 'draft'}
                onStatusChange={(newStatus) => setStatus(newStatus as QuoteStatus)}
              />
            </DocumentSection>

            {/* Preview */}
            <QuotePreviewModal
              quoteNumber={quoteNumber}
              version={version}
              customerName={customerName}
              validityDays={methods.getValues('validityDays') ?? 14}
              isOpen={previewOpen}
              onOpenChange={setPreviewOpen}
            />

            {/* Send — prominent when approved, muted when blocked */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className={`pt-8 pb-4 ${
                status === 'approved'
                  ? 'rounded-xl border-2 border-green-500/20 bg-green-500/[0.03] px-6 -mx-2'
                  : ''
              }`}
            >
              {status === 'approved' && (
                <div className="flex items-center gap-2 mb-3">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3.5 7l2.5 2.5L10.5 5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[13px] font-semibold text-green-700 dark:text-green-400">
                    Approved — Ready to send
                  </span>
                </div>
              )}
              <h2 className="text-[16px] font-semibold text-[var(--color-text)]">
                Send Quote
              </h2>
              <div className="mt-4">
                <SendQuote
                  quoteId={quoteId ?? 'new'}
                  quoteNumber={quoteNumber}
                  customerName={customerName}
                  onSent={() => setStatus('sent')}
                />
              </div>
            </motion.section>
          </FormProvider>
        </div>

        {/* Floating sidebar -- margin control */}
        <div className="hidden w-[35%] min-w-[280px] max-w-[380px] overflow-y-auto border-s border-black/[0.06] p-6 lg:block dark:border-white/[0.06]">
          <MarginControlPanel
            lineItems={watchedItems ?? []}
            marginThresholds={marginThresholds}
            onSetBlanketMargin={(margin) => {
              const items = methods.getValues('lineItems')
              items.forEach((item, i) => {
                const newSellPrice = Math.round((item.supplierCost / (1 - margin / 100)) * 100) / 100
                const newLineTotal = Math.round(newSellPrice * item.quantity * 100) / 100
                methods.setValue(`lineItems.${i}.marginPercent`, margin)
                methods.setValue(`lineItems.${i}.sellPrice`, newSellPrice)
                methods.setValue(`lineItems.${i}.lineTotal`, newLineTotal)
              })
            }}
          />
        </div>
      </div>
    </div>
  )
}
