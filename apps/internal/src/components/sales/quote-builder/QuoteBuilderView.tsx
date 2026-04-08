import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FormProvider, useForm, useWatch, useFieldArray } from 'react-hook-form'
import { AnimatePresence, motion } from 'motion/react'
import { ClientOnly } from '../../../lib/client-only'
import { QuoteBuilderHeader } from './QuoteBuilderHeader'
import { LineItemsTable } from './LineItemsTable'
import { ProductSearchMenu } from './ProductSearchMenu'
import { MarginControlPanel } from './MarginControlPanel'
import { ApprovalWorkflow } from './ApprovalWorkflow'
import { DeliveryTerms } from './DeliveryTerms'
import { DeliveryMap } from './DeliveryMap'
import { SourcingCanvas } from './SourcingCanvas'
import { PaymentTerms } from './PaymentTerms'
import { ValidityPeriod } from './ValidityPeriod'
import { QuotePreviewModal } from './QuotePreviewModal'
import { SendQuote } from './SendQuote'
import { CreditStatusBanner } from '../shared/CreditStatusBanner'
import { Button } from '../../ui/Button'
import { getQuoteBuilderData, saveQuoteDraft } from '../../../lib/server/sales-quotes'
import type { QuoteFormValues } from './LineItemsTable'
import type { MarginThresholds, FreshnessIndicator, QuoteStatus } from '../../../types/sales'

interface QuoteBuilderViewProps {
  quoteId?: string
  rfqId: string
  onBack?: () => void
}

// --- Mock supplier database (in production: server query with search) ---

interface SupplierRecord {
  id: string
  name: string
  tier: string
  score: number
  categories: string[] // what they supply
}

const ALL_SUPPLIERS: SupplierRecord[] = [
  { id: 'sup-001', name: 'Cairo Steel Co.', tier: 'Preferred', score: 92, categories: ['steel', 'rebar', 'metal'] },
  { id: 'sup-002', name: 'Delta Cement Group', tier: 'Approved', score: 90, categories: ['cement', 'concrete'] },
  { id: 'sup-003', name: 'Alexandria Rebar Factory', tier: 'Approved', score: 85, categories: ['steel', 'rebar'] },
  { id: 'sup-004', name: 'Nile Building Supplies', tier: 'Conditional', score: 72, categories: ['wood', 'plywood', 'pipes', 'blocks'] },
  { id: 'sup-005', name: 'Port Said Iron Works', tier: 'Preferred', score: 95, categories: ['steel', 'rebar', 'metal'] },
  { id: 'sup-006', name: 'Suez Cement Industries', tier: 'Approved', score: 88, categories: ['cement', 'concrete', 'blocks'] },
  { id: 'sup-007', name: 'Upper Egypt Steel', tier: 'Conditional', score: 68, categories: ['steel', 'rebar'] },
  { id: 'sup-008', name: 'Sinai White Cement', tier: 'Approved', score: 80, categories: ['cement'] },
  { id: 'sup-009', name: 'Aswan Quarry Materials', tier: 'New', score: 58, categories: ['aggregates', 'blocks', 'concrete'] },
  { id: 'sup-010', name: 'Mansoura Wood Trading', tier: 'Approved', score: 82, categories: ['wood', 'plywood', 'shuttering'] },
  { id: 'sup-011', name: 'Tanta Pipes & Fittings', tier: 'Preferred', score: 91, categories: ['pipes', 'pvc', 'plumbing'] },
  { id: 'sup-012', name: 'Giza Building Materials', tier: 'Conditional', score: 74, categories: ['cement', 'blocks', 'aggregates'] },
  { id: 'sup-013', name: 'Red Sea Timber', tier: 'Approved', score: 83, categories: ['wood', 'plywood', 'shuttering'] },
  { id: 'sup-014', name: 'Helwan Steel Mills', tier: 'Preferred', score: 93, categories: ['steel', 'rebar', 'metal'] },
  { id: 'sup-015', name: 'Ismailia Concrete Works', tier: 'Approved', score: 79, categories: ['concrete', 'blocks', 'cement'] },
]

// Search suppliers — returns relevant ones first, then name matches
function searchSuppliers(query: string, itemName?: string): SupplierRecord[] {
  const q = query.toLowerCase()
  const itemLower = (itemName ?? '').toLowerCase()

  // Determine item category keywords
  const categoryKeywords: string[] = []
  if (itemLower.includes('steel') || itemLower.includes('rebar')) categoryKeywords.push('steel', 'rebar')
  if (itemLower.includes('cement')) categoryKeywords.push('cement')
  if (itemLower.includes('concrete')) categoryKeywords.push('concrete')
  if (itemLower.includes('wood') || itemLower.includes('plywood') || itemLower.includes('shuttering')) categoryKeywords.push('wood', 'plywood', 'shuttering')
  if (itemLower.includes('pipe') || itemLower.includes('pvc')) categoryKeywords.push('pipes', 'pvc')
  if (itemLower.includes('block')) categoryKeywords.push('blocks')

  let results = ALL_SUPPLIERS

  // Filter by search query
  if (q) {
    results = results.filter((s) => s.name.toLowerCase().includes(q) || s.categories.some((c) => c.includes(q)))
  }

  // Sort: relevant categories first, then by score
  return [...results].sort((a, b) => {
    const aRelevant = categoryKeywords.some((k) => a.categories.includes(k)) ? 1 : 0
    const bRelevant = categoryKeywords.some((k) => b.categories.includes(k)) ? 1 : 0
    if (aRelevant !== bRelevant) return bRelevant - aRelevant
    return b.score - a.score
  })
}

const MOCK_RESPONSES: { supplierId: string; status: 'responded' | 'waiting'; pricePerUnit?: number }[] = [
  { supplierId: 'sup-001', status: 'responded', pricePerUnit: 28500 },
  { supplierId: 'sup-005', status: 'responded', pricePerUnit: 29200 },
  { supplierId: 'sup-002', status: 'waiting' },
]

// Keep legacy reference for left panel source name resolution
const MOCK_SUPPLIERS_FOR_SOURCING = ALL_SUPPLIERS

// --- Customer mock data ---

// Customer phone number is NEVER exposed to the frontend.
// Calls are initiated via server-side endpoint: /api/call/:rfqId
// The server resolves the number, initiates VoIP/SIP, and connects the employee.
const defaultDeliveryAddress = '15 \u0634\u0627\u0631\u0639 \u0627\u0644\u062C\u0632\u064A\u0631\u0629\u060C \u0627\u0644\u0645\u0639\u0627\u062F\u064A\u060C \u0627\u0644\u0642\u0627\u0647\u0631\u0629'

// --- Step indicator ---

const STEP_LABELS = ['Build Quote', 'Review & Send'] as const

function StepIndicator({
  currentStep,
  completedSteps,
  sourcingDone,
  onStepClick,
}: {
  currentStep: number
  completedSteps: Set<number>
  sourcingDone: boolean
  onStepClick: (step: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-0 px-8 py-4">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const isCompleted = completedSteps.has(step)
        const isCurrent = currentStep === step
        const isLocked = step === 3 && !completedSteps.has(2) && !isCurrent
        const isClickable = isCompleted && !isCurrent

        return (
          <div key={step} className="flex items-center">
            {i > 0 && (
              <div
                className={`mx-2 h-px w-8 ${
                  completedSteps.has(step) || completedSteps.has(i)
                    ? 'bg-[var(--color-primary)]'
                    : 'bg-black/[0.08] dark:bg-white/[0.08]'
                }`}
              />
            )}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step)}
              disabled={isLocked || (!isClickable && !isCurrent)}
              className={`flex items-center gap-2 ${
                isClickable ? 'cursor-pointer' : isLocked ? 'cursor-not-allowed' : 'cursor-default'
              }`}
            >
              {/* Circle */}
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-[var(--color-primary)] text-white'
                    : isCompleted
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : isLocked
                        ? 'bg-black/[0.04] text-black/20 dark:bg-white/[0.04] dark:text-white/20'
                        : 'bg-black/[0.06] text-black/40 dark:bg-white/[0.06] dark:text-white/40'
                }`}
              >
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3.5 7l2.5 2.5L10.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              {/* Label */}
              <span
                className={`whitespace-nowrap text-[12px] font-medium transition-colors ${
                  isCurrent
                    ? 'text-[var(--color-primary)]'
                    : isCompleted
                      ? 'text-[var(--color-text)]'
                      : isLocked
                        ? 'text-black/20 dark:text-white/20'
                        : 'text-black/40 dark:text-white/40'
                }`}
              >
                {label}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// --- Step 2: Source Items (Inventory + Suppliers) ---

// Mock inventory data
const MOCK_INVENTORY: Record<string, { available: number; wac: number; location: string }> = {
  'Steel Rebar 16mm': { available: 150, wac: 27000, location: 'Base A' },
  'Steel Rebar 12mm': { available: 0, wac: 0, location: '' },
  'Steel Rebar 10mm': { available: 100, wac: 22000, location: 'Base A' },
}

interface ItemSourcingState {
  productName: string
  quantity: number
  unit: string
  sourceId: string // 'warehouse' or supplier ID like 'sup-001'
  stockAvailable: number
  stockWac: number
}

// --- Main view ---

export function QuoteBuilderView({ quoteId, rfqId, onBack }: QuoteBuilderViewProps) {
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
  const [deliveryAddress, setDeliveryAddress] = useState(defaultDeliveryAddress)
  const [previewOpen, setPreviewOpen] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [sourcingDone, setSourcingDone] = useState(false)
  const [tableSourceOpen, setTableSourceOpen] = useState<number | null>(null)
  const [tableSourceSearch, setTableSourceSearch] = useState('')
  const [rightPanel, setRightPanel] = useState<'map' | 'canvas'>('map')

  // Sourcing state — built from line items + inventory
  const [sourcingState, setSourcingState] = useState<ItemSourcingState[]>([])

  // Compute totals from watched items (useWatch, NOT watch)
  const watchedItems = useWatch({ control: methods.control, name: 'lineItems' })
  const subtotal = watchedItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) ?? 0
  const vatAmount = Math.round(subtotal * 14) / 100
  const total = subtotal + vatAmount

  // Build sourcing state when items load/change
  const itemCount = watchedItems?.length ?? 0
  useEffect(() => {
    if (itemCount === 0) return
    // Rebuild if item count changed (items loaded or added/removed)
    if (sourcingState.length !== itemCount) {
      const items = watchedItems ?? []
      setSourcingState(
        items.map((item) => {
          const inv = MOCK_INVENTORY[item.productName]
          // Preserve existing sourceId if available
          const existing = sourcingState.find((s) => s.productName === item.productName)
          return {
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit || 'unit',
            sourceId: existing?.sourceId ?? '',
            stockAvailable: inv?.available ?? 0,
            stockWac: inv?.wac ?? 0,
          }
        }),
      )
    }
  }, [itemCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // Assign item to a specific source
  const assignItemSource = (itemIndex: number, sourceId: string) => {
    setSourcingState((prev) =>
      prev.map((s, i) => (i === itemIndex ? { ...s, sourceId } : s)),
    )
  }

  // Legacy toggle for left panel (cycles: warehouse → sup-001 → sup-002 → sup-005 → warehouse)
  const SOURCE_IDS = ['warehouse', 'sup-001', 'sup-002', 'sup-005']
  const toggleItemSource = (index: number) => {
    setSourcingState((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s
        const currentIdx = SOURCE_IDS.indexOf(s.sourceId)
        const nextIdx = (currentIdx + 1) % SOURCE_IDS.length
        return { ...s, sourceId: SOURCE_IDS[nextIdx] }
      }),
    )
  }
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const markStepCompleted = (step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]))
  }

  const goToStep = (step: number) => {
    markStepCompleted(currentStep)
    setValidationErrors([])
    setCurrentStep(step)
  }

  // Step validation
  const validateStep = (step: number): string[] => {
    const errors: string[] = []
    const values = methods.getValues()

    if (step === 1) {
      if (!values.lineItems || values.lineItems.length === 0) errors.push('Add at least one item')
      if (!deliveryAddress.trim()) errors.push('Please enter a delivery address')
      if (!values.deliveryDate) errors.push('Please select a delivery date')
      const unassigned = sourcingState.filter((s) => !s.sourceId).length
      if (unassigned > 0) errors.push(`${unassigned} item${unassigned !== 1 ? 's' : ''} still need a source`)
      const hasZeroPrice = (values.lineItems ?? []).some((item) => !item.sellPrice || item.sellPrice <= 0)
      if (hasZeroPrice) errors.push('Some items are missing a sell price')
    }

    return errors
  }

  const tryGoToStep = (nextStep: number) => {
    const errors = validateStep(currentStep)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    goToStep(nextStep)
  }

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

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({ control: methods.control, name: 'lineItems' })
  const [searchOpen, setSearchOpen] = useState(false)

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

  const blendedMargin = subtotal > 0
    ? Math.round((1 - (watchedItems ?? []).reduce((s, i) => s + i.supplierCost * i.quantity, 0) / subtotal) * 10000) / 100
    : 0

  const springTransition = { type: 'spring' as const, stiffness: 200, damping: 20 }

  return (
    <div className="flex h-full flex-col">
      {/* Compact header — name+call centered, meta on edges */}
      <div className="flex items-center border-b border-black/[0.06] px-5 py-2 dark:border-white/[0.06]">
        {/* Left — back + subtle meta */}
        <div className="flex items-center gap-2">
          {onBack && (
            <button type="button" onClick={onBack} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-black/40 outline-none transition-colors hover:bg-black/[0.04] hover:text-black/70 dark:text-white/40 dark:hover:bg-white/[0.04] dark:hover:text-white/70">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="rtl:rotate-180"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              RFQs
            </button>
          )}
          <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/25 dark:text-white/25">
            {quoteNumber} · v{version} · {status === 'draft' ? 'Draft' : status}
          </span>
          {lastSavedAt && (
            <span className="text-[10px] text-black/20 dark:text-white/20">Saved {Math.round((Date.now() - lastSavedAt.getTime()) / 1000)}s</span>
          )}
        </div>
        {/* Center — customer + call */}
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-[14px] font-semibold">{customerName}</span>
          <button
            type="button"
            onClick={() => window.open(`/api/call/${rfqId}`, '_blank')}
            className="flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M6.5 1.5h-3a1 1 0 0 0-1 1v1a10 10 0 0 0 10 10h1a1 1 0 0 0 1-1v-3l-3-1.5-1.5 2a7 7 0 0 1-4-4l2-1.5L6.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Call
          </button>
        </div>
        {/* Right — save + preview */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleAutoSave} className="text-black/30 hover:text-black/60 dark:text-white/30 dark:hover:text-white/60 outline-none">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 5.5V13H3V3h7.5L13 5.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M5.5 3v3h4V3" stroke="currentColor" strokeWidth="1" /></svg>
          </button>
          <button type="button" onClick={() => setPreviewOpen(true)} className="text-black/30 hover:text-black/60 dark:text-white/30 dark:hover:text-white/60 outline-none">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" /><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1" /></svg>
          </button>
        </div>
      </div>

      {/* Step content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content — scrollable */}
        <div className="flex-1 overflow-y-auto px-8 pb-16">
          <FormProvider {...methods}>
            <AnimatePresence mode="wait">
              {/* ==================== STEP 1: Build Quote ==================== */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2, ease: 'easeIn' } }}
                  transition={springTransition}
                >
                {/* Unified source + pricing table */}
                <div className="mt-6 overflow-visible ps-2">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                        <th className="py-2.5 pe-3 text-start text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">Source</th>
                        <th className="py-2.5 px-3 text-start text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">Item</th>
                        <th className="py-2.5 px-3 text-end text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">Qty</th>
                        <th className="py-2.5 px-3 text-end text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">Cost</th>
                        <th className="py-2.5 px-3 text-end text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">Margin</th>
                        <th className="py-2.5 px-3 text-end text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">Price</th>
                        <th className="py-2.5 px-3 text-end text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">Total</th>
                        <th className="w-8 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {(watchedItems ?? []).map((item, i) => {
                        const sourcing = sourcingState[i]
                        const isStock = sourcing?.sourceId === 'warehouse'
                        const isUnassigned = !sourcing?.sourceId
                        const sourceName = isUnassigned ? 'Select' : isStock ? 'Warehouse' : ALL_SUPPLIERS.find((s) => s.id === sourcing?.sourceId)?.name?.split(' ')[0] ?? 'Supplier'

                        return (
                          <tr key={item.id || i} className={`border-b border-black/[0.03] dark:border-white/[0.03] transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01] ${isUnassigned ? 'bg-red-500/[0.02]' : ''}`}>
                            {/* Source — small badge */}
                            <td className="py-4 pe-3">
                              <button
                                ref={(el) => { if (el && tableSourceOpen === i) { const r = el.getBoundingClientRect(); (window as any).__srcBtnRect = { top: r.bottom + 4, left: r.left } } }}
                                type="button"
                                onClick={() => { setTableSourceOpen(tableSourceOpen === i ? null : i); setTableSourceSearch(''); setRightPanel('canvas') }}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                                  isUnassigned
                                    ? 'border border-dashed border-black/20 text-black/40 hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] dark:border-white/20 dark:text-white/40'
                                    : isStock
                                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                      : 'bg-black/[0.04] text-black/50 dark:bg-white/[0.06] dark:text-white/50'
                                }`}
                              >
                                {sourceName} ▾
                              </button>
                              {tableSourceOpen === i && createPortal(
                                <div
                                  className="fixed z-[9999] w-72 rounded-xl border border-black/[0.06] bg-white p-2.5 shadow-2xl dark:border-white/[0.06] dark:bg-black"
                                  style={{ top: (window as any).__srcBtnRect?.top ?? 0, left: (window as any).__srcBtnRect?.left ?? 0 }}
                                >
                                  <input
                                    type="text"
                                    value={tableSourceSearch}
                                    onChange={(e) => setTableSourceSearch(e.target.value)}
                                    placeholder="Search..."
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Escape') setTableSourceOpen(null) }}
                                    className="mb-1.5 w-full rounded-md bg-black/[0.03] px-2.5 py-1.5 text-[12px] outline-none placeholder:text-black/30 focus:ring-1 focus:ring-[var(--color-primary)]/30 dark:bg-white/[0.04]"
                                  />
                                  {sourcing?.stockAvailable > 0 && !tableSourceSearch && (
                                    <button type="button" onClick={() => { assignItemSource(i, 'warehouse'); setTableSourceOpen(null) }}
                                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-[12px] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                                      <span className="flex-1 font-medium">Warehouse</span>
                                      <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-green-600">{sourcing.stockAvailable}</span>
                                    </button>
                                  )}
                                  {searchSuppliers(tableSourceSearch, item.productName).slice(0, 6).map((sup) => (
                                    <button key={sup.id} type="button" onClick={() => { assignItemSource(i, sup.id); setTableSourceOpen(null) }}
                                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-[12px] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${sourcing?.sourceId === sup.id ? 'bg-black/[0.03] dark:bg-white/[0.03]' : ''}`}>
                                      <span className="h-1.5 w-1.5 rounded-full bg-black/20 dark:bg-white/20" />
                                      <span className="flex-1">{sup.name}</span>
                                      <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/30 dark:text-white/30">{sup.score}</span>
                                    </button>
                                  ))}
                                </div>,
                                document.body
                              )}
                            </td>
                            {/* Item — prominent, clickable */}
                            <td className="py-4 px-3">
                              <button
                                type="button"
                                onClick={() => { setSearchOpen(true); (window as any).__replaceItemIndex = i }}
                                className="text-start text-[14px] font-semibold text-[var(--color-text)] outline-none hover:text-[var(--color-primary)] transition-colors"
                              >
                                {item.productName}
                              </button>
                              {item.specification && (
                                <div className="mt-0.5 text-[11px] text-black/30 dark:text-white/30">{item.specification}</div>
                              )}
                            </td>
                            {/* Qty — fixed, subtle */}
                            <td className="py-4 px-3 text-end font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-black/40 dark:text-white/40">
                              {item.quantity}
                            </td>
                            {/* Cost — fixed from DB, subtle */}
                            <td className="py-4 px-3 text-end font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-black/40 dark:text-white/40">
                              {item.supplierCost ? item.supplierCost.toLocaleString('en-EG') : '—'}
                            </td>
                            {/* Margin — editable, prominent */}
                            <td className="py-4 px-3 text-end">
                              <input
                                type="number"
                                value={item.marginPercent || ''}
                                onChange={(e) => {
                                  const margin = Number(e.target.value) || 0
                                  const cost = item.supplierCost || 0
                                  const price = cost > 0 ? Math.round((cost / (1 - margin / 100)) * 100) / 100 : 0
                                  methods.setValue(`lineItems.${i}.marginPercent`, margin)
                                  methods.setValue(`lineItems.${i}.sellPrice`, price)
                                  methods.setValue(`lineItems.${i}.lineTotal`, Math.round(price * item.quantity * 100) / 100)
                                }}
                                className="w-14 bg-transparent text-end font-[family-name:var(--font-geist-mono)] text-[14px] font-medium tabular-nums text-[var(--color-text)] outline-none border-b border-black/[0.06] focus:border-[var(--color-primary)]/40 dark:border-white/[0.06]"
                                placeholder="18"
                              />
                              <span className="ms-0.5 text-[11px] text-black/30 dark:text-white/30">%</span>
                            </td>
                            {/* Price — editable, prominent */}
                            <td className="py-4 px-3 text-end">
                              <input
                                type="number"
                                value={item.sellPrice || ''}
                                onChange={(e) => {
                                  const price = Number(e.target.value) || 0
                                  const cost = item.supplierCost || 0
                                  const margin = cost > 0 && price > 0 ? Math.round((1 - cost / price) * 10000) / 100 : 0
                                  methods.setValue(`lineItems.${i}.sellPrice`, price)
                                  methods.setValue(`lineItems.${i}.marginPercent`, margin)
                                  methods.setValue(`lineItems.${i}.lineTotal`, Math.round(price * item.quantity * 100) / 100)
                                }}
                                className="w-24 bg-transparent text-end font-[family-name:var(--font-geist-mono)] text-[14px] font-medium tabular-nums text-[var(--color-text)] outline-none border-b border-black/[0.06] focus:border-[var(--color-primary)]/40 dark:border-white/[0.06]"
                                placeholder="0"
                              />
                            </td>
                            {/* Total — bold, largest */}
                            <td className="py-4 px-3 text-end font-[family-name:var(--font-geist-mono)] text-[15px] font-bold tabular-nums text-[var(--color-text)]">
                              {(item.lineTotal || 0).toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                            </td>
                            {/* Remove */}
                            <td className="py-4 text-center">
                              <button type="button" onClick={() => removeItem(i)}
                                className="text-[14px] text-black/15 outline-none hover:text-black/40 dark:text-white/15 dark:hover:text-white/40 transition-colors">×</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add item */}
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-primary)] outline-none hover:opacity-70"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  Add item
                </button>

                <ProductSearchMenu
                  isOpen={searchOpen}
                  onClose={() => setSearchOpen(false)}
                  onAddProduct={(product, quantity) => {
                    const margin = 18
                    const sellPrice = Math.round((product.supplierCost / (1 - margin / 100)) * 100) / 100
                    const newItem = {
                      id: product.id,
                      productName: product.name,
                      specification: product.specification,
                      quantity,
                      unit: product.unit,
                      supplierCost: product.supplierCost,
                      marginPercent: margin,
                      sellPrice,
                      lineTotal: Math.round(sellPrice * quantity * 100) / 100,
                      freshnessIndicator: product.freshness,
                      supplierName: product.supplierName,
                    }
                    const replaceIdx = (window as any).__replaceItemIndex
                    if (replaceIdx !== undefined && replaceIdx !== null) {
                      // Replace existing item
                      const keys = Object.keys(newItem) as (keyof typeof newItem)[]
                      keys.forEach((key) => methods.setValue(`lineItems.${replaceIdx}.${key}`, newItem[key] as any))
                      ;(window as any).__replaceItemIndex = null
                    } else {
                      appendItem(newItem)
                    }
                    setSearchOpen(false)
                  }}
                />

                {/* Delivery */}
                <div className="mt-6 border-t border-black/[0.04] pt-5 dark:border-white/[0.04]">
                  <h3 className="mb-3 text-[13px] font-semibold text-[var(--color-text)]">Delivery</h3>
                  <div className="mb-3 flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0 text-black/40 dark:text-white/40"><path d="M7 1.75C4.65 1.75 2.75 3.65 2.75 6c0 3.25 4.25 6.25 4.25 6.25s4.25-3 4.25-6.25c0-2.35-1.9-4.25-4.25-4.25Z" stroke="currentColor" strokeWidth="1" /><circle cx="7" cy="6" r="1.25" stroke="currentColor" strokeWidth="1" /></svg>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      onFocus={() => setRightPanel('map')}
                      className="flex-1 bg-transparent text-[13px] text-[var(--color-text)] outline-none border-b border-black/[0.04] focus:border-[var(--color-primary)]/30 dark:border-white/[0.04]"
                    />
                  </div>
                  <DeliveryTerms
                    deliveryAddress={deliveryAddress}
                    totalWeightTons={12}
                    leadTimeDays={3}
                  />
                </div>

                {/* Notes */}
                <div className="mt-4 flex gap-6 text-[12px] text-black/40 dark:text-white/40">
                  <span>Payment via bank transfer or cash</span>
                  <span>Valid for <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">{methods.getValues('validityDays') ?? 14}</span> days</span>
                </div>

                {/* Totals */}
                <div className="mt-4 flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                  <span className="text-[12px] text-black/40 dark:text-white/40">
                    Subtotal <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">EGP {subtotal.toLocaleString('en-EG', { minimumFractionDigits: 2 })}</span>
                  </span>
                  <span className="text-[12px] text-black/40 dark:text-white/40">
                    VAT <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{vatAmount.toLocaleString('en-EG', { minimumFractionDigits: 2 })}</span>
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums">
                    EGP {total.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Validation errors */}
                {validationErrors.length > 0 && (
                  <div className="mt-6 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/[0.04] px-4 py-3">
                    {validationErrors.map((err) => (
                      <p key={err} className="text-[13px] text-[var(--color-primary)]">
                        {err}
                      </p>
                    ))}
                  </div>
                )}

                {/* Next button */}
                <div className="pt-6">
                  <Button
                    variant="primary"
                    className="w-full py-3 text-[14px]"
                    onPress={() => tryGoToStep(2)}
                  >
                    Next: Review & Send →
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ==================== STEP 2: Review & Send ==================== */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2, ease: 'easeIn' } }}
                transition={springTransition}
                className="pt-6"
              >
                {/* Approval */}
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--color-text)]">Approval</h2>
                  <div className="mt-4">
                    {status === 'draft' && (
                      <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/[0.04] px-4 py-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M7 3v4M7 10h.01" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </div>
                        <p className="text-[13px] font-medium text-[var(--color-primary)]">
                          Approval Required -- Submit for review before sending
                        </p>
                      </div>
                    )}
                    <ApprovalWorkflow
                      quoteId={quoteId ?? 'new'}
                      marginPercent={blendedMargin}
                      totalValue={total}
                      customerTier="A"
                      thresholds={marginThresholds}
                      status={status === 'pending_approval' ? 'pending_approval' : status === 'approved' ? 'approved' : 'draft'}
                      onStatusChange={(newStatus) => setStatus(newStatus as QuoteStatus)}
                    />
                  </div>
                </div>

                {/* Send quote */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springTransition}
                  className={`mt-8 ${
                    status === 'approved'
                      ? 'rounded-xl border-2 border-green-500/20 bg-green-500/[0.03] px-6 py-6'
                      : 'pt-2'
                  }`}
                >
                  {status === 'approved' && (
                    <div className="mb-3 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M3.5 7l2.5 2.5L10.5 5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-[13px] font-semibold text-green-700 dark:text-green-400">
                        Approved -- Ready to send
                      </span>
                    </div>
                  )}
                  <h2 className="text-[16px] font-semibold text-[var(--color-text)]">Send Quote</h2>
                  <div className="mt-4">
                    <SendQuote
                      quoteId={quoteId ?? 'new'}
                      quoteNumber={quoteNumber}
                      customerName={customerName}
                      onSent={() => setStatus('sent')}
                    />
                  </div>
                </motion.div>

                {/* Back button */}
                <div className="pt-8">
                  <Button variant="ghost" onPress={() => goToStep(3)}>
                    &larr; Back to Terms
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview modal (available from any step) */}
          <QuotePreviewModal
            quoteNumber={quoteNumber}
            version={version}
            customerName={customerName}
            validityDays={methods.getValues('validityDays') ?? 14}
            isOpen={previewOpen}
            onOpenChange={setPreviewOpen}
          />
        </FormProvider>
        </div>

        {/* Right panel — toggles map/canvas, Step 1 only, wide screens */}
        {currentStep === 1 && (
          <div className="hidden w-[40%] min-w-[320px] max-w-[500px] border-s border-black/[0.06] lg:flex lg:flex-col dark:border-white/[0.06]">
            {/* Toggle buttons */}
            <div className="flex border-b border-black/[0.04] dark:border-white/[0.04]">
              <button type="button" onClick={() => setRightPanel('map')}
                className={`flex-1 py-2.5 text-center text-[12px] font-medium transition-colors ${rightPanel === 'map' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60'}`}>
                Map
              </button>
              <button type="button" onClick={() => setRightPanel('canvas')}
                className={`flex-1 py-2.5 text-center text-[12px] font-medium transition-colors ${rightPanel === 'canvas' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60'}`}>
                Sourcing
              </button>
            </div>
            {/* Panel content */}
            <div className="flex-1">
              {rightPanel === 'map' ? (
                <ClientOnly fallback={<div className="flex h-full items-center justify-center text-[13px] text-black/40">Loading map...</div>}>
                  <DeliveryMap address={deliveryAddress} onAddressChange={setDeliveryAddress} />
                </ClientOnly>
              ) : (
                <SourcingCanvas items={sourcingState} allSuppliers={ALL_SUPPLIERS} searchSuppliers={searchSuppliers} onAssignSource={assignItemSource} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
