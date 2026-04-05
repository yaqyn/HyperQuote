import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { QuoteBuilderHeader } from './QuoteBuilderHeader'
import { LineItemsTable } from './LineItemsTable'
import { MarginControlPanel } from './MarginControlPanel'
import { ApprovalWorkflow } from './ApprovalWorkflow'
import { DeliveryTerms } from './DeliveryTerms'
import { PaymentTerms } from './PaymentTerms'
import { ValidityPeriod } from './ValidityPeriod'
import { CreditStatusBanner } from '../shared/CreditStatusBanner'
import { getQuoteBuilderData, saveQuoteDraft } from '../../../lib/server/sales-quotes'
import type { QuoteFormValues } from './LineItemsTable'
import type { MarginThresholds, FreshnessIndicator, QuoteStatus } from '../../../types/sales'

interface QuoteBuilderViewProps {
  quoteId?: string
  rfqId: string
}

// Sections for the 10-step single-page surface
function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 pt-4">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/5 font-[family-name:var(--font-geist-mono)] text-[10px] font-medium text-black/50 dark:bg-white/10 dark:text-white/50">
        {step}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
        {title}
      </span>
    </div>
  )
}

function StepPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-black/10 px-4 py-6 text-center text-xs text-black/30 dark:border-white/10 dark:text-white/30">
      {label} -- Plan 05
    </div>
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

        // Pre-populate line items from suggested products
        if (data.suggestedProducts && data.suggestedProducts.length > 0) {
          const items = data.suggestedProducts.map((p, i) => ({
            id: p.id ?? `item-${i}`,
            productName: p.productName,
            specification: p.specification,
            quantity: 100,
            unit: 'piece',
            supplierCost: p.supplierCost,
            marginPercent: 18,
            sellPrice: Math.round((p.supplierCost / (1 - 0.18)) * 100) / 100,
            lineTotal: Math.round((p.supplierCost / (1 - 0.18)) * 100),
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

  // Compute totals from watched items (useWatch, NOT watch — React 19 requirement)
  const watchedItems = useWatch({ control: methods.control, name: 'lineItems' })
  const subtotal = watchedItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) ?? 0
  const vatAmount = Math.round(subtotal * 14) / 100
  const total = subtotal + vatAmount

  return (
    <div className="flex h-full flex-col">
      {/* Fixed header */}
      <QuoteBuilderHeader
        quoteNumber={quoteNumber}
        version={version}
        status={status}
        customerName={customerName}
        customerTier={customerTier}
        rfqReference={rfqReference}
        lastSavedAt={lastSavedAt}
        onSaveDraft={handleAutoSave}
        onPreviewPdf={() => {
          // Placeholder: open PDF preview modal
        }}
        onRequestApproval={() => {
          setStatus('pending_approval')
        }}
        onSendToCustomer={() => {
          setStatus('sent')
        }}
      />

      {/* Single-page scrollable surface with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content: 10 steps stacked vertically */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <FormProvider {...methods}>
            {/* Step 1: Initialize */}
            <SectionHeader step={1} title={t('sales.quoteBuilder.steps.initialize')} />
            {customerCredit && (
              <CreditStatusBanner
                creditLimit={customerCredit.creditLimit}
                currentExposure={customerCredit.currentExposure}
                availableCredit={customerCredit.availableCredit}
              />
            )}

            {/* Step 2: Line Items */}
            <SectionHeader step={2} title={t('sales.quoteBuilder.steps.lineItems')} />
            <LineItemsTable marginThresholds={marginThresholds} />

            {/* Step 3: Cost Lookup -- indicators rendered inline in LineItemsTable */}
            <SectionHeader step={3} title={t('sales.quoteBuilder.steps.costLookup')} />
            <p className="text-xs text-black/40 dark:text-white/40">
              Cost freshness indicators are shown inline in the table above.
            </p>

            {/* Step 4: Pricing -- margin guardrails rendered inline in LineItemsTable */}
            <SectionHeader step={4} title={t('sales.quoteBuilder.steps.pricing')} />
            <p className="text-xs text-black/40 dark:text-white/40">
              Margin guardrails are shown inline in the table above. Use the sidebar control panel to adjust blanket margins.
            </p>

            {/* Totals row */}
            <div className="mt-4 flex justify-end gap-6 border-t border-black/10 pt-3 dark:border-white/10">
              <div className="text-end">
                <p className="text-xs text-black/40 dark:text-white/40">Subtotal</p>
                <p className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums">
                  EGP {subtotal.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-end">
                <p className="text-xs text-black/40 dark:text-white/40">VAT (14%)</p>
                <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                  EGP {vatAmount.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-end">
                <p className="text-xs text-black/40 dark:text-white/40">Total</p>
                <p className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold tabular-nums">
                  EGP {total.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Step 5: Delivery Terms */}
            <SectionHeader step={5} title={t('sales.quoteBuilder.steps.delivery')} />
            <DeliveryTerms
              deliveryAddress="Cairo, Egypt"
              totalWeightTons={12}
              leadTimeDays={3}
            />

            {/* Step 6: Payment Terms */}
            <SectionHeader step={6} title={t('sales.quoteBuilder.steps.payment')} />
            <PaymentTerms
              customerCredit={customerCredit}
              isNewCustomer={customerTier === 'new'}
            />

            {/* Step 7: Validity Period */}
            <SectionHeader step={7} title={t('sales.quoteBuilder.steps.validity')} />
            <ValidityPeriod />

            {/* Step 8: Approval -- rendered as component */}
            <SectionHeader step={8} title={t('sales.quoteBuilder.steps.approval')} />
            <div id="approval-section">
              <ApprovalWorkflow
                quoteId={quoteId ?? 'new'}
                marginPercent={subtotal > 0 ? Math.round((1 - (watchedItems ?? []).reduce((s, i) => s + i.supplierCost * i.quantity, 0) / subtotal) * 10000) / 100 : 0}
                totalValue={total}
                customerTier="A"
                thresholds={marginThresholds}
                status={status === 'pending_approval' ? 'pending_approval' : status === 'approved' ? 'approved' : 'draft'}
                onStatusChange={(newStatus) => setStatus(newStatus as QuoteStatus)}
              />
            </div>

            <SectionHeader step={9} title={t('sales.quoteBuilder.steps.preview')} />
            <StepPlaceholder label="Preview Before Sending" />

            <SectionHeader step={10} title={t('sales.quoteBuilder.steps.send')} />
            <StepPlaceholder label="Send to Customer" />
          </FormProvider>
        </div>

        {/* Right sidebar: Margin Control Panel (30% width on desktop) */}
        <div className="hidden w-[30%] min-w-[280px] max-w-[360px] border-s border-black/10 p-4 lg:block dark:border-white/10">
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
