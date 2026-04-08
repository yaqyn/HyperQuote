import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { AnimatePresence, motion } from 'motion/react'
import { ClientOnly } from '../../../lib/client-only'
import { QuoteBuilderHeader } from './QuoteBuilderHeader'
import { LineItemsTable } from './LineItemsTable'
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

const STEP_LABELS = ['Items & Delivery', 'Source & Price', 'Review & Send'] as const

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

function SourcePricesStep({
  items,
  sourcingState,
  onToggleSource,
  onAssignSource,
  onSourcingComplete,
  onSkip,
}: {
  items: { productName: string; quantity: number; unit: string }[]
  sourcingState: ItemSourcingState[]
  onToggleSource: (index: number) => void
  onAssignSource: (index: number, sourceId: string) => void
  onSourcingComplete: () => void
  onSkip: () => void
}) {
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(() => {
    const sorted = [...MOCK_SUPPLIERS_FOR_SOURCING].sort((a, b) => b.score - a.score)
    return new Set(sorted.slice(0, 3).map((s) => s.id))
  })
  const [inquirySent, setInquirySent] = useState(false)
  const [responses, setResponses] = useState<typeof MOCK_RESPONSES | null>(null)
  const [openSourceIndex, setOpenSourceIndex] = useState<number | null>(null)
  const [itemSearchQuery, setItemSearchQuery] = useState('')

  const hasUnassigned = sourcingState.some((s) => !s.sourceId)
  const needsSupplier = sourcingState.some((s) => s.sourceId !== 'warehouse' && s.sourceId !== '')
  const allSourced = !hasUnassigned

  const toggleSupplier = (id: string) => {
    setSelectedSuppliers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSendInquiry = () => {
    setInquirySent(true)
    setTimeout(() => {
      setResponses(MOCK_RESPONSES.filter((r) => selectedSuppliers.has(r.supplierId)))
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Item list with inline source selector */}
      <div className="space-y-2">
        {sourcingState.map((item, index) => {
          const isStock = item.sourceId === 'warehouse'
          const isUnassigned = !item.sourceId
          const sourceName = isUnassigned ? 'Select source' : isStock ? 'Warehouse' : ALL_SUPPLIERS.find((s) => s.id === item.sourceId)?.name ?? 'Select source'
          const isOpen = openSourceIndex === index
          const relevant = searchSuppliers('', item.productName).slice(0, 4)

          return (
            <div key={item.productName} className={`rounded-lg border transition-all ${
              isUnassigned ? 'border-red-500/20' : 'border-black/[0.06] dark:border-white/[0.06]'
            }`}>
              {/* Item row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Source badge — clickable to open selector */}
                <button
                  type="button"
                  onClick={() => setOpenSourceIndex(isOpen ? null : index)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium outline-none transition-all ${
                    isUnassigned
                      ? 'border border-dashed border-black/20 text-black/40 hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] dark:border-white/20 dark:text-white/40'
                      : isStock
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15'
                        : 'bg-black/[0.05] text-black/50 hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-white/50 dark:hover:bg-white/[0.1]'
                  }`}
                >
                  {sourceName} ▾
                </button>

                {/* Item name */}
                <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-[var(--color-text)]">{item.productName}</span>

                {/* Quantity */}
                <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-black/50 dark:text-white/50">
                  {item.quantity} {item.unit}
                </span>

                {/* Stock hint */}
                {item.stockAvailable > 0 && (
                  <span className={`shrink-0 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums ${
                    item.stockAvailable >= item.quantity
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {item.stockAvailable} in stock
                  </span>
                )}
              </div>

              {/* Source selector dropdown — inline */}
              {isOpen && (() => {
                // Compute filtered results based on search
                const allResults = searchSuppliers(itemSearchQuery, item.productName)
                const hasSearch = itemSearchQuery.trim().length > 0

                return (
                  <div className="border-t border-black/[0.04] px-4 py-2.5 dark:border-white/[0.04]">
                    {/* Search — primary, always at top */}
                    <div className="mb-2">
                      <input
                        type="text"
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') { setOpenSourceIndex(null); setItemSearchQuery('') } }}
                        placeholder="Search suppliers..."
                        autoFocus
                        className="w-full rounded-md bg-black/[0.03] px-3 py-2 text-[12px] outline-none placeholder:text-black/30 focus:ring-1 focus:ring-[var(--color-primary)]/30 dark:bg-white/[0.04] dark:placeholder:text-white/30"
                      />
                    </div>

                    {/* Warehouse — only if has stock */}
                    {item.stockAvailable > 0 && !hasSearch && (
                      <button
                        type="button"
                        onClick={() => { onAssignSource(index, 'warehouse'); setOpenSourceIndex(null); setItemSearchQuery('') }}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-start transition-colors ${
                          isStock ? 'bg-[var(--color-primary)]/[0.05]' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                        <span className="flex-1 text-[12px] font-medium text-[var(--color-text)]">Warehouse</span>
                        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-green-600 dark:text-green-400">
                          {item.stockAvailable} avail
                        </span>
                      </button>
                    )}

                    {/* Supplier list — recommended when no search, filtered when searching */}
                    {!hasSearch && (
                      <div className="my-1.5 flex items-center gap-2">
                        <div className="h-px flex-1 bg-black/[0.04] dark:bg-white/[0.04]" />
                        <span className="text-[10px] text-black/25 dark:text-white/25">Recommended</span>
                        <div className="h-px flex-1 bg-black/[0.04] dark:bg-white/[0.04]" />
                      </div>
                    )}

                    <div className="space-y-0.5">
                      {(hasSearch ? allResults : relevant).slice(0, hasSearch ? 8 : 4).map((sup) => (
                        <button
                          key={sup.id}
                          type="button"
                          onClick={() => { onAssignSource(index, sup.id); setOpenSourceIndex(null); setItemSearchQuery('') }}
                          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-start transition-colors ${
                            item.sourceId === sup.id ? 'bg-black/[0.04] dark:bg-white/[0.04]' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-black/20 dark:bg-white/20" />
                          <span className="flex-1 text-[12px] font-medium text-[var(--color-text)]">{sup.name}</span>
                          <span className="text-[10px] text-black/30 dark:text-white/30">{sup.tier}</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/30 dark:text-white/30">{sup.score}</span>
                        </button>
                      ))}
                    </div>

                    {hasSearch && allResults.length === 0 && (
                      <p className="px-3 py-2 text-[12px] text-black/30 dark:text-white/30">No suppliers found</p>
                    )}
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>

      {/* Validation hint — no Next button, parent handles it */}
      {hasUnassigned && (
        <div className="rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/[0.04] px-4 py-2.5">
          <p className="text-[13px] text-[var(--color-primary)]">
            {sourcingState.filter((s) => !s.sourceId).length} item{sourcingState.filter((s) => !s.sourceId).length !== 1 ? 's' : ''} still need a source assigned
          </p>
        </div>
      )}
    </div>
  )
}

// --- Main view ---

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
  const [deliveryAddress, setDeliveryAddress] = useState(defaultDeliveryAddress)
  const [previewOpen, setPreviewOpen] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [sourcingDone, setSourcingDone] = useState(false)

  // Sourcing state — built from line items + inventory
  const [sourcingState, setSourcingState] = useState<ItemSourcingState[]>([])

  // Rebuild sourcing state when items change and we enter step 2
  useEffect(() => {
    if (currentStep === 2 && sourcingState.length === 0) {
      const items = methods.getValues('lineItems') ?? []
      setSourcingState(
        items.map((item) => {
          const inv = MOCK_INVENTORY[item.productName]
          return {
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit || 'unit',
            sourceId: '', // unassigned — user must choose
            stockAvailable: inv?.available ?? 0,
            stockWac: inv?.wac ?? 0,
          }
        }),
      )
    }
  }, [currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!values.lineItems || values.lineItems.length === 0) errors.push('Add at least one item to continue')
      if (!deliveryAddress.trim()) errors.push('Please enter a delivery address')
      if (!values.deliveryDate) errors.push('Please select a delivery date')
    }

    if (step === 2) {
      const unassigned = sourcingState.filter((s) => !s.sourceId).length
      if (unassigned > 0) errors.push(`${unassigned} item${unassigned !== 1 ? 's' : ''} still need a source`)
      if (!values.paymentTerms) errors.push('Please select payment terms')
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
  const blendedMargin = subtotal > 0
    ? Math.round((1 - (watchedItems ?? []).reduce((s, i) => s + i.supplierCost * i.quantity, 0) / subtotal) * 10000) / 100
    : 0

  const springTransition = { type: 'spring' as const, stiffness: 200, damping: 20 }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
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

      {/* Step indicator */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.06]">
        <StepIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
          sourcingDone={sourcingDone}
          onStepClick={goToStep}
        />
      </div>

      {/* Step content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content — scrollable */}
        <div className="flex-1 overflow-y-auto px-8 pb-16">
          <FormProvider {...methods}>
            <AnimatePresence mode="wait">
              {/* ==================== STEP 1: Confirm Items & Delivery ==================== */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2, ease: 'easeIn' } }}
                  transition={springTransition}
                >
                  {/* Customer info bar */}
                  <div className="flex flex-wrap items-center gap-4 border-b border-black/[0.06] pb-4 pt-5 dark:border-white/[0.06]">
                    <span className="text-[15px] font-semibold">{customerName}</span>
                    <span className="rounded-full border border-black/[0.08] px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-medium tabular-nums dark:border-white/[0.08]">
                      Tier {customerTier}
                    </span>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
                      RFQ {rfqReference}
                    </span>
                    <span className="mx-1 text-black/10 dark:text-white/10">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        // Server-initiated call — number never exposed to frontend
                        // TODO: Replace with server function that initiates VoIP/SIP call
                        // For now: use a server-side redirect endpoint
                        window.open(`/api/call/${rfqId}`, '_blank')
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-[12px] font-medium text-[var(--color-primary)] outline-none transition-all hover:bg-[var(--color-primary)]/15 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M6.5 1.5h-3a1 1 0 0 0-1 1v1a10 10 0 0 0 10 10h1a1 1 0 0 0 1-1v-3l-3-1.5-1.5 2a7 7 0 0 1-4-4l2-1.5L6.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Call Customer
                    </button>
                    <span className="mx-1 text-black/10 dark:text-white/10">|</span>
                    <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-subtle)]">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0">
                        <path d="M7 1.75C4.65 1.75 2.75 3.65 2.75 6c0 3.25 4.25 6.25 4.25 6.25s4.25-3 4.25-6.25c0-2.35-1.9-4.25-4.25-4.25Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="7" cy="6" r="1.25" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="min-w-[200px] flex-1 bg-transparent text-[12px] text-[var(--color-text-subtle)] outline-none border-b border-transparent transition-colors focus:border-black/[0.12] focus:text-[var(--color-text)] dark:focus:border-white/[0.12]"
                      />
                    </span>
                  </div>

                  {/* Line items */}
                  <div className="pt-6">
                    <h2 className="text-[16px] font-semibold text-[var(--color-text)]">Materials</h2>
                    <p className="mt-0.5 text-[12px] text-[var(--color-text-subtle)]">
                      Add line items, adjust pricing and margins inline.
                    </p>
                    <div className="mt-4">
                      <LineItemsTable marginThresholds={marginThresholds} />
                    </div>
                  </div>

                  {/* Delivery */}
                  <div className="pt-8">
                    <h2 className="text-[16px] font-semibold text-[var(--color-text)]">Delivery</h2>
                    <div className="mt-4">
                      <DeliveryTerms
                        deliveryAddress={deliveryAddress}
                        totalWeightTons={12}
                        leadTimeDays={3}
                      />
                    </div>
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
                      Next: Source & Price →
                    </Button>
                  </div>
                </motion.div>
              )}

            {/* ==================== STEP 2: Source & Price ==================== */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2, ease: 'easeIn' } }}
                transition={springTransition}
                className="pt-6"
              >
                {/* Sourcing */}
                <SourcePricesStep
                  items={(watchedItems ?? []).map((item) => ({
                    productName: item.productName,
                    quantity: item.quantity,
                    unit: item.unit || 'unit',
                  }))}
                  sourcingState={sourcingState}
                  onToggleSource={toggleItemSource}
                  onAssignSource={assignItemSource}
                  onSourcingComplete={() => {}}
                  onSkip={() => {}}
                />

                {/* Pricing & Terms — below sourcing */}
                <div className="mt-6 border-t border-black/[0.04] pt-6 dark:border-white/[0.04]">
                {/* Two-column layout: Margins left, Terms right */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Left: Margins */}
                  <div>
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

                  {/* Right: Payment + Validity + Credit */}
                  <div className="space-y-5">
                    <PaymentTerms
                      customerCredit={customerCredit}
                      isNewCustomer={customerTier === 'new'}
                    />
                    <ValidityPeriod />
                    {customerCredit && (
                      <CreditStatusBanner
                        creditLimit={customerCredit.creditLimit}
                        currentExposure={customerCredit.currentExposure}
                        availableCredit={customerCredit.availableCredit}
                      />
                    )}
                  </div>
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
                    onPress={() => tryGoToStep(3)}
                  >
                    Next: Review & Send →
                  </Button>
                </div>
                </div>
              </motion.div>
            )}

            {/* ==================== STEP 3: Review & Send ==================== */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
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

        {/* Right panel — contextual per step, wide screens only */}
        {currentStep === 1 && (
          <div className="hidden w-[40%] min-w-[320px] max-w-[500px] border-s border-black/[0.06] lg:block dark:border-white/[0.06]">
            <ClientOnly fallback={<div className="flex h-full items-center justify-center text-[13px] text-black/40">Loading map...</div>}>
              <DeliveryMap
                address={deliveryAddress}
                onAddressChange={setDeliveryAddress}
              />
            </ClientOnly>
          </div>
        )}
        {currentStep === 2 && sourcingState.length > 0 && (
          <div className="hidden w-[40%] min-w-[320px] max-w-[500px] border-s border-black/[0.06] lg:block dark:border-white/[0.06]">
            <SourcingCanvas
              items={sourcingState}
              allSuppliers={ALL_SUPPLIERS}
              searchSuppliers={searchSuppliers}
              onAssignSource={assignItemSource}
            />
          </div>
        )}
      </div>
    </div>
  )
}
