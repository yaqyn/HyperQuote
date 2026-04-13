import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormProvider, useForm, useWatch, useFieldArray } from 'react-hook-form'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { ClientOnly } from '../../../lib/client-only'
import { QuoteBuilderHeader } from './QuoteBuilderHeader'
import { LineItemsTable } from './LineItemsTable'
import { ProductSearchMenu } from './ProductSearchMenu'
import { SourceSearchMenu } from './SourceSearchMenu'
import { MarginControlPanel } from './MarginControlPanel'
import { ApprovalWorkflow } from './ApprovalWorkflow'
import { DeliveryTerms } from './DeliveryTerms'
import { DeliveryMap } from './DeliveryMap'
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
  isNewCustomer?: boolean
  initialCustomerName?: string
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

const STEP_LABELS = ['Customer', 'Build Quote', 'Review & Submit'] as const

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

export function QuoteBuilderView({ quoteId, rfqId, isNewCustomer = false, initialCustomerName, onBack }: QuoteBuilderViewProps) {
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
  const [customerName, setCustomerName] = useState(initialCustomerName ?? 'Al-Nour Construction')
  const [customerTier, setCustomerTier] = useState(isNewCustomer ? 'New' : 'A')
  const [rfqReference] = useState(() => `QR-2026-${rfqId.slice(-5).padStart(5, '0')}`)
  const [deliveryAddress, setDeliveryAddress] = useState(isNewCustomer ? '' : defaultDeliveryAddress)
  const [previewOpen, setPreviewOpen] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Customer form fields (Step 1)
  const [custPhone, setCustPhone] = useState('')
  const [custEmail, setCustEmail] = useState('')
  const [custCompany, setCustCompany] = useState('')

  // Wizard state — start at Step 1 (Customer) for new, Step 2 (Build) for existing RFQ
  const isFromRfq = !isNewCustomer && !rfqId.startsWith('new-')
  const [currentStep, setCurrentStep] = useState(isFromRfq ? 2 : 1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(isFromRfq ? new Set([1]) : new Set())
  const [sourcingDone, setSourcingDone] = useState(false)
  const [tableSourceOpen, setTableSourceOpen] = useState<number | null>(null)
  const [sortBySource, setSortBySource] = useState(false)

  // Sourcing state — built from line items + inventory
  const [sourcingState, setSourcingState] = useState<ItemSourcingState[]>([])

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
      if (!customerName.trim()) errors.push('Customer name is required')
      if (!custPhone.trim() && !isFromRfq) errors.push('Phone number is required')
    }

    if (step === 2) {
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
  const stepTransition = { duration: 0.2, ease: 'easeOut' as const, delay: 0.05 }
  const stepExit = { opacity: 0, transition: { duration: 0 } }

  return (
    <div className="flex h-full flex-col">
      {/* Header — back + meta + save/preview */}
      <div className="flex items-center border-b border-black/[0.06] px-5 py-2 dark:border-white/[0.06]">
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
        <div className="flex-1" />
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
        <div className="flex-1 overflow-y-auto px-8 pb-16" data-module-content>
          <FormProvider {...methods}>
            <AnimatePresence mode="wait">
              {/* ==================== STEP 1: Build Quote ==================== */}
              {/* ==================== STEP 1: Customer ==================== */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={stepExit}
                  transition={stepTransition}
                  className="flex items-start justify-center pt-12"
                >
                  <div className="w-full max-w-lg">
                    {/* Avatar + heading */}
                    <div className="flex items-center gap-4 mb-8">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/[0.08]">
                        <span className="text-[22px] font-bold text-[var(--color-primary)]">
                          {customerName?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-[18px] font-semibold text-[var(--color-text)]">
                          {isFromRfq ? customerName : 'New Customer'}
                        </h2>
                        <p className="text-[12px] text-black/30 dark:text-white/30 mt-0.5">
                          {isFromRfq ? 'Confirm details before quoting' : 'Add customer details to start quoting'}
                        </p>
                      </div>
                    </div>

                    {/* Form grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      {/* Name — full width */}
                      <div className="col-span-2">
                        <label className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-1.5 block">Name</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-transparent text-[15px] font-medium text-[var(--color-text)] outline-none border-b-2 border-black/[0.06] focus:border-[var(--color-primary)] dark:border-white/[0.06] py-2 transition-colors"
                          placeholder="Contact name"
                          autoFocus={!isFromRfq}
                        />
                      </div>
                      {/* Phone */}
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-1.5 block">Phone</label>
                        <input
                          type="tel"
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          className="w-full bg-transparent text-[14px] text-[var(--color-text)] outline-none border-b-2 border-black/[0.06] focus:border-[var(--color-primary)] dark:border-white/[0.06] py-2 font-[family-name:var(--font-geist-mono)] tabular-nums transition-colors"
                          placeholder="+20 1xx xxx xxxx"
                        />
                      </div>
                      {/* Email */}
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-1.5 block">Email</label>
                        <input
                          type="email"
                          value={custEmail}
                          onChange={(e) => setCustEmail(e.target.value)}
                          className="w-full bg-transparent text-[14px] text-[var(--color-text)] outline-none border-b-2 border-black/[0.06] focus:border-[var(--color-primary)] dark:border-white/[0.06] py-2 transition-colors"
                          placeholder="Optional"
                        />
                      </div>
                      {/* Company */}
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-1.5 block">Company</label>
                        <input
                          type="text"
                          value={custCompany}
                          onChange={(e) => setCustCompany(e.target.value)}
                          className="w-full bg-transparent text-[14px] text-[var(--color-text)] outline-none border-b-2 border-black/[0.06] focus:border-[var(--color-primary)] dark:border-white/[0.06] py-2 transition-colors"
                          placeholder="Optional"
                        />
                      </div>
                      {/* Address */}
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-1.5 block">Address</label>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full bg-transparent text-[14px] text-[var(--color-text)] outline-none border-b-2 border-black/[0.06] focus:border-[var(--color-primary)] dark:border-white/[0.06] py-2 transition-colors"
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    {/* Validation errors */}
                    {validationErrors.length > 0 && (
                      <div className="mt-5 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/[0.04] px-4 py-3">
                        {validationErrors.map((err) => (
                          <p key={err} className="text-[13px] text-[var(--color-primary)]">{err}</p>
                        ))}
                      </div>
                    )}

                    {/* Next */}
                    <div className="flex items-center justify-end pt-8">
                      <button
                        type="button"
                        onClick={() => tryGoToStep(2)}
                        className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90"
                      >
                        Build Quote
                        <ArrowRight size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ==================== STEP 2: Build Quote ==================== */}
              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={stepExit}
                  transition={stepTransition}
                >
                {/* Unified source + pricing table */}
                <div className="mt-6 overflow-visible ps-2">
                  {/* Customer + sort toggle bar */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
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
                    <button
                      type="button"
                      onClick={() => setSortBySource((v) => !v)}
                      className={`text-[11px] font-medium transition-colors ${
                        sortBySource ? 'text-[var(--color-primary)]' : 'text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50'
                      }`}
                    >
                      {sortBySource ? '● Grouped by source' : '○ Group by source'}
                    </button>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                        <th className="w-16 py-2.5 text-center text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">Source</th>
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
                      {(() => {
                        const allItems = (watchedItems ?? []).map((item, i) => ({ item, i }))
                        // Sort by source group when toggled
                        const sorted = sortBySource
                          ? [...allItems].sort((a, b) => {
                              const aSource = sourcingState[a.i]?.sourceId ?? ''
                              const bSource = sourcingState[b.i]?.sourceId ?? ''
                              if (aSource === bSource) return 0
                              if (!aSource) return 1  // unassigned last
                              if (!bSource) return -1
                              if (aSource === 'warehouse') return -1
                              if (bSource === 'warehouse') return 1
                              return aSource.localeCompare(bSource)
                            })
                          : allItems

                        let lastSourceId: string | null = null
                        const result = sorted.flatMap(({ item, i }) => {
                        const sourcing = sourcingState[i]
                        const isStock = sourcing?.sourceId === 'warehouse'
                        const isUnassigned = !sourcing?.sourceId
                        const supplier = !isUnassigned && !isStock ? ALL_SUPPLIERS.find((s) => s.id === sourcing?.sourceId) : null
                        const initials = supplier ? supplier.name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('') : ''
                        const currentSourceId = sourcing?.sourceId ?? ''

                        // Group divider at bottom of each group when sorting by source
                        const rows: React.ReactNode[] = []
                        if (sortBySource && currentSourceId !== lastSourceId) {
                          // Insert divider for the *previous* group (not the first)
                          if (lastSourceId !== null && lastSourceId !== '') {
                            const prevLabel = lastSourceId === 'warehouse' ? 'Warehouse' : ALL_SUPPLIERS.find((s) => s.id === lastSourceId)?.name ?? 'Supplier'
                            const prevCount = sorted.filter(({ i: idx }) => (sourcingState[idx]?.sourceId ?? '') === lastSourceId).length
                            rows.push(
                              <tr key={`group-${lastSourceId || 'none'}`}>
                                <td colSpan={8} className="py-1.5">
                                  <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-black/[0.06] dark:bg-white/[0.06]" />
                                    <span className="text-[10px] text-black/30 dark:text-white/30">{prevLabel} <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{prevCount}</span></span>
                                    <div className="h-px flex-1 bg-black/[0.06] dark:bg-white/[0.06]" />
                                  </div>
                                </td>
                              </tr>,
                            )
                          }
                          lastSourceId = currentSourceId
                        }

                        rows.push(
                          <tr key={item.id || i} className="transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                            {/* Source — initials avatar, opens search modal */}
                            <td className="w-16 py-4 text-center">
                              <button
                                type="button"
                                onClick={() => { setTableSourceOpen(i) }}
                                title={supplier?.name}
                                className={`inline-flex items-center justify-center rounded-full transition-all ${
                                  isUnassigned
                                    ? 'h-7 w-7 border border-dashed border-black/15 text-[10px] text-black/30 hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] dark:border-white/15 dark:text-white/30'
                                    : isStock
                                      ? 'h-7 w-7 bg-[var(--color-primary)]/10 text-[10px] font-semibold text-[var(--color-primary)]'
                                      : 'h-7 w-7 bg-black/[0.05] text-[10px] font-semibold text-black/50 dark:bg-white/[0.08] dark:text-white/50'
                                }`}
                              >
                                {isUnassigned ? '?' : isStock ? 'W' : initials}
                              </button>
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
                            {/* Margin — editable with +/- */}
                            <td className="py-4 px-3 text-end">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const margin = Math.max(0, (item.marginPercent || 0) - 1)
                                    const cost = item.supplierCost || 0
                                    const price = cost > 0 ? Math.round((cost / (1 - margin / 100)) * 100) / 100 : 0
                                    methods.setValue(`lineItems.${i}.marginPercent`, margin)
                                    methods.setValue(`lineItems.${i}.sellPrice`, price)
                                    methods.setValue(`lineItems.${i}.lineTotal`, Math.round(price * item.quantity * 100) / 100)
                                  }}
                                  className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-black/20 hover:bg-black/[0.04] hover:text-black/50 dark:text-white/20 dark:hover:bg-white/[0.04] dark:hover:text-white/50 transition-colors"
                                >−</button>
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
                                  className="w-10 bg-transparent text-center font-[family-name:var(--font-geist-mono)] text-[13px] font-medium tabular-nums text-[var(--color-text)] outline-none"
                                  placeholder="18"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const margin = Math.min(99, (item.marginPercent || 0) + 1)
                                    const cost = item.supplierCost || 0
                                    const price = cost > 0 ? Math.round((cost / (1 - margin / 100)) * 100) / 100 : 0
                                    methods.setValue(`lineItems.${i}.marginPercent`, margin)
                                    methods.setValue(`lineItems.${i}.sellPrice`, price)
                                    methods.setValue(`lineItems.${i}.lineTotal`, Math.round(price * item.quantity * 100) / 100)
                                  }}
                                  className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-black/20 hover:bg-black/[0.04] hover:text-black/50 dark:text-white/20 dark:hover:bg-white/[0.04] dark:hover:text-white/50 transition-colors"
                                >+</button>
                                <span className="text-[11px] text-black/30 dark:text-white/30">%</span>
                              </div>
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
                          </tr>,
                        )
                        return rows
                      })
                      // Append divider for the last group
                      if (sortBySource && lastSourceId !== null && lastSourceId !== '') {
                        const lastLabel = lastSourceId === 'warehouse' ? 'Warehouse' : ALL_SUPPLIERS.find((s) => s.id === lastSourceId)?.name ?? 'Supplier'
                        const lastCount = sorted.filter(({ i: idx }) => (sourcingState[idx]?.sourceId ?? '') === lastSourceId).length
                        return [...result, (
                          <tr key={`group-${lastSourceId || 'none'}`}>
                            <td colSpan={8} className="py-1.5">
                              <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-black/[0.06] dark:bg-white/[0.06]" />
                                <span className="text-[10px] text-black/30 dark:text-white/30">{lastLabel} <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{lastCount}</span></span>
                                <div className="h-px flex-1 bg-black/[0.06] dark:bg-white/[0.06]" />
                              </div>
                            </td>
                          </tr>
                        )]
                      }
                      return result
                      })()}
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

                <SourceSearchMenu
                  isOpen={tableSourceOpen !== null}
                  onClose={() => setTableSourceOpen(null)}
                  itemName={tableSourceOpen !== null ? (watchedItems?.[tableSourceOpen]?.productName ?? '') : ''}
                  stockAvailable={tableSourceOpen !== null ? (sourcingState[tableSourceOpen]?.stockAvailable ?? 0) : 0}
                  currentSourceId={tableSourceOpen !== null ? (sourcingState[tableSourceOpen]?.sourceId ?? '') : ''}
                  searchSuppliers={searchSuppliers}
                  onSelect={(sourceId) => { if (tableSourceOpen !== null) assignItemSource(tableSourceOpen, sourceId) }}
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
                      /* map is always visible on the right */
                      className="flex-1 bg-transparent text-[13px] text-[var(--color-text)] outline-none border-b border-black/[0.04] focus:border-[var(--color-primary)]/30 dark:border-white/[0.04]"
                    />
                  </div>
                  <DeliveryTerms
                    deliveryAddress={deliveryAddress}
                    totalWeightTons={12}
                    leadTimeDays={3}
                  />
                </div>

                {/* Footer — terms + totals, single line */}
                <div className="flex items-baseline justify-between border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                  <span className="text-[11px] text-black/30 dark:text-white/30">
                    Bank transfer / cash · Valid <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{methods.getValues('validityDays') ?? 14}d</span> · VAT <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{vatAmount.toLocaleString('en-EG', { minimumFractionDigits: 2 })}</span>
                  </span>
                  <span className="flex items-baseline gap-3">
                    <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/30 dark:text-white/30">
                      {subtotal.toLocaleString('en-EG', { minimumFractionDigits: 2 })} + {vatAmount.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[16px] font-semibold tabular-nums text-[var(--color-text)]">
                      EGP {total.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                    </span>
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

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="flex items-center gap-1.5 text-[12px] text-black/30 hover:text-black/60 dark:text-white/30 dark:hover:text-white/60 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="rtl:rotate-180"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => tryGoToStep(3)}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90"
                  >
                    Review & Submit
                    <ArrowRight size={14} strokeWidth={2} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ==================== STEP 3: Submit for Approval ==================== */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2, ease: 'easeIn' } }}
                transition={springTransition}
                className="pt-6"
              >
                {/* Quote header */}
                <div className="mb-6">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[14px] font-semibold text-[var(--color-text)]">{customerName}</span>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/25 dark:text-white/25">{quoteNumber} · v{version}</span>
                  </div>
                  <p className="text-[11px] text-black/30 dark:text-white/30">
                    {customerTier === 'A' ? 'Tier A' : customerTier} · {rfqReference}
                  </p>
                </div>

                {/* Items table */}
                <div className="border-t border-black/[0.04] pt-4 dark:border-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">Items · {watchedItems?.length ?? 0}</p>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/[0.04] dark:border-white/[0.04]">
                        <th className="py-1.5 text-start text-[10px] uppercase tracking-wider text-black/25 dark:text-white/25">Item</th>
                        <th className="py-1.5 text-start text-[10px] uppercase tracking-wider text-black/25 dark:text-white/25">Source</th>
                        <th className="py-1.5 text-end text-[10px] uppercase tracking-wider text-black/25 dark:text-white/25">Qty</th>
                        <th className="py-1.5 text-end text-[10px] uppercase tracking-wider text-black/25 dark:text-white/25">Cost</th>
                        <th className="py-1.5 text-end text-[10px] uppercase tracking-wider text-black/25 dark:text-white/25">Margin</th>
                        <th className="py-1.5 text-end text-[10px] uppercase tracking-wider text-black/25 dark:text-white/25">Price</th>
                        <th className="py-1.5 text-end text-[10px] uppercase tracking-wider text-black/25 dark:text-white/25">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(watchedItems ?? []).map((item, idx) => {
                        const src = sourcingState[idx]
                        const srcLabel = !src?.sourceId ? '—' : src.sourceId === 'warehouse' ? 'Warehouse' : ALL_SUPPLIERS.find((s) => s.id === src.sourceId)?.name ?? 'Supplier'
                        return (
                          <tr key={item.id || idx}>
                            <td className="py-1.5 text-[12px] text-[var(--color-text)]">{item.productName}</td>
                            <td className="py-1.5 text-[11px] text-black/40 dark:text-white/40">{srcLabel}</td>
                            <td className="py-1.5 text-end font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/40 dark:text-white/40">{item.quantity}</td>
                            <td className="py-1.5 text-end font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/40 dark:text-white/40">{item.supplierCost?.toLocaleString('en-EG') ?? '—'}</td>
                            <td className="py-1.5 text-end font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/40 dark:text-white/40">{item.marginPercent}%</td>
                            <td className="py-1.5 text-end font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text)]">{item.sellPrice?.toLocaleString('en-EG')}</td>
                            <td className="py-1.5 text-end font-[family-name:var(--font-geist-mono)] text-[12px] font-medium tabular-nums text-[var(--color-text)]">{(item.lineTotal || 0).toLocaleString('en-EG', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {/* Totals */}
                  <div className="flex items-baseline justify-between border-t border-black/[0.04] pt-2 mt-1 dark:border-white/[0.04]">
                    <span className="text-[11px] text-black/30 dark:text-white/30">
                      Blended margin <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{blendedMargin}%</span> · VAT <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{vatAmount.toLocaleString('en-EG', { minimumFractionDigits: 2 })}</span>
                    </span>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-[var(--color-text)]">EGP {total.toLocaleString('en-EG', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Delivery */}
                <div className="border-t border-black/[0.04] pt-4 mt-4 dark:border-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">Delivery</p>
                  <div className="space-y-1.5 text-[12px]">
                    <div className="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0 text-black/30 dark:text-white/30"><path d="M7 1.75C4.65 1.75 2.75 3.65 2.75 6c0 3.25 4.25 6.25 4.25 6.25s4.25-3 4.25-6.25c0-2.35-1.9-4.25-4.25-4.25Z" stroke="currentColor" strokeWidth="1" /><circle cx="7" cy="6" r="1.25" stroke="currentColor" strokeWidth="1" /></svg>
                      <span className="text-[var(--color-text)]">{deliveryAddress}</span>
                    </div>
                    {methods.getValues('deliveryDate') && (
                      <div className="flex items-center gap-2 text-black/40 dark:text-white/40">
                        <span className="w-3" />
                        <span>Date: <span className="text-[var(--color-text)]">{methods.getValues('deliveryDate')}</span></span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-black/40 dark:text-white/40">
                      <span className="w-3" />
                      <span>Window: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">{methods.getValues('deliveryWindow') ?? '08:00-17:00'}</span></span>
                    </div>
                    {methods.getValues('specialInstructions') && (
                      <div className="flex items-center gap-2 text-black/40 dark:text-white/40">
                        <span className="w-3" />
                        <span>Notes: <span className="text-[var(--color-text)]">{methods.getValues('specialInstructions')}</span></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms */}
                <div className="border-t border-black/[0.04] pt-4 mt-4 dark:border-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">Terms</p>
                  <div className="flex gap-6 text-[12px] text-black/40 dark:text-white/40">
                    <span>Payment: <span className="text-[var(--color-text)]">Bank transfer / cash</span></span>
                    <span>Valid: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">{methods.getValues('validityDays') ?? 14} days</span></span>
                  </div>
                </div>

                {/* Approval routing */}
                <div className="border-t border-black/[0.04] pt-5 dark:border-white/[0.04]">
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

                {status === 'pending_approval' && (
                  <div className="mt-6 rounded-lg bg-black/[0.02] px-4 py-3 dark:bg-white/[0.02]">
                    <p className="text-[12px] text-black/40 dark:text-white/40">
                      Submitted for approval. Your manager will review and send to the customer.
                    </p>
                  </div>
                )}

                {/* Back */}
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="flex items-center gap-1.5 text-[12px] text-black/30 hover:text-black/60 dark:text-white/30 dark:hover:text-white/60 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="rtl:rotate-180"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Back to Quote
                  </button>
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

        {/* Right panel — map only, Step 2 (Build Quote), wide screens */}
        <AnimatePresence>
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.1 } }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.15 }}
            className="hidden w-[40%] min-w-[320px] max-w-[500px] border-s border-black/[0.06] lg:flex lg:flex-col dark:border-white/[0.06]"
          >
            <ClientOnly fallback={<div className="flex h-full items-center justify-center text-[13px] text-black/40">Loading map...</div>}>
              <DeliveryMap address={deliveryAddress} onAddressChange={setDeliveryAddress} />
            </ClientOnly>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  )
}
