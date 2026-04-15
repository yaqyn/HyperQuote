import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormProvider, useForm, useWatch, useFieldArray } from 'react-hook-form'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { ClientOnly } from '../../../lib/client-only'
import { QuoteBuilderHeader } from './QuoteBuilderHeader'
import { OutdatedPricesBanner } from './OutdatedPricesBanner'
import { PriceStatusBadge } from './PriceStatusBadge'
import { ProductSearchMenu } from './ProductSearchMenu'
import { SourceSearchMenu } from './SourceSearchMenu'
import { MarginControlPanel } from './MarginControlPanel'
import { ApprovalWorkflow } from './ApprovalWorkflow'
import { DeliveryTerms } from './DeliveryTerms'
import { DeliveryMap } from './DeliveryMap'
import { PaymentTerms } from './PaymentTerms'
import { ValidityPeriod } from './ValidityPeriod'
import { SendQuote } from './SendQuote'
import { CreditStatusBanner } from '../shared/CreditStatusBanner'
import { Button } from '../../ui/Button'
import {
  getQuoteBuilderData,
  requestInventoryPriceUpdate,
  saveQuoteDraft,
} from '../../../lib/server/sales-quotes'
import { addCustomer } from '../../../lib/server/sales-customers'
import { PhoneInput, isValidEGPhone } from '../../shared/PhoneInput'
import type { QuoteFormValues, LineItemFormValues } from './types'
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
  // Customer fields start empty; they hydrate from getQuoteBuilderData once
  // the loader resolves. No hardcoded defaults — no fake names / addresses.
  const [customerName, setCustomerName] = useState(initialCustomerName ?? '')
  const [customerTier, setCustomerTier] = useState<string>(isNewCustomer ? 'New' : '')
  const [rfqReference] = useState(() => `QR-2026-${rfqId.slice(-5).padStart(5, '0')}`)
  const [deliveryAddress, setDeliveryAddress] = useState('')
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
  // Defer MapLibre init until after the quote builder's open animation finishes
  // so the map's heavy first-paint doesn't stutter the overlay transition.
  const [mapReady, setMapReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMapReady(true), 320)
    return () => clearTimeout(t)
  }, [])

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

  // Outdated price tracking — drives the quote-level banner + per-line flag
  const outdatedItems = useMemo(
    () => (watchedItems ?? []).filter((item) => item.priceStatus === 'outdated'),
    [watchedItems],
  )
  const [requestedPriceIds, setRequestedPriceIds] = useState<Set<string>>(new Set())
  const requestUpdateMutation = useMutation({ mutationFn: requestInventoryPriceUpdate })
  const handleRequestPriceUpdate = useCallback(
    (items: LineItemFormValues[]) => {
      if (items.length === 0) return
      requestUpdateMutation.mutate({
        data: {
          rfqId,
          items: items.map((i) => ({
            productId: i.id,
            productName: i.productName,
            supplierName: i.supplierName,
          })),
        },
      })
      setRequestedPriceIds((prev) => {
        const next = new Set(prev)
        for (const it of items) next.add(it.id)
        return next
      })
    },
    [requestUpdateMutation, rfqId],
  )
  const unrequestedOutdatedItems = outdatedItems.filter((i) => !requestedPriceIds.has(i.id))

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
      if (!isFromRfq) {
        if (!custPhone.trim()) errors.push('Phone number is required')
        else if (!isValidEGPhone(custPhone)) errors.push('Phone number is not a valid Egyptian mobile')
      }
    }

    if (step === 2) {
      if (!values.lineItems || values.lineItems.length === 0) errors.push('Add at least one item')
      if (!deliveryAddress.trim()) errors.push('Please enter a delivery address')
      if (!values.deliveryDate) errors.push('Please select a delivery date')
      const hasZeroPrice = (values.lineItems ?? []).some((item) => !item.sellPrice || item.sellPrice <= 0)
      if (hasZeroPrice) errors.push('Some items are missing a sell price')
    }

    return errors
  }

  const [persistedCustomerId, setPersistedCustomerId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const tryGoToStep = async (nextStep: number) => {
    const errors = validateStep(currentStep)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    // When leaving Step 1 on a brand-new customer flow, persist the customer
    // to the DB so they show up on subsequent searches.
    if (currentStep === 1 && isNewCustomer && !persistedCustomerId) {
      try {
        const result = await addCustomer({
          data: {
            phone: `+20 ${custPhone}`,
            companyName: custCompany || customerName,
            contactName: customerName,
            email: custEmail || undefined,
            deliveryAddress: deliveryAddress || undefined,
          },
        })
        setPersistedCustomerId(result.customerId)
        queryClient.invalidateQueries({ queryKey: ['sales-customer-list'] })
      } catch {
        setValidationErrors(['Failed to save customer. Try again.'])
        return
      }
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

        if (!isNewCustomer && data.customer) {
          setCustomerName(data.customer.name)
          setCustomerTier(data.customer.tier === 'new' ? 'New' : data.customer.tier)
          setCustPhone(data.customer.phone ?? '')
          setCustEmail(data.customer.email ?? '')
          setCustCompany(data.customer.company ?? data.customer.name)
        }
        if (!isNewCustomer && data.deliveryAddress) {
          setDeliveryAddress(data.deliveryAddress)
        }

        if (data.suggestedProducts && data.suggestedProducts.length > 0) {
          const getTargetMargin = (category?: string) => {
            const threshold = data.marginThresholds.find(t => t.productCategory === category)
            return threshold?.target ?? data.marginThresholds[0]?.target ?? 18
          }

          const items = data.suggestedProducts.map((p, i) => {
            const margin = getTargetMargin(p.category)
            const sellPrice = p.supplierCost > 0
              ? Math.round((p.supplierCost / (1 - margin / 100)) * 100) / 100
              : 0
            return {
              id: p.id ?? `item-${i}`,
              productName: p.productName,
              specification: p.specification,
              quantity: p.quantity,
              unit: p.unit,
              supplierCost: p.supplierCost,
              marginPercent: margin,
              sellPrice,
              lineTotal: Math.round(sellPrice * p.quantity * 100) / 100,
              freshnessIndicator: p.freshness as FreshnessIndicator,
              priceStatus: p.priceStatus,
              recentlyOrdered: p.recentlyOrdered,
              supplierName: p.supplierName,
            }
          })
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
          <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/25 dark:text-white/25">
            {quoteNumber} · v{version} · {status === 'draft' ? 'Draft' : status}
          </span>
          {lastSavedAt && (
            <span className="text-[10px] text-black/20 dark:text-white/20">Saved {Math.round((Date.now() - lastSavedAt.getTime()) / 1000)}s</span>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              // TODO: mark as rejected in DB
              onBack?.()
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-black/50 outline-none transition-colors hover:bg-black/[0.04] hover:text-black/80 dark:text-white/50 dark:hover:bg-white/[0.04] dark:hover:text-white/80"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Reject
          </button>
          <button
            type="button"
            onClick={async () => {
              // TODO: mark as saved in DB
              await handleAutoSave()
              onBack?.()
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--color-text)] outline-none transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M11.5 4.5L5.75 10.25 2.5 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Save
          </button>
        </div>
      </div>

      {/* Step content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content — scrollable */}
        <div className="flex-1 overflow-y-auto px-8 pb-16" data-module-content>
          <FormProvider {...methods}>
            <AnimatePresence mode="wait">
              {/* ==================== STEP 1: Customer ==================== */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={stepExit}
                  transition={stepTransition}
                  className="flex items-start justify-center pt-16"
                >
                  <div
                    className="w-full max-w-2xl"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        tryGoToStep(2)
                      }
                    }}
                  >
                    {/* Eyebrow */}
                    <div className="flex items-center gap-3 mb-10">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-black/35 dark:text-white/35">
                        {isFromRfq ? '01 · Confirm Customer' : '01 · New Customer'}
                      </span>
                      <div className="h-px flex-1 bg-black/[0.06] dark:bg-white/[0.06]" />
                      <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/25 dark:text-white/25">
                        {rfqReference}
                      </span>
                    </div>

                    {/* Editable headline name */}
                    <div className="mb-2 flex items-center gap-2">
                      {isFromRfq && (
                        <span className="inline-flex items-center rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-primary)]">
                          Tier {customerTier}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                      autoFocus={!isFromRfq}
                      className="w-full bg-transparent text-[38px] font-semibold tracking-tight text-[var(--color-text)] outline-none placeholder:text-black/15 dark:placeholder:text-white/15"
                    />
                    <p className="mt-1 text-[13px] text-black/35 dark:text-white/35">
                      {isFromRfq
                        ? 'Review the details below. Any edits here only apply to this quote.'
                        : 'Start with a name. Everything else is optional until you send.'}
                    </p>

                    {/* Divider */}
                    <div className="my-10 h-px bg-black/[0.06] dark:bg-white/[0.06]" />

                    {/* Two-column details */}
                    <div className="grid grid-cols-[160px_1fr] gap-x-10 gap-y-7">
                      {/* Contact section */}
                      <div className="text-[10px] uppercase tracking-[0.15em] text-black/40 dark:text-white/40 pt-2">
                        Contact
                      </div>
                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 block mb-1.5">Phone</label>
                          <div className="border-b border-black/[0.08] dark:border-white/[0.08] focus-within:border-[var(--color-primary)] py-1.5 transition-colors">
                            <PhoneInput value={custPhone} onChange={setCustPhone} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 block mb-1.5">Email</label>
                            <input
                              type="email"
                              value={custEmail}
                              onChange={(e) => setCustEmail(e.target.value)}
                              placeholder="—"
                              className="w-full bg-transparent text-[14px] text-[var(--color-text)] outline-none border-b border-black/[0.08] focus:border-[var(--color-primary)] dark:border-white/[0.08] py-1.5 transition-colors placeholder:text-black/15 dark:placeholder:text-white/15"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 block mb-1.5">Company</label>
                            <input
                              type="text"
                              value={custCompany}
                              onChange={(e) => setCustCompany(e.target.value)}
                              placeholder="—"
                              className="w-full bg-transparent text-[14px] text-[var(--color-text)] outline-none border-b border-black/[0.08] focus:border-[var(--color-primary)] dark:border-white/[0.08] py-1.5 transition-colors placeholder:text-black/15 dark:placeholder:text-white/15"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Delivery section */}
                      <div className="text-[10px] uppercase tracking-[0.15em] text-black/40 dark:text-white/40 pt-2">
                        Delivery
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 block mb-1.5">Site address</label>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Where the order ships to"
                          className="w-full bg-transparent text-[14px] text-[var(--color-text)] outline-none border-b border-black/[0.08] focus:border-[var(--color-primary)] dark:border-white/[0.08] py-1.5 transition-colors placeholder:text-black/20 dark:placeholder:text-white/20"
                        />
                      </div>
                    </div>

                    {/* Validation errors */}
                    {validationErrors.length > 0 && (
                      <div className="mt-8 border-s-2 border-[var(--color-primary)] ps-4">
                        {validationErrors.map((err) => (
                          <p key={err} className="text-[13px] text-[var(--color-primary)]">{err}</p>
                        ))}
                      </div>
                    )}

                    {/* Action bar */}
                    <div className="mt-12 flex items-center justify-between border-t border-black/[0.06] pt-5 dark:border-white/[0.06]">
                      <p className="text-[11px] text-black/30 dark:text-white/30">
                        Press <kbd className="font-[family-name:var(--font-geist-mono)] text-[10px] text-black/50 dark:text-white/50">Enter</kbd> to continue
                      </p>
                      <button
                        type="button"
                        onClick={() => tryGoToStep(2)}
                        className="group flex items-center gap-2.5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-[var(--color-primary)]/90 hover:gap-3.5"
                      >
                        Build Quote
                        <ArrowRight size={14} strokeWidth={2.25} className="transition-transform group-hover:translate-x-0.5" />
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
                {/* Unified pricing table */}
                <div className="mt-6 overflow-visible ps-2">
                  {/* Customer bar */}
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
                  </div>

                  {outdatedItems.length > 0 && (
                    <div className="mb-3">
                      <OutdatedPricesBanner
                        outdatedCount={outdatedItems.length}
                        urgentCount={outdatedItems.filter((it) => it.recentlyOrdered).length}
                        pendingRequest={unrequestedOutdatedItems.length}
                        isRequesting={requestUpdateMutation.isPending}
                        allRequested={unrequestedOutdatedItems.length === 0}
                        onRequestAll={() => handleRequestPriceUpdate(unrequestedOutdatedItems)}
                      />
                    </div>
                  )}

                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
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
                        const rowTint =
                          item.priceStatus === 'outdated'
                            ? 'bg-black/[0.02] hover:bg-black/[0.03] dark:bg-white/[0.02] dark:hover:bg-white/[0.04]'
                            : 'hover:bg-black/[0.01] dark:hover:bg-white/[0.01]'
                        return (
                          <tr key={item.id || i} className={`transition-colors ${rowTint}`}>
                            {/* Item — prominent, clickable */}
                            <td className="py-4 px-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => { setSearchOpen(true); (window as any).__replaceItemIndex = i }}
                                  className="text-start text-[14px] font-semibold text-[var(--color-text)] outline-none hover:text-[var(--color-primary)] transition-colors"
                                >
                                  {item.productName}
                                </button>
                                <PriceStatusBadge
                                  priceStatus={item.priceStatus ?? 'updated'}
                                  recentlyOrdered={item.recentlyOrdered ?? false}
                                />
                              </div>
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
                      priceStatus: product.priceStatus,
                      recentlyOrdered: product.recentlyOrdered,
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
                    leadTimeDays={2}
                  />
                </div>

                {/* Footer — totals, single line */}
                <div className="flex items-baseline justify-end border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
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
                    disabled={outdatedItems.length > 0}
                    title={outdatedItems.length > 0 ? 'All prices must be updated before submitting' : undefined}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:cursor-not-allowed disabled:bg-black/20 dark:disabled:bg-white/15 disabled:hover:bg-black/20 dark:disabled:hover:bg-white/15"
                  >
                    Review & Submit
                    <ArrowRight size={14} strokeWidth={2} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ==================== STEP 3: Review & Submit ==================== */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={stepExit}
                transition={stepTransition}
                className="flex items-start justify-center pt-16"
              >
                <div className="w-full max-w-3xl">
                  {/* Eyebrow */}
                  <div className="flex items-center gap-3 mb-10">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-black/35 dark:text-white/35">
                      03 · Review & Submit
                    </span>
                    <div className="h-px flex-1 bg-black/[0.06] dark:bg-white/[0.06]" />
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/25 dark:text-white/25">
                      {quoteNumber} · v{version}
                    </span>
                  </div>

                  {/* Customer headline */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-primary)]">
                      Tier {customerTier}
                    </span>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/25 dark:text-white/25">
                      {rfqReference}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-6">
                    <div className="min-w-0">
                      <h2 className="text-[38px] font-semibold tracking-tight text-[var(--color-text)] truncate">
                        {customerName}
                      </h2>
                      <p className="mt-1 text-[13px] text-black/35 dark:text-white/35">
                        Final review. Confirm the figures below, then submit for evaluation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus('pending_approval' as QuoteStatus)
                        onBack?.()
                      }}
                      className="group shrink-0 flex items-center gap-2.5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-[var(--color-primary)]/90 hover:gap-3.5"
                    >
                      Evaluate
                      <ArrowRight size={14} strokeWidth={2.25} className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>

                  <div className="my-10 h-px bg-black/[0.06] dark:bg-white/[0.06]" />

                  {/* Items — hanging label */}
                  <div className="grid grid-cols-[160px_1fr] gap-x-10 gap-y-2 mb-10">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-black/40 dark:text-white/40 pt-3">
                      Items
                      <span className="ms-1 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/25 dark:text-white/25">
                        · {watchedItems?.length ?? 0}
                      </span>
                    </div>
                    <div>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                            <th className="py-2 text-start text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Item</th>
                            <th className="py-2 text-end text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Qty</th>
                            <th className="py-2 text-end text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Cost</th>
                            <th className="py-2 text-end text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Margin</th>
                            <th className="py-2 text-end text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Price</th>
                            <th className="py-2 text-end text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(watchedItems ?? []).map((item, idx) => (
                            <tr key={item.id || idx} className="border-b border-black/[0.03] dark:border-white/[0.03]">
                              <td className="py-3 text-[13px] text-[var(--color-text)]">{item.productName}</td>
                              <td className="py-3 text-end font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">{item.quantity}</td>
                              <td className="py-3 text-end font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">{item.supplierCost?.toLocaleString('en-EG') ?? '—'}</td>
                              <td className="py-3 text-end font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">{item.marginPercent}%</td>
                              <td className="py-3 text-end font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text)]">{item.sellPrice?.toLocaleString('en-EG')}</td>
                              <td className="py-3 text-end font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">{(item.lineTotal || 0).toLocaleString('en-EG', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals row */}
                      <div className="mt-4 flex items-baseline justify-between">
                        <span className="text-[11px] text-black/35 dark:text-white/35">
                          Blended margin <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">{blendedMargin}%</span>
                          <span className="mx-2 text-black/20 dark:text-white/20">·</span>
                          VAT <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">{vatAmount.toLocaleString('en-EG', { minimumFractionDigits: 2 })}</span>
                        </span>
                        <div className="text-end">
                          <p className="text-[9px] uppercase tracking-widest text-black/25 dark:text-white/25">Total</p>
                          <p className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)] leading-none mt-1">
                            EGP {total.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-black/[0.06] dark:bg-white/[0.06]" />

                  {/* Delivery + Terms — hanging labels */}
                  <div className="grid grid-cols-[160px_1fr] gap-x-10 gap-y-7 py-10">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-black/40 dark:text-white/40 pt-1">
                      Delivery
                    </div>
                    <div className="space-y-2">
                      <p className="text-[14px] text-[var(--color-text)]">{deliveryAddress}</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-black/40 dark:text-white/40">
                        {methods.getValues('deliveryDate') && (
                          <span>
                            Date <span className="ms-1 font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">{methods.getValues('deliveryDate')}</span>
                          </span>
                        )}
                        {(() => {
                          const WINDOW_LABELS: Record<string, string> = {
                            '08:00-13:00': 'Morning · 08:00–13:00',
                            '13:00-17:00': 'Midday · 13:00–17:00',
                            '17:00-20:00': 'Evening · 17:00–20:00',
                          }
                          const win = methods.getValues('deliveryWindow') ?? '08:00-13:00'
                          return (
                            <span>
                              Window <span className="ms-1 text-[var(--color-text)]">{WINDOW_LABELS[win] ?? win}</span>
                            </span>
                          )
                        })()}
                        {methods.getValues('specialInstructions') && (
                          <span>
                            Notes <span className="ms-1 text-[var(--color-text)]">{methods.getValues('specialInstructions')}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] uppercase tracking-[0.15em] text-black/40 dark:text-white/40 pt-1">
                      Terms
                    </div>
                    <div className="flex gap-8 text-[12px] text-black/40 dark:text-white/40">
                      <span>
                        Payment <span className="ms-1 text-[var(--color-text)]">Bank transfer / cash</span>
                      </span>
                      <span>
                        Valid for <span className="ms-1 font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">{methods.getValues('validityDays') ?? 14} days</span>
                      </span>
                    </div>

                    <div className="text-[10px] uppercase tracking-[0.15em] text-black/40 dark:text-white/40 pt-1">
                      Evaluation
                    </div>
                    <div>
                      <ApprovalWorkflow
                        quoteId={quoteId ?? 'new'}
                        marginPercent={blendedMargin}
                        totalValue={total}
                        customerTier="A"
                        thresholds={marginThresholds}
                        status={status === 'pending_approval' ? 'pending_approval' : status === 'approved' ? 'approved' : 'draft'}
                        onStatusChange={(newStatus) => setStatus(newStatus as QuoteStatus)}
                      />
                      {status === 'pending_approval' && (
                        <p className="mt-3 text-[12px] text-black/40 dark:text-white/40">
                          Submitted for evaluation. Your manager will review and send to the customer.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="flex items-center justify-between border-t border-black/[0.06] pt-5 dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="flex items-center gap-1.5 text-[12px] text-black/40 outline-none hover:text-black/70 dark:text-white/40 dark:hover:text-white/70 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="rtl:rotate-180">
                        <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Back to Quote
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </FormProvider>
        </div>

        {/* Right panel — map only, Step 2 (Build Quote), wide screens.
            Deferred mount: MapLibre GL initializes expensively, so we wait for
            the quote builder's entry animation to finish before mounting it. */}
        {currentStep === 2 && (
          <div className="hidden w-[40%] min-w-[320px] max-w-[500px] border-s border-black/[0.06] lg:flex lg:flex-col dark:border-white/[0.06]">
            {mapReady ? (
              <ClientOnly fallback={<div className="flex h-full items-center justify-center text-[13px] text-black/40">Loading map...</div>}>
                <DeliveryMap address={deliveryAddress} onAddressChange={setDeliveryAddress} />
              </ClientOnly>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-black/30" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
