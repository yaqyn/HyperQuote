import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { ClientOnly } from '../../../lib/client-only'
import { isValidEmail, isValidText } from '../../../lib/inputs'
import { addCustomer } from '../../../lib/server/sales-customers'
import { markAsWon } from '../../../lib/server/sales-pipeline'
import {
	getQuoteBuilderData,
	requestInventoryPriceUpdate,
	saveQuoteDraft,
} from '../../../lib/server/sales-quotes'
import type {
	FreshnessIndicator,
	MarginThresholds,
	PriceStatus,
	QuoteStatus,
} from '../../../types/sales'
import { getMarginLevel } from '../../../types/sales'
import { isValidEGPhone, PhoneInput } from '../../shared/PhoneInput'
import { SlidePanel } from '../../shared/SlidePanel'
import { DeclineRFQDialog } from '../rfq/DeclineRFQDialog'
import { ApprovalWorkflow } from './ApprovalWorkflow'
import { DeliveryMap } from './DeliveryMap'
import { DeliveryTerms } from './DeliveryTerms'
import { LineMarginPanel } from './LineMarginPopover'
import { OutdatedPricesBanner } from './OutdatedPricesBanner'
import { PriceStatusBadge } from './PriceStatusBadge'
import { ProductSearchMenu } from './ProductSearchMenu'
import { SourceSearchMenu } from './SourceSearchMenu'
import type { LineItemFormValues, QuoteFormValues } from './types'

interface QuoteBuilderViewProps {
	quoteId?: string
	rfqId: string
	isNewCustomer?: boolean
	initialCustomerName?: string
	onBack?: () => void
	onSave?: () => void
}

// --- Supplier directory type (populated live from getQuoteBuilderData) ---

interface SupplierRecord {
	id: string
	name: string
	tier: string
	score: number
	categories: string[]
}

/**
 * Build a search function bound to the supplier list returned by the
 * server. This replaces the old hardcoded ALL_SUPPLIERS constant — every
 * supplier, tier, score, and category now comes from db.suppliers /
 * db.supplierPrices via getQuoteBuilderData.
 */
function makeSearchSuppliers(pool: SupplierRecord[]) {
	return function searchSuppliers(
		query: string,
		itemName?: string,
	): SupplierRecord[] {
		const q = query.toLowerCase().trim()
		const itemLower = (itemName ?? '').toLowerCase()

		// Pull category keywords from the product name so the search ranks
		// suppliers who actually carry the item being sourced.
		const keywords = itemLower.split(/[^a-z0-9]+/).filter((w) => w.length >= 3)

		let results = pool
		if (q) {
			results = results.filter(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					s.categories.some((c) => c.toLowerCase().includes(q)),
			)
		}
		return [...results].sort((a, b) => {
			const aRelevant = keywords.some((k) =>
				a.categories.some((c) => c.includes(k)),
			)
				? 1
				: 0
			const bRelevant = keywords.some((k) =>
				b.categories.some((c) => c.includes(k)),
			)
				? 1
				: 0
			if (aRelevant !== bRelevant) return bRelevant - aRelevant
			return b.score - a.score
		})
	}
}

// Customer phone number is NEVER exposed to the frontend.
// Calls are initiated via server-side endpoint: /api/call/:rfqId
// The server resolves the number, initiates VoIP/SIP, and connects the employee.

// --- Step indicator ---

const STEP_LABELS = ['Customer', 'Build Quote', 'Review & Submit'] as const

function _StepIndicator({
	currentStep,
	completedSteps,
	onStepClick,
}: {
	currentStep: number
	completedSteps: Set<number>
	/** Reserved — parent tracks sourcing completion. */
	sourcingDone?: boolean
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
								isClickable
									? 'cursor-pointer'
									: isLocked
										? 'cursor-not-allowed'
										: 'cursor-default'
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
									<svg
										width="12"
										height="12"
										viewBox="0 0 14 14"
										fill="none"
										aria-hidden="true"
									>
										<path
											d="M3.5 7l2.5 2.5L10.5 5"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
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

interface ItemSourcingState {
	productName: string
	quantity: number
	unit: string
	sourceId: string // 'warehouse' or supplier ID like 'sup-001'
	stockAvailable: number
	stockWac: number
}

// --- Main view ---

export function QuoteBuilderView({
	quoteId: initialQuoteId,
	rfqId,
	isNewCustomer = false,
	initialCustomerName,
	onBack,
	onSave,
}: QuoteBuilderViewProps) {
	const [quoteId, setQuoteId] = useState<string | undefined>(initialQuoteId)
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
	const [status, setStatus] = useState<QuoteStatus>('draft')
	const [quoteNumber] = useState(
		() =>
			`QT-2026-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
	)
	const [version] = useState(1)
	const [marginThresholds, setMarginThresholds] = useState<MarginThresholds[]>(
		[],
	)
	const [_customerCredit, setCustomerCredit] = useState<{
		creditLimit: number
		currentExposure: number
		availableCredit: number
	} | null>(null)
	// Customer fields start empty; they hydrate from getQuoteBuilderData once
	// the loader resolves. No hardcoded defaults — no fake names / addresses.
	const [customerName, setCustomerName] = useState(initialCustomerName ?? '')
	const [customerTier, setCustomerTier] = useState<string>(
		isNewCustomer ? 'New' : '',
	)
	const [rfqReference] = useState(
		() => `QR-2026-${rfqId.slice(-5).padStart(5, '0')}`,
	)
	const [deliveryAddress, setDeliveryAddress] = useState('')
	const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

	// Customer form fields (Step 1)
	const [custPhone, setCustPhone] = useState('')
	const [custEmail, setCustEmail] = useState('')
	const [custCompany, setCustCompany] = useState('')

	// Wizard state — start at Step 1 (Customer) for new, Step 2 (Build) for existing RFQ
	const isFromRfq = !isNewCustomer && !rfqId.startsWith('new-')
	const [currentStep, setCurrentStep] = useState(isFromRfq ? 2 : 1)
	const [_completedSteps, setCompletedSteps] = useState<Set<number>>(
		isFromRfq ? new Set([1]) : new Set(),
	)
	const [_sourcingDone, _setSourcingDone] = useState(false)
	const [tableSourceOpen, setTableSourceOpen] = useState<number | null>(null)
	const [declineOpen, setDeclineOpen] = useState(false)
	const [marginIndex, setMarginIndex] = useState<number | null>(null)
	const [mapOpen, setMapOpen] = useState(false)

	// Shared SlidePanel handles escape-key + outer-X dismissal via its
	// `scope="sales"` registration — no manual handler needed here.

	// Defer MapLibre init until after the quote builder's open animation finishes
	// so the map's heavy first-paint doesn't stutter the overlay transition.
	const [_mapReady, setMapReady] = useState(false)
	useEffect(() => {
		const t = setTimeout(() => setMapReady(true), 320)
		return () => clearTimeout(t)
	}, [])

	// Sourcing state — built from line items + inventory
	const [sourcingState, setSourcingState] = useState<ItemSourcingState[]>([])
	// Live reference data loaded from getQuoteBuilderData — no hardcoded
	// inventory, supplier directory, or source ID rotations.
	const [stockByName, setStockByName] = useState<
		Record<string, { available: number; physical: number; reserved: number }>
	>({})
	const [suppliersPool, setSuppliersPool] = useState<SupplierRecord[]>([])
	const searchSuppliers = useMemo(
		() => makeSearchSuppliers(suppliersPool),
		[suppliersPool],
	)

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
	const { append: appendItem, remove: removeItem } = useFieldArray({
		control: methods.control,
		name: 'lineItems',
	})
	const [searchOpen, setSearchOpen] = useState(false)
	/** Index of the line item being replaced via the search menu, or null for "append". */
	const replaceItemIndexRef = useRef<number | null>(null)

	// Compute totals from watched items (useWatch, NOT watch)
	const watchedItems = useWatch({ control: methods.control, name: 'lineItems' })
	const subtotal =
		watchedItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) ?? 0
	const vatAmount = Math.round(subtotal * 14) / 100
	const total = subtotal + vatAmount

	// Outdated price tracking — drives the quote-level banner + per-line flag
	const outdatedItems = useMemo(
		() =>
			(watchedItems ?? []).filter((item) => item.priceStatus === 'outdated'),
		[watchedItems],
	)
	// RFQ + quote status, hydrated from getQuoteBuilderData. Drives whether
	// the Evaluate button is shown — hidden once the order is already
	// committed (quote accepted) or dead (rfq declined/expired).
	const [rfqStatus, setRfqStatus] = useState<string>('submitted')
	const canEvaluate =
		status !== 'accepted' &&
		status !== 'declined' &&
		rfqStatus !== 'declined' &&
		rfqStatus !== 'expired'

	// Evaluate = phone-confirmed order. Saves the draft so a quote row
	// exists, flips quote.status → 'accepted', freezes totalDue, seeds
	// payment state as unpaid. The order then shows up in the Finance
	// inbox for partial payment collection.
	const [isEvaluating, setIsEvaluating] = useState(false)
	const handleEvaluate = async () => {
		if (!canEvaluate || isEvaluating) return
		setIsEvaluating(true)
		try {
			// 1. Persist the current draft (items + delivery + terms) and
			//    capture the quote id — markAsWon needs a concrete row.
			const savedId = await persistDraftAndGetId()
			if (!savedId) {
				setIsEvaluating(false)
				return
			}
			// 2. Commit to Finance. markAsWon flips quote.status='accepted',
			//    freezes totalDue, seeds payment state unpaid, walks rfq to
			//    'quoted'. Everything downstream (Finance inbox, inventory
			//    gate, living report) derives from those writes.
			await markAsWon({ data: { quoteId: savedId } })
			// 3. Refresh every affected query so the inbox, pipeline, and
			//    finance inbox all see the new state immediately.
			queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
			queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] })
			queryClient.invalidateQueries({ queryKey: ['sales-pipeline-summary'] })
			queryClient.invalidateQueries({ queryKey: ['finance-inbox'] })
			queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
			// 4. Back to inbox — the order is Finance's problem now.
			onBack?.()
		} catch (err) {
			console.error('Failed to evaluate:', err)
			setIsEvaluating(false)
		}
	}

	const [requestedPriceIds, setRequestedPriceIds] = useState<Set<string>>(
		new Set(),
	)
	const requestUpdateMutation = useMutation({
		mutationFn: requestInventoryPriceUpdate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inventory-overview'] })
			queryClient.invalidateQueries({ queryKey: ['inventory-top-suppliers'] })
			queryClient.invalidateQueries({ queryKey: ['sales-outdated-prices'] })
			// Re-pull the quote builder payload so any line items whose price
			// was refreshed in the background flip from 'outdated' back to
			// 'updated' — the banner and outdated-items list derive from this.
			queryClient.invalidateQueries({ queryKey: ['quote-builder-data', rfqId] })
		},
	})
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
	const unrequestedOutdatedItems = outdatedItems.filter(
		(i) => !requestedPriceIds.has(i.id),
	)

	// Build sourcing state when items load/change — availability sourced
	// from the live stockByName map returned by getQuoteBuilderData.
	const itemCount = watchedItems?.length ?? 0
	useEffect(() => {
		if (itemCount === 0) return
		// Rebuild if item count changed (items loaded or added/removed)
		if (sourcingState.length !== itemCount) {
			const items = watchedItems ?? []
			setSourcingState(
				items.map((item) => {
					const stock = stockByName[item.productName]
					// Preserve existing sourceId if available
					const existing = sourcingState.find(
						(s) => s.productName === item.productName,
					)
					return {
						productName: item.productName,
						quantity: item.quantity,
						unit: item.unit || 'unit',
						sourceId: existing?.sourceId ?? '',
						stockAvailable: stock?.available ?? 0,
						stockWac: item.supplierCost || 0,
					}
				}),
			)
		}
	}, [
		itemCount,
		stockByName,
		sourcingState.length,
		sourcingState.find,
		watchedItems,
	]) // eslint-disable-line react-hooks/exhaustive-deps

	// Assign item to a specific source
	const assignItemSource = (itemIndex: number, sourceId: string) => {
		setSourcingState((prev) =>
			prev.map((s, i) => (i === itemIndex ? { ...s, sourceId } : s)),
		)
	}

	// Cycle through sources: warehouse → first three suppliers → warehouse.
	// Supplier IDs come from the live pool, not hardcoded slugs.
	const _toggleItemSource = (index: number) => {
		const topSupplierIds = suppliersPool.slice(0, 3).map((s) => s.id)
		const sourceIds = ['warehouse', ...topSupplierIds]
		if (sourceIds.length === 1) return
		setSourcingState((prev) =>
			prev.map((s, i) => {
				if (i !== index) return s
				const currentIdx = sourceIds.indexOf(s.sourceId)
				const nextIdx = (currentIdx + 1) % sourceIds.length
				return { ...s, sourceId: sourceIds[nextIdx] }
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
			if (!isValidText(customerName))
				errors.push('Customer name is required (min 2 characters)')
			if (!isFromRfq) {
				if (!custPhone.trim()) errors.push('Phone number is required')
				else if (!isValidEGPhone(custPhone))
					errors.push('Phone number is not a valid Egyptian mobile')
				if (custEmail.trim() && !isValidEmail(custEmail))
					errors.push('Email address is not valid')
				if (custCompany.trim() && !isValidText(custCompany))
					errors.push('Company name is not valid')
			}
		}

		if (step === 2) {
			if (!values.lineItems || values.lineItems.length === 0)
				errors.push('Add at least one item')
			if (!isValidText(deliveryAddress, 4, 300))
				errors.push('Please enter a full delivery address')
			if (!values.deliveryDate) errors.push('Please select a delivery date')
			const hasZeroPrice = (values.lineItems ?? []).some(
				(item) => !item.sellPrice || item.sellPrice <= 0,
			)
			if (hasZeroPrice) errors.push('Some items are missing a sell price')
			const hasBadQty = (values.lineItems ?? []).some(
				(item) => !item.quantity || item.quantity <= 0,
			)
			if (hasBadQty) errors.push('Every line needs a positive quantity')
		}

		return errors
	}

	const [persistedCustomerId, setPersistedCustomerId] = useState<string | null>(
		null,
	)
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
				if (data.rfqStatus) setRfqStatus(data.rfqStatus)
				// Hydrate the quote status from the existing draft (if any) so
				// the Evaluate button knows whether the order has already been
				// committed to Finance.
				if (data.quoteStatus) setStatus(data.quoteStatus as QuoteStatus)
				// Live reference payloads — no hardcoded mock constants here.
				setStockByName(data.stockByName ?? {})
				setSuppliersPool((data.suppliers ?? []) as SupplierRecord[])

				if (!isNewCustomer && data.customer) {
					setCustomerName(data.customer.name)
					setCustomerTier(
						data.customer.tier === 'new' ? 'New' : data.customer.tier,
					)
					setCustPhone(data.customer.phone ?? '')
					setCustEmail(data.customer.email ?? '')
					setCustCompany(data.customer.company ?? data.customer.name)
				}
				if (!isNewCustomer && data.deliveryAddress) {
					setDeliveryAddress(data.deliveryAddress)
				}
				// Rehydrate any saved delivery/terms overrides from the draft row
				// so the rep picks up where they left off without retyping.
				const draftDefaults = methods.getValues()
				methods.reset({
					...draftDefaults,
					deliveryDate: data.deliveryDate || draftDefaults.deliveryDate || '',
					deliveryWindow:
						data.deliveryWindow ||
						draftDefaults.deliveryWindow ||
						'08:00-17:00',
					specialInstructions:
						data.specialInstructions || draftDefaults.specialInstructions || '',
					paymentTerms: data.paymentTerms || draftDefaults.paymentTerms || '',
					earlyPaymentDiscount:
						data.earlyPaymentDiscount ||
						draftDefaults.earlyPaymentDiscount ||
						'',
					coverNote: data.coverNote || draftDefaults.coverNote || '',
				})

				if (data.suggestedProducts && data.suggestedProducts.length > 0) {
					const getTargetMargin = (category?: string) => {
						const threshold = data.marginThresholds.find(
							(t) => t.productCategory === category,
						)
						return threshold?.target ?? data.marginThresholds[0]?.target ?? 18
					}

					const items = data.suggestedProducts.map((p, i) => {
						// If the saved draft already has a margin/price (hydrated by the
						// server), respect it; otherwise fall back to the category target.
						const savedMargin = (p as { marginPercent?: number }).marginPercent
						const savedSellPrice = (p as { sellPrice?: number }).sellPrice
						const margin = savedMargin ?? getTargetMargin(p.category)
						const sellPrice =
							savedSellPrice ??
							(p.supplierCost > 0
								? Math.round((p.supplierCost / (1 - margin / 100)) * 100) / 100
								: 0)
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
							priceStatus: p.priceStatus as PriceStatus,
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
		return () => {
			cancelled = true
		}
	}, [rfqId, methods.getValues, methods.reset, isNewCustomer]) // eslint-disable-line react-hooks/exhaustive-deps

	// Shared draft-save path returning the id of the upserted row. Used
	// by both the 30s autosave tick and the Evaluate commit — Evaluate
	// needs the id to pass into markAsWon.
	const persistDraftAndGetId = useCallback(async (): Promise<string | null> => {
		const values = methods.getValues()
		if (values.lineItems.length === 0) return quoteId ?? null
		try {
			const result = await saveQuoteDraft({
				data: {
					quoteId,
					rfqId,
					customerId: persistedCustomerId ?? undefined,
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
					deliveryAddress: deliveryAddress || null,
					deliveryDate: values.deliveryDate || null,
					deliveryWindow: values.deliveryWindow || null,
					specialInstructions: values.specialInstructions || null,
					paymentTerms: values.paymentTerms || null,
					earlyPaymentDiscount: values.earlyPaymentDiscount || null,
					coverNote: values.coverNote || null,
				},
			})
			if (result.quoteId && result.quoteId !== quoteId) {
				setQuoteId(result.quoteId)
			}
			setLastSavedAt(new Date())
			return result.quoteId ?? quoteId ?? null
		} catch (err) {
			console.error('Save failed:', err)
			return null
		}
	}, [methods, quoteId, rfqId, persistedCustomerId, deliveryAddress])

	// Auto-save every 30 seconds — upserts draft via rfqId
	const handleAutoSave = useCallback(async () => {
		const values = methods.getValues()
		if (values.lineItems.length === 0) return
		try {
			const result = await saveQuoteDraft({
				data: {
					quoteId,
					rfqId,
					customerId: persistedCustomerId ?? undefined,
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
					// Override fields — sent as-is when the user has edited them.
					// Null means "no explicit value yet", which the server treats as
					// a fallback to the RFQ's field at render time.
					deliveryAddress: deliveryAddress || null,
					deliveryDate: values.deliveryDate || null,
					deliveryWindow: values.deliveryWindow || null,
					specialInstructions: values.specialInstructions || null,
					paymentTerms: values.paymentTerms || null,
					earlyPaymentDiscount: values.earlyPaymentDiscount || null,
					coverNote: values.coverNote || null,
				},
			})
			if (result.quoteId && result.quoteId !== quoteId) {
				setQuoteId(result.quoteId)
			}
			setLastSavedAt(new Date())
		} catch (err) {
			console.error('Save failed:', err)
		}
	}, [methods, quoteId, rfqId, persistedCustomerId, deliveryAddress])

	useEffect(() => {
		autoSaveTimerRef.current = setInterval(handleAutoSave, 30_000)
		return () => {
			if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
		}
	}, [handleAutoSave])

	const marginFloor =
		marginThresholds.length > 0
			? Math.min(...marginThresholds.map((t) => t.absoluteMin))
			: 0

	const blendedMargin =
		subtotal > 0
			? Math.round(
					(1 -
						(watchedItems ?? []).reduce(
							(s, i) => s + i.supplierCost * i.quantity,
							0,
						) /
							subtotal) *
						10000,
				) / 100
			: 0

	const _springTransition = {
		type: 'spring' as const,
		stiffness: 200,
		damping: 20,
	}
	const stepTransition = {
		duration: 0.2,
		ease: 'easeOut' as const,
		delay: 0.05,
	}
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
						<span className="text-[10px] text-black/20 dark:text-white/20">
							Saved {Math.round((Date.now() - lastSavedAt.getTime()) / 1000)}s
						</span>
					)}
				</div>
				<div className="flex-1" />
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => setDeclineOpen(true)}
						className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-orange-600/90 outline-none transition-colors hover:bg-orange-500/[0.08] hover:text-orange-700 dark:text-orange-400/90 dark:hover:bg-orange-500/[0.12] dark:hover:text-orange-300"
					>
						<svg
							aria-hidden="true"
							width="12"
							height="12"
							viewBox="0 0 14 14"
							fill="none"
						>
							<path
								d="M3.5 3.5l7 7M10.5 3.5l-7 7"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							/>
						</svg>
						Reject
					</button>
					<button
						type="button"
						onClick={async () => {
							await handleAutoSave()
							if (onSave) {
								onSave()
							} else {
								onBack?.()
							}
						}}
						className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--color-text)] outline-none transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
					>
						<svg
							aria-hidden="true"
							width="12"
							height="12"
							viewBox="0 0 14 14"
							fill="none"
						>
							<path
								d="M11.5 4.5L5.75 10.25 2.5 7"
								stroke="currentColor"
								strokeWidth="1.75"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
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
									<section
										aria-label="Customer confirmation"
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
												{isFromRfq
													? '01 · Confirm Customer'
													: '01 · New Customer'}
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
													<span className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 block mb-1.5">
														Phone
													</span>
													<div className="border-b border-black/[0.08] dark:border-white/[0.08] focus-within:border-[var(--color-primary)] py-1.5 transition-colors">
														<PhoneInput
															value={custPhone}
															onChange={setCustPhone}
														/>
													</div>
												</div>
												<div className="grid grid-cols-2 gap-x-6">
													<div>
														<span className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 block mb-1.5">
															Email
														</span>
														<input
															type="email"
															value={custEmail}
															onChange={(e) => setCustEmail(e.target.value)}
															placeholder="—"
															className="w-full bg-transparent text-[14px] text-[var(--color-text)] outline-none border-b border-black/[0.08] focus:border-[var(--color-primary)] dark:border-white/[0.08] py-1.5 transition-colors placeholder:text-black/15 dark:placeholder:text-white/15"
														/>
													</div>
													<div>
														<span className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 block mb-1.5">
															Company
														</span>
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
												<span className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 block mb-1.5">
													Site address
												</span>
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
													<p
														key={err}
														className="text-[13px] text-[var(--color-primary)]"
													>
														{err}
													</p>
												))}
											</div>
										)}

										{/* Action bar */}
										<div className="mt-12 flex items-center justify-between border-t border-black/[0.06] pt-5 dark:border-white/[0.06]">
											<p className="text-[11px] text-black/30 dark:text-white/30">
												Press{' '}
												<kbd className="font-[family-name:var(--font-geist-mono)] text-[10px] text-black/50 dark:text-white/50">
													Enter
												</kbd>{' '}
												to continue
											</p>
											<button
												type="button"
												onClick={() => tryGoToStep(2)}
												className="group flex items-center gap-2.5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-[var(--color-primary)]/90 hover:gap-3.5"
											>
												Build Quote
												<ArrowRight
													size={14}
													strokeWidth={2.25}
													className="transition-transform group-hover:translate-x-0.5"
												/>
											</button>
										</div>
									</section>
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
												<span className="text-[14px] font-semibold">
													{customerName}
												</span>
												<button
													type="button"
													onClick={() =>
														window.open(`/api/call/${rfqId}`, '_blank')
													}
													className="flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15"
												>
													<svg
														aria-hidden="true"
														width="10"
														height="10"
														viewBox="0 0 16 16"
														fill="none"
													>
														<path
															d="M6.5 1.5h-3a1 1 0 0 0-1 1v1a10 10 0 0 0 10 10h1a1 1 0 0 0 1-1v-3l-3-1.5-1.5 2a7 7 0 0 1-4-4l2-1.5L6.5 1.5z"
															stroke="currentColor"
															strokeWidth="1.2"
															strokeLinecap="round"
															strokeLinejoin="round"
														/>
													</svg>
													Call
												</button>
											</div>
										</div>

										{outdatedItems.length > 0 && (
											<div className="mb-3">
												<OutdatedPricesBanner
													outdatedCount={outdatedItems.length}
													urgentCount={
														outdatedItems.filter((it) => it.recentlyOrdered)
															.length
													}
													pendingRequest={unrequestedOutdatedItems.length}
													isRequesting={requestUpdateMutation.isPending}
													allRequested={unrequestedOutdatedItems.length === 0}
													onRequestAll={() =>
														handleRequestPriceUpdate(unrequestedOutdatedItems)
													}
												/>
											</div>
										)}

										<table className="w-full">
											<thead>
												<tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
													<th className="py-2.5 px-3 text-start text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">
														Item
													</th>
													<th className="py-2.5 px-3 text-end text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">
														Qty
													</th>
													<th className="py-2.5 px-3 text-end text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">
														Cost
													</th>
													<th className="py-2.5 px-3 text-end text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">
														Margin
													</th>
													<th className="py-2.5 px-3 text-end text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">
														Price
													</th>
													<th className="py-2.5 px-3 text-end text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">
														Total
													</th>
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
														<tr
															key={item.id || i}
															className={`transition-colors ${rowTint}`}
														>
															{/* Item — prominent, clickable */}
															<td className="py-4 px-3">
																<div className="flex items-center gap-2">
																	<button
																		type="button"
																		onClick={() => {
																			setSearchOpen(true)
																			replaceItemIndexRef.current = i
																		}}
																		className="text-start text-[14px] font-semibold text-[var(--color-text)] outline-none hover:text-[var(--color-primary)] transition-colors"
																	>
																		{item.productName}
																	</button>
																	<PriceStatusBadge
																		priceStatus={item.priceStatus ?? 'updated'}
																		recentlyOrdered={
																			item.recentlyOrdered ?? false
																		}
																	/>
																</div>
																{item.specification && (
																	<div className="mt-0.5 text-[11px] text-black/30 dark:text-white/30">
																		{item.specification}
																	</div>
																)}
															</td>
															{/* Qty — fixed, subtle */}
															<td className="py-4 px-3 text-end font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-black/40 dark:text-white/40">
																{item.quantity}
															</td>
															{/* Cost — fixed from DB, subtle */}
															<td className="py-4 px-3 text-end font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-black/40 dark:text-white/40">
																{item.supplierCost
																	? item.supplierCost.toLocaleString('en-EG')
																	: '—'}
															</td>
															{/* Margin — click to open rich editor popover */}
															<td className="py-4 px-3 text-end">
																{(() => {
																	const level =
																		marginThresholds.length > 0
																			? getMarginLevel(
																					item.marginPercent || 0,
																					marginThresholds[0],
																				)
																			: 'green'
																	const dot = {
																		green: 'bg-green-500',
																		yellow: 'bg-yellow-500',
																		red: 'bg-red-500',
																		blocked: 'bg-red-600',
																	}[level]
																	return (
																		<button
																			type="button"
																			onClick={() => {
																				setMapOpen(false)
																				setMarginIndex(i)
																			}}
																			className="group inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)] outline-none transition-all hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/[0.05] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
																		>
																			<span
																				className={`h-1.5 w-1.5 rounded-full ${dot}`}
																			/>
																			{item.marginPercent || 0}%
																			<svg
																				width="10"
																				height="10"
																				viewBox="0 0 10 10"
																				fill="none"
																				className="text-black/25 transition-colors group-hover:text-[var(--color-primary)] dark:text-white/25"
																				aria-hidden="true"
																			>
																				<path
																					d="M2 3.5l3 3 3-3"
																					stroke="currentColor"
																					strokeWidth="1.3"
																					strokeLinecap="round"
																					strokeLinejoin="round"
																				/>
																			</svg>
																		</button>
																	)
																})()}
															</td>
															{/* Price — derived, prominent, read-only */}
															<td className="py-4 px-3 text-end">
																<span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium tabular-nums text-[var(--color-text)]">
																	{item.sellPrice
																		? item.sellPrice.toLocaleString('en-EG')
																		: '—'}
																</span>
															</td>
															{/* Total — bold, largest */}
															<td className="py-4 px-3 text-end font-[family-name:var(--font-geist-mono)] text-[15px] font-bold tabular-nums text-[var(--color-text)]">
																{(item.lineTotal || 0).toLocaleString('en-EG', {
																	minimumFractionDigits: 2,
																})}
															</td>
															{/* Remove */}
															<td className="py-4 text-center">
																<button
																	type="button"
																	onClick={() => removeItem(i)}
																	className="text-[14px] text-black/15 outline-none hover:text-black/40 dark:text-white/15 dark:hover:text-white/40 transition-colors"
																>
																	×
																</button>
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
										<svg
											aria-hidden="true"
											width="14"
											height="14"
											viewBox="0 0 14 14"
											fill="none"
										>
											<path
												d="M7 3v8M3 7h8"
												stroke="currentColor"
												strokeWidth="1.5"
												strokeLinecap="round"
											/>
										</svg>
										Add item
									</button>

									<ProductSearchMenu
										isOpen={searchOpen}
										onClose={() => setSearchOpen(false)}
										onAddProduct={(product, quantity) => {
											const margin = 18
											const sellPrice =
												Math.round(
													(product.supplierCost / (1 - margin / 100)) * 100,
												) / 100
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
											const replaceIdx = replaceItemIndexRef.current
											if (replaceIdx !== null) {
												// Replace existing item
												const keys = Object.keys(
													newItem,
												) as (keyof typeof newItem)[]
												for (const key of keys) {
													methods.setValue(
														`lineItems.${replaceIdx}.${key}`,
														newItem[key] as never,
													)
												}
												replaceItemIndexRef.current = null
											} else {
												appendItem(newItem)
											}
											setSearchOpen(false)
										}}
									/>

									<SourceSearchMenu
										isOpen={tableSourceOpen !== null}
										onClose={() => setTableSourceOpen(null)}
										itemName={
											tableSourceOpen !== null
												? (watchedItems?.[tableSourceOpen]?.productName ?? '')
												: ''
										}
										stockAvailable={
											tableSourceOpen !== null
												? (sourcingState[tableSourceOpen]?.stockAvailable ?? 0)
												: 0
										}
										currentSourceId={
											tableSourceOpen !== null
												? (sourcingState[tableSourceOpen]?.sourceId ?? '')
												: ''
										}
										searchSuppliers={searchSuppliers}
										onSelect={(sourceId) => {
											if (tableSourceOpen !== null)
												assignItemSource(tableSourceOpen, sourceId)
										}}
									/>

									{/* Delivery */}
									<div className="mt-6 border-t border-black/[0.04] pt-5 dark:border-white/[0.04]">
										<h3 className="mb-3 text-[13px] font-semibold text-[var(--color-text)]">
											Delivery
										</h3>
										<div className="mb-3 flex items-center gap-2">
											<svg
												aria-hidden="true"
												width="12"
												height="12"
												viewBox="0 0 14 14"
												fill="none"
												className="shrink-0 text-black/40 dark:text-white/40"
											>
												<path
													d="M7 1.75C4.65 1.75 2.75 3.65 2.75 6c0 3.25 4.25 6.25 4.25 6.25s4.25-3 4.25-6.25c0-2.35-1.9-4.25-4.25-4.25Z"
													stroke="currentColor"
													strokeWidth="1"
												/>
												<circle
													cx="7"
													cy="6"
													r="1.25"
													stroke="currentColor"
													strokeWidth="1"
												/>
											</svg>
											<input
												type="text"
												value={deliveryAddress}
												onChange={(e) => setDeliveryAddress(e.target.value)}
												onFocus={() => {
													setMarginIndex(null)
													setMapOpen(true)
												}}
												placeholder="Click to pick on map"
												className="flex-1 bg-transparent text-[13px] text-[var(--color-text)] outline-none border-b border-black/[0.04] focus:border-[var(--color-primary)]/30 dark:border-white/[0.04] placeholder:text-black/30 dark:placeholder:text-white/30"
											/>
											<button
												type="button"
												onClick={() => {
													setMarginIndex(null)
													setMapOpen((open) => !open)
												}}
												className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] outline-none transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
											>
												<svg
													width="11"
													height="11"
													viewBox="0 0 14 14"
													fill="none"
													aria-hidden="true"
												>
													<path
														d="M1.5 3.5l4-1.5 3 1.5 4-1.5v8.5l-4 1.5-3-1.5-4 1.5v-8.5z"
														stroke="currentColor"
														strokeWidth="1.2"
														strokeLinejoin="round"
													/>
													<path
														d="M5.5 2v8.5M8.5 3.5V12"
														stroke="currentColor"
														strokeWidth="1.2"
													/>
												</svg>
												{mapOpen ? 'Hide map' : 'Pick on map'}
											</button>
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
												{subtotal.toLocaleString('en-EG', {
													minimumFractionDigits: 2,
												})}{' '}
												+{' '}
												{vatAmount.toLocaleString('en-EG', {
													minimumFractionDigits: 2,
												})}
											</span>
											<span className="font-[family-name:var(--font-geist-mono)] text-[16px] font-semibold tabular-nums text-[var(--color-text)]">
												EGP{' '}
												{total.toLocaleString('en-EG', {
													minimumFractionDigits: 2,
												})}
											</span>
										</span>
									</div>

									{/* Validation errors */}
									{validationErrors.length > 0 && (
										<div className="mt-6 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/[0.04] px-4 py-3">
											{validationErrors.map((err) => (
												<p
													key={err}
													className="text-[13px] text-[var(--color-primary)]"
												>
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
											<svg
												aria-hidden="true"
												width="14"
												height="14"
												viewBox="0 0 16 16"
												fill="none"
												className="rtl:rotate-180"
											>
												<path
													d="M10 12L6 8l4-4"
													stroke="currentColor"
													strokeWidth="1.5"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
											Customer
										</button>
										<button
											type="button"
											onClick={() => tryGoToStep(3)}
											disabled={outdatedItems.length > 0}
											title={
												outdatedItems.length > 0
													? 'All prices must be updated before submitting'
													: undefined
											}
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
													Final review. Confirm the figures below, then submit
													for evaluation.
												</p>
											</div>
											<button
												type="button"
												onClick={handleEvaluate}
												disabled={!canEvaluate || isEvaluating}
												className="group shrink-0 flex items-center gap-2.5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-[var(--color-primary)]/90 hover:gap-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{isEvaluating ? 'Evaluating…' : 'Evaluate'}
												<ArrowRight
													size={14}
													strokeWidth={2.25}
													className="transition-transform group-hover:translate-x-0.5"
												/>
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
															<th className="py-2 text-start text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
																Item
															</th>
															<th className="py-2 text-end text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
																Qty
															</th>
															<th className="py-2 text-end text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
																Cost
															</th>
															<th className="py-2 text-end text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
																Margin
															</th>
															<th className="py-2 text-end text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
																Price
															</th>
															<th className="py-2 text-end text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
																Total
															</th>
														</tr>
													</thead>
													<tbody>
														{(watchedItems ?? []).map((item, idx) => (
															<tr
																key={item.id || idx}
																className="border-b border-black/[0.03] dark:border-white/[0.03]"
															>
																<td className="py-3 text-[13px] text-[var(--color-text)]">
																	{item.productName}
																</td>
																<td className="py-3 text-end font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">
																	{item.quantity}
																</td>
																<td className="py-3 text-end font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">
																	{item.supplierCost?.toLocaleString('en-EG') ??
																		'—'}
																</td>
																<td className="py-3 text-end font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">
																	{item.marginPercent}%
																</td>
																<td className="py-3 text-end font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text)]">
																	{item.sellPrice?.toLocaleString('en-EG')}
																</td>
																<td className="py-3 text-end font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
																	{(item.lineTotal || 0).toLocaleString(
																		'en-EG',
																		{ minimumFractionDigits: 2 },
																	)}
																</td>
															</tr>
														))}
													</tbody>
												</table>

												{/* Totals row */}
												<div className="mt-4 flex items-baseline justify-between">
													<span className="text-[11px] text-black/35 dark:text-white/35">
														Blended margin{' '}
														<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
															{blendedMargin}%
														</span>
														<span className="mx-2 text-black/20 dark:text-white/20">
															·
														</span>
														VAT{' '}
														<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
															{vatAmount.toLocaleString('en-EG', {
																minimumFractionDigits: 2,
															})}
														</span>
													</span>
													<div className="text-end">
														<p className="text-[9px] uppercase tracking-widest text-black/25 dark:text-white/25">
															Total
														</p>
														<p className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)] leading-none mt-1">
															EGP{' '}
															{total.toLocaleString('en-EG', {
																minimumFractionDigits: 2,
															})}
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
												<p className="text-[14px] text-[var(--color-text)]">
													{deliveryAddress}
												</p>
												<div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-black/40 dark:text-white/40">
													{methods.getValues('deliveryDate') && (
														<span>
															Date{' '}
															<span className="ms-1 font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
																{methods.getValues('deliveryDate')}
															</span>
														</span>
													)}
													{(() => {
														const WINDOW_LABELS: Record<string, string> = {
															'08:00-13:00': 'Morning · 08:00–13:00',
															'13:00-17:00': 'Midday · 13:00–17:00',
															'17:00-20:00': 'Evening · 17:00–20:00',
														}
														const win =
															methods.getValues('deliveryWindow') ??
															'08:00-13:00'
														return (
															<span>
																Window{' '}
																<span className="ms-1 text-[var(--color-text)]">
																	{WINDOW_LABELS[win] ?? win}
																</span>
															</span>
														)
													})()}
													{methods.getValues('specialInstructions') && (
														<span>
															Notes{' '}
															<span className="ms-1 text-[var(--color-text)]">
																{methods.getValues('specialInstructions')}
															</span>
														</span>
													)}
												</div>
											</div>

											<div className="text-[10px] uppercase tracking-[0.15em] text-black/40 dark:text-white/40 pt-1">
												Terms
											</div>
											<div className="flex gap-8 text-[12px] text-black/40 dark:text-white/40">
												<span>
													Payment{' '}
													<span className="ms-1 text-[var(--color-text)]">
														Bank transfer / cash
													</span>
												</span>
												<span>
													Valid for{' '}
													<span className="ms-1 font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
														{methods.getValues('validityDays') ?? 14} days
													</span>
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
													status={
														status === 'pending_approval'
															? 'pending_approval'
															: status === 'approved'
																? 'approved'
																: 'draft'
													}
													onStatusChange={(newStatus) =>
														setStatus(newStatus as QuoteStatus)
													}
												/>
												{status === 'pending_approval' && (
													<p className="mt-3 text-[12px] text-black/40 dark:text-white/40">
														Submitted for evaluation. Your manager will review
														and send to the customer.
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
												<svg
													aria-hidden="true"
													width="14"
													height="14"
													viewBox="0 0 16 16"
													fill="none"
													className="rtl:rotate-180"
												>
													<path
														d="M10 12L6 8l4-4"
														stroke="currentColor"
														strokeWidth="1.5"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
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
			</div>

			{/* Map side panel — shared SlidePanel inherits all visual rules. */}
			<SlidePanel
				isOpen={mapOpen && currentStep === 2}
				onClose={() => setMapOpen(false)}
				maxWidth={520}
				panelKey="map-overlay"
				ariaLabel="Pick delivery location"
				scope="sales"
			>
				<div className="flex h-12 items-center border-b border-black/[0.06] px-5 dark:border-white/[0.06]">
					<span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
						Pick delivery location
					</span>
				</div>
				<div className="h-[calc(100%-3rem)] bg-[var(--color-surface)] dark:bg-[#0A0A0A]">
					<ClientOnly
						fallback={
							<div className="flex h-full items-center justify-center text-[13px] text-black/40">
								Loading map…
							</div>
						}
					>
						<DeliveryMap
							address={deliveryAddress}
							onAddressChange={setDeliveryAddress}
						/>
					</ClientOnly>
				</div>
			</SlidePanel>

			{/* Line margin side panel. */}
			<SlidePanel
				isOpen={marginIndex !== null && !!(watchedItems ?? [])[marginIndex]}
				onClose={() => setMarginIndex(null)}
				maxWidth={460}
				panelKey="margin-overlay"
				ariaLabel="Adjust line margin"
				scope="sales"
			>
				{marginIndex !== null && (
					<LineMarginPanel
						items={(watchedItems ?? []).map((it) => ({
							productName: it.productName,
							supplierCost: it.supplierCost || 0,
							quantity: it.quantity || 0,
							marginPercent: it.marginPercent || 0,
						}))}
						currentIndex={marginIndex}
						onSelectIndex={setMarginIndex}
						marginFloor={marginFloor}
						thresholds={marginThresholds[0] ?? null}
						onChange={(index, margin) => {
							const it = (watchedItems ?? [])[index]
							if (!it) return
							const cost = it.supplierCost || 0
							const price =
								cost > 0
									? Math.round((cost / (1 - margin / 100)) * 100) / 100
									: 0
							methods.setValue(`lineItems.${index}.marginPercent`, margin)
							methods.setValue(`lineItems.${index}.sellPrice`, price)
							methods.setValue(
								`lineItems.${index}.lineTotal`,
								Math.round(price * it.quantity * 100) / 100,
							)
						}}
						onApplyToAll={(margin) => {
							;(watchedItems ?? []).forEach((it, idx) => {
								const cost = it.supplierCost || 0
								const price =
									cost > 0
										? Math.round((cost / (1 - margin / 100)) * 100) / 100
										: 0
								methods.setValue(`lineItems.${idx}.marginPercent`, margin)
								methods.setValue(`lineItems.${idx}.sellPrice`, price)
								methods.setValue(
									`lineItems.${idx}.lineTotal`,
									Math.round(price * it.quantity * 100) / 100,
								)
							})
						}}
						onClose={() => setMarginIndex(null)}
					/>
				)}
			</SlidePanel>

			<DeclineRFQDialog
				rfqId={rfqId}
				isOpen={declineOpen}
				onClose={() => setDeclineOpen(false)}
				onDeclined={() => onBack?.()}
			/>
		</div>
	)
}
