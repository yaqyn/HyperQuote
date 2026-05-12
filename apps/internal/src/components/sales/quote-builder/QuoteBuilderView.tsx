import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, CircleAlert } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
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
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../../shared/EmployeeControls'
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

// --- Step indicator ─────────────────────────────────────

const STEP_LABELS = ['customer', 'build quote', 'review & submit'] as const
const DELIVERY_DATE_REQUIRED_MESSAGE = 'Please select a delivery date'
const DELIVERY_ATTENTION_DURATION_MS = 1400

function StepIndicator({
	currentStep,
	completedSteps,
	onStepClick,
}: {
	currentStep: number
	completedSteps: Set<number>
	onStepClick: (step: number) => void
}) {
	return (
		<nav aria-label="Quote builder progress" className="min-w-0">
			<ol className="flex flex-wrap items-center gap-x-0 gap-y-2">
				{STEP_LABELS.map((label, i) => {
					const step = i + 1
					const isCompleted = completedSteps.has(step)
					const isCurrent = currentStep === step
					const isLocked = step === 3 && !completedSteps.has(2) && !isCurrent
					const isClickable = (isCompleted || step < currentStep) && !isCurrent
					const barFilled = completedSteps.has(i) || currentStep > i
					// Build an accessible name that carries state without relying on
					// just the step number — screen readers hear the phase.
					const statusWord = isCurrent
						? 'current step'
						: isCompleted
							? 'completed, click to revisit'
							: isLocked
								? 'locked'
								: 'upcoming'
					const accessibleLabel = `Step ${step} of ${STEP_LABELS.length}: ${label}, ${statusWord}`
					return (
						<Fragment key={step}>
							{i > 0 && (
								<li aria-hidden="true" className="mx-3">
									<span
										className="block h-px w-10 transition-[background-color,opacity] duration-300"
										style={{
											backgroundColor: barFilled
												? 'var(--color-primary)'
												: 'var(--color-border)',
											opacity: barFilled ? 0.9 : 0.45,
										}}
									/>
								</li>
							)}
							<li>
								<button
									type="button"
									aria-label={accessibleLabel}
									aria-current={isCurrent ? 'step' : undefined}
									aria-disabled={isLocked || (!isClickable && !isCurrent)}
									disabled={isLocked || (!isClickable && !isCurrent)}
									onClick={() => isClickable && onStepClick(step)}
									className={`group relative inline-flex items-baseline gap-2 rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] ${
										isClickable
											? 'cursor-pointer'
											: isLocked
												? 'cursor-not-allowed'
												: 'cursor-default'
									}`}
								>
									<span
										className="shrink-0 font-[family-name:var(--font-plex-mono)] tabular-nums transition-colors"
										style={{
											fontSize: '11px',
											letterSpacing: '0.08em',
											fontWeight: 500,
											color: isCurrent
												? 'var(--color-primary)'
												: isCompleted
													? 'var(--color-text-muted)'
													: 'var(--color-text-subtle)',
										}}
									>
										0{step}
									</span>
									<span
										className="hidden transition-colors sm:inline"
										style={{
											fontSize: '13px',
											fontFamily: 'var(--font-archivo)',
											fontStyle: isCurrent ? 'normal' : 'italic',
											fontWeight: isCurrent ? 500 : 400,
											letterSpacing: '-0.005em',
											color: isCurrent
												? 'var(--color-text)'
												: isCompleted
													? 'var(--color-text-muted)'
													: 'var(--color-text-subtle)',
										}}
									>
										{label}
									</span>
									{isCompleted && !isCurrent && (
										<svg
											width="10"
											height="10"
											viewBox="0 0 10 10"
											aria-hidden="true"
											className="shrink-0"
										>
											<path
												d="M2 5 L4 7 L8 3"
												stroke="var(--color-primary)"
												strokeWidth="1.3"
												strokeLinecap="round"
												strokeLinejoin="round"
												fill="none"
											/>
										</svg>
									)}
									{/* Underline affordance on hover / focus-visible — only for
									    clickable milestones; no decoration on the current step. */}
									{isClickable && (
										<span
											aria-hidden="true"
											className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[var(--color-primary)] transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
										/>
									)}
								</button>
							</li>
						</Fragment>
					)
				})}
			</ol>
		</nav>
	)
}

// --- Status label lookup ─────────────────────────────────

const STATUS_LABEL: Record<QuoteStatus, string> = {
	draft: 'draft',
	internal_review: 'internal review',
	pending_approval: 'pending approval',
	approved: 'approved',
	sent: 'sent',
	viewed: 'viewed',
	negotiating: 'negotiating',
	revised: 'revised',
	accepted: 'accepted',
	declined: 'declined',
	expired: 'expired',
}

// --- Autosaved indicator ─────────────────────────────────

function AutoSavedLine({ lastSavedAt }: { lastSavedAt: Date | null }) {
	const [, setTick] = useState(0)
	useEffect(() => {
		if (!lastSavedAt) return
		const id = setInterval(() => setTick((t) => t + 1), 1000)
		return () => clearInterval(id)
	}, [lastSavedAt])
	if (!lastSavedAt) return null
	const seconds = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)
	const display =
		seconds < 60
			? `saved ${seconds}s ago`
			: `saved ${Math.floor(seconds / 60)}m ago`
	// Not an aria-live region — it re-renders every second, which would spam
	// screen readers. Pure visual affordance; save announcements are the
	// caller's concern.
	return (
		<span
			className="min-w-0 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
			style={{ fontSize: '11px' }}
			aria-hidden="true"
		>
			· {display}
		</span>
	)
}

// --- Hairline field primitives ───────────────────────────

function FieldGroup({
	label,
	children,
}: {
	label: string
	children: React.ReactNode
}) {
	return (
		<div className="flex flex-col gap-4 sm:grid sm:grid-cols-[140px_1fr] sm:items-start sm:gap-x-10 sm:gap-y-5">
			<span
				className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)] sm:pt-2"
				style={{ fontSize: '12px' }}
			>
				{label}
			</span>
			<div className="flex flex-col gap-5">{children}</div>
		</div>
	)
}

function HairlineField({
	label,
	htmlFor,
	error,
	children,
}: {
	label: string
	htmlFor?: string
	/** Full error message. When present the field renders an inline error row
	 *  with id `${htmlFor}-error` so the input can point to it via
	 *  aria-describedby. */
	error?: string
	children: React.ReactNode
}) {
	const errorId = error && htmlFor ? `${htmlFor}-error` : undefined
	return (
		<div className="group">
			<label
				htmlFor={htmlFor}
				className="mb-1.5 block font-[family-name:var(--font-archivo)] italic transition-colors"
				style={{
					fontSize: '11px',
					color: error ? 'var(--color-signal-red)' : 'var(--color-text-subtle)',
				}}
			>
				{label}
			</label>
			<div
				className="pb-1.5 transition-colors"
				style={{
					borderBottom: `1px solid ${error ? 'var(--color-signal-red)' : 'var(--color-border)'}`,
				}}
			>
				{children}
			</div>
			{error && errorId && (
				<p
					id={errorId}
					className="mt-1.5 font-[family-name:var(--font-archivo)] italic"
					style={{
						fontSize: '11px',
						color: 'var(--color-signal-red)',
						letterSpacing: '-0.005em',
					}}
				>
					{error}
				</p>
			)}
		</div>
	)
}

/** Chrome header action — compact command button. Kept local so the
 *  builder header can map reject/save language without repeating styles. */
function HeaderAction({
	label,
	onClick,
	tone = 'neutral',
	trailing,
}: {
	label: string
	onClick: () => void
	tone?: 'neutral' | 'warn'
	trailing?: React.ReactNode
}) {
	return (
		<EmployeeActionButton
			type="button"
			onClick={onClick}
			size="sm"
			tone={tone === 'warn' ? 'danger' : 'neutral'}
			trailing={trailing}
		>
			{label}
		</EmployeeActionButton>
	)
}

function FooterAmount({
	label,
	value,
	suffix,
}: {
	label: string
	value: number
	suffix?: string
}) {
	return (
		<div className="min-w-0">
			<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--color-text-subtle)]">
				{label}
			</span>
			<span className="mt-0.5 block break-words font-[family-name:var(--font-plex-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)]">
				{value.toLocaleString('en-EG', {
					minimumFractionDigits: suffix === '%' ? 0 : 2,
				})}
				{suffix}
			</span>
		</div>
	)
}

/** Ledger stratum — italic Archivo eyebrow on the left, content on the
 *  right, hairline rule between rows. Page-scale variant of the
 *  StratumRow primitive used inside slide panels. */
function ReviewStratum({
	label,
	children,
	align = 'baseline',
}: {
	label: string
	children: React.ReactNode
	align?: 'baseline' | 'start'
}) {
	return (
		<div
			className={`flex flex-col gap-2 py-5 sm:grid sm:grid-cols-[110px_1fr] sm:gap-x-8 ${
				align === 'start' ? 'sm:items-start' : 'sm:items-baseline'
			}`}
			style={{
				borderBottom: '1px solid var(--color-border)',
			}}
		>
			<dt
				className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
				style={{
					fontSize: '11px',
					paddingTop: align === 'start' ? '3px' : undefined,
				}}
			>
				{label}
			</dt>
			<dd>{children}</dd>
		</div>
	)
}

function LineMetric({
	label,
	children,
}: {
	label: string
	children: React.ReactNode
}) {
	return (
		<div className="min-w-0">
			<span
				className="block font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
				style={{ fontSize: '10.5px' }}
			>
				{label}
			</span>
			<div className="mt-1 min-w-0 font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text)]">
				{children}
			</div>
		</div>
	)
}

function QuoteLineCard({
	item,
	index,
	marginColor,
	sourceLabel,
	onReplace,
	onSelectSource,
	onQuantityChange,
	onEditMargin,
	onRemove,
}: {
	item: LineItemFormValues
	index: number
	marginColor: string
	sourceLabel: string
	onReplace: () => void
	onSelectSource: () => void
	onQuantityChange: (quantity: number) => void
	onEditMargin: () => void
	onRemove: () => void
}) {
	return (
		<article
			className="border-b border-[var(--color-border)] py-4"
			aria-label={`Line ${index + 1}: ${item.productName}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p
						className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
						style={{ fontSize: '10.5px', letterSpacing: '0.04em' }}
					>
						{(index + 1).toString().padStart(2, '0')}
					</p>
					<button
						type="button"
						onClick={onReplace}
						className="mt-1 text-start font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none transition-colors hover:text-[var(--color-primary)] focus-visible:text-[var(--color-primary)]"
						style={{
							fontSize: '15px',
							fontWeight: 500,
							letterSpacing: '-0.005em',
							lineHeight: 1.25,
						}}
					>
						{item.productName}
					</button>
				</div>
				<div className="flex shrink-0 flex-col items-end gap-2">
					<PriceStatusBadge
						priceStatus={item.priceStatus ?? 'updated'}
						recentlyOrdered={item.recentlyOrdered ?? false}
					/>
					<EmployeeActionButton
						type="button"
						onClick={onReplace}
						tone="neutral"
						size="sm"
					>
						Replace
					</EmployeeActionButton>
				</div>
			</div>

			{item.specification && (
				<p
					className="mt-1 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
					style={{ fontSize: '11.5px', lineHeight: 1.45 }}
				>
					{item.specification}
				</p>
			)}

			<div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
				<LineMetric label="qty">
					<input
						type="number"
						min={1}
						step={1}
						value={item.quantity ?? ''}
						onChange={(e) => {
							const raw = Number(e.target.value)
							onQuantityChange(Number.isFinite(raw) && raw > 0 ? raw : 1)
						}}
						onFocus={(e) => e.currentTarget.select()}
						aria-label={`Quantity for ${item.productName}`}
						className="h-10 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 outline-none transition-colors [appearance:textfield] focus:border-[var(--color-primary)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
						style={{ fontSize: '14px', fontWeight: 500 }}
					/>
				</LineMetric>
				<LineMetric label="cost">
					<span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
						{item.supplierCost
							? item.supplierCost.toLocaleString('en-EG')
							: '—'}
					</span>
				</LineMetric>
				<LineMetric label="source">
					<EmployeeActionButton
						type="button"
						onClick={onSelectSource}
						tone="neutral"
						size="sm"
					>
						{sourceLabel}
					</EmployeeActionButton>
				</LineMetric>
				<LineMetric label="margin">
					<button
						type="button"
						onClick={onEditMargin}
						aria-label={`Edit margin for ${item.productName}, currently ${item.marginPercent || 0}%`}
						className="inline-flex items-baseline gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
						style={{ fontSize: '13px', fontWeight: 500 }}
					>
						<span
							aria-hidden="true"
							className="shrink-0 self-center rounded-full"
							style={{ width: 6, height: 6, backgroundColor: marginColor }}
						/>
						{item.marginPercent || 0}%
					</button>
				</LineMetric>
				<LineMetric label="price">
					<span style={{ fontSize: '13px', fontWeight: 500 }}>
						{item.sellPrice ? item.sellPrice.toLocaleString('en-EG') : '—'}
					</span>
				</LineMetric>
				<LineMetric label="line total">
					<span style={{ fontSize: '15px', fontWeight: 600 }}>
						{(item.lineTotal || 0).toLocaleString('en-EG', {
							minimumFractionDigits: 2,
						})}
					</span>
				</LineMetric>
				<div className="flex items-end justify-end">
					<EmployeeActionButton
						type="button"
						onClick={onRemove}
						tone="danger"
						size="sm"
					>
						Remove
					</EmployeeActionButton>
				</div>
			</div>
		</article>
	)
}

function ReviewLineCard({ item }: { item: LineItemFormValues }) {
	return (
		<article className="border-b border-[var(--color-border)] py-4">
			<p
				className="font-[family-name:var(--font-archivo)] text-[var(--color-text)]"
				style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.005em' }}
			>
				{item.productName}
			</p>
			<div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4">
				<LineMetric label="qty">
					<span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
						{item.quantity}
					</span>
				</LineMetric>
				<LineMetric label="cost">
					<span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
						{item.supplierCost?.toLocaleString('en-EG') ?? '—'}
					</span>
				</LineMetric>
				<LineMetric label="margin">
					<span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
						{item.marginPercent}%
					</span>
				</LineMetric>
				<LineMetric label="price">
					<span style={{ fontSize: '12px' }}>
						{item.sellPrice?.toLocaleString('en-EG')}
					</span>
				</LineMetric>
				<LineMetric label="total">
					<span style={{ fontSize: '13px', fontWeight: 500 }}>
						{(item.lineTotal || 0).toLocaleString('en-EG', {
							minimumFractionDigits: 2,
						})}
					</span>
				</LineMetric>
			</div>
		</article>
	)
}

/** Map a field id to whichever validation error applies to it. Kept lean so
 *  we don't have to refactor the whole validateStep signature; each field
 *  picks up its own message inline AND still contributes to the top summary. */
function errorForField(field: string, errors: string[]): string | undefined {
	const match = errors.find((e) => {
		const l = e.toLowerCase()
		if (field === 'cust-name') return l.includes('customer name')
		if (field === 'cust-phone') return l.includes('phone')
		if (field === 'cust-email') return l.includes('email')
		if (field === 'cust-company') return l.includes('company')
		if (field === 'cust-address') return l.includes('address')
		return false
	})
	return match
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
	const reduceMotion = useReducedMotion()
	const custNameRef = useRef<HTMLInputElement | null>(null)
	const [isPersistingCustomer, setIsPersistingCustomer] = useState(false)
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
	const deliverySectionRef = useRef<HTMLDivElement | null>(null)
	const deliveryAttentionTimerRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null)
	const [isDeliveryDateAttentionVisible, setDeliveryDateAttentionVisible] =
		useState(false)
	const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

	// Customer form fields (Step 1)
	const [custPhone, setCustPhone] = useState('')
	const [custEmail, setCustEmail] = useState('')
	const [custCompany, setCustCompany] = useState('')

	// Wizard state — start at Step 1 (Customer) for new, Step 2 (Build) for existing RFQ
	const isFromRfq = !isNewCustomer && !rfqId.startsWith('new-')
	const [currentStep, setCurrentStep] = useState(isFromRfq ? 2 : 1)
	const [completedSteps, setCompletedSteps] = useState<Set<number>>(
		isFromRfq ? new Set([1]) : new Set(),
	)
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

	useEffect(() => {
		return () => {
			if (deliveryAttentionTimerRef.current) {
				clearTimeout(deliveryAttentionTimerRef.current)
			}
		}
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
	const getSourceLabel = useCallback(
		(sourceId: string, stockAvailable = 0) => {
			if (sourceId === 'warehouse') return `Warehouse · ${stockAvailable} avail`
			if (!sourceId)
				return stockAvailable > 0 ? 'Choose source' : 'Choose supplier'
			return (
				suppliersPool.find((supplier) => supplier.id === sourceId)?.name ??
				'Selected source'
			)
		},
		[suppliersPool],
	)

	const methods = useForm<QuoteFormValues>({
		defaultValues: {
			lineItems: [],
			validityDays: 14,
			paymentTerms: '',
			deliveryMethod: '',
			deliveryDate: '',
			deliveryWindow: '08:00-13:00',
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
	const [approvalBlocked, setApprovalBlocked] = useState(false)
	const [approvalBlockReason, setApprovalBlockReason] = useState<string | null>(
		null,
	)
	const handleApprovalBlockedChange = useCallback(
		(blocked: boolean, reason: string | null) => {
			setApprovalBlocked(blocked)
			setApprovalBlockReason(reason)
		},
		[],
	)
	const canEvaluateByStatus =
		status !== 'accepted' &&
		status !== 'declined' &&
		rfqStatus !== 'declined' &&
		rfqStatus !== 'expired'
	const canEvaluate = canEvaluateByStatus && !approvalBlocked

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
			// Pipeline ribbon reads hasOutdatedPrices off the rfq-queue
			// projection — without this the badge stays "outdated" even after
			// procurement refreshes the supplier price.
			queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
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
			if (!values.deliveryDate) errors.push(DELIVERY_DATE_REQUIRED_MESSAGE)
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

	const showDeliveryDateAttention = useCallback(() => {
		if (deliveryAttentionTimerRef.current) {
			clearTimeout(deliveryAttentionTimerRef.current)
		}
		setDeliveryDateAttentionVisible(true)
		deliverySectionRef.current?.scrollIntoView({
			behavior: reduceMotion ? 'auto' : 'smooth',
			block: 'center',
		})
		deliveryAttentionTimerRef.current = setTimeout(() => {
			setDeliveryDateAttentionVisible(false)
			deliveryAttentionTimerRef.current = null
		}, DELIVERY_ATTENTION_DURATION_MS)
	}, [reduceMotion])

	const tryGoToStep = async (nextStep: number) => {
		const errors = validateStep(currentStep)
		if (errors.length > 0) {
			const shouldHighlightDeliveryDate = errors.includes(
				DELIVERY_DATE_REQUIRED_MESSAGE,
			)
			if (shouldHighlightDeliveryDate) showDeliveryDateAttention()
			setValidationErrors(
				errors.filter((error) => error !== DELIVERY_DATE_REQUIRED_MESSAGE),
			)
			return
		}
		// When leaving Step 1 on a brand-new customer flow, persist the customer
		// to the DB so they show up on subsequent searches. While the await is
		// in flight, disable the submit and flip aria-busy on the section so
		// screen readers announce the wait.
		if (currentStep === 1 && isNewCustomer && !persistedCustomerId) {
			setIsPersistingCustomer(true)
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
			} finally {
				setIsPersistingCustomer(false)
			}
		}
		goToStep(nextStep)
	}

	// Auto-focus the customer name input when Step 1 mounts or becomes visible.
	// Skip for RFQ flows — the name is already populated and focusing it would
	// interrupt the rep's eye path to the fields below.
	useEffect(() => {
		if (currentStep !== 1) return
		if (isFromRfq) return
		const id = requestAnimationFrame(() => {
			custNameRef.current?.focus()
		})
		return () => cancelAnimationFrame(id)
	}, [currentStep, isFromRfq])

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
			// Pipeline ribbon's outdated badge derives from the saved draft's
			// line items. Removing or re-adding items here changes that set, so
			// nudge rfq-queue to re-project.
			queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
		} catch (err) {
			console.error('Save failed:', err)
		}
	}, [
		methods,
		quoteId,
		rfqId,
		persistedCustomerId,
		deliveryAddress,
		queryClient,
	])

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
			{/* Chrome — quote meta · step indicator · actions */}
			<header className="flex flex-col items-stretch gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.06] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
				{/* Left: quote meta */}
				<div className="flex min-w-0 items-baseline gap-3">
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums shrink-0 text-[var(--color-text)]"
						style={{
							fontSize: '12px',
							fontWeight: 500,
							letterSpacing: '0.04em',
						}}
					>
						{quoteNumber}
					</span>
					<span
						className="font-[family-name:var(--font-archivo)] italic shrink-0 text-[var(--color-text-subtle)]"
						style={{ fontSize: '11px' }}
					>
						v{version} · {STATUS_LABEL[status]}
					</span>
					<AutoSavedLine lastSavedAt={lastSavedAt} />
				</div>

				{/* Center: step indicator */}
				<StepIndicator
					currentStep={currentStep}
					completedSteps={completedSteps}
					onStepClick={(s) => goToStep(s)}
				/>

				{/* Right: durable quote commands */}
				<div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
					<HeaderAction
						label="Reject"
						onClick={() => setDeclineOpen(true)}
						tone="warn"
					/>
					<HeaderAction
						label="Save for later"
						trailing={
							<span aria-hidden="true" style={{ fontSize: '10px' }}>
								✓
							</span>
						}
						onClick={async () => {
							await handleAutoSave()
							if (onSave) {
								onSave()
							} else {
								onBack?.()
							}
						}}
					/>
				</div>
			</header>

			{/* Step content */}
			<div className="flex flex-1 overflow-hidden">
				{/* Main content — scrollable */}
				<div
					className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-16 sm:px-6 lg:px-8"
					data-module-content
				>
					<FormProvider {...methods}>
						<AnimatePresence mode="wait">
							{/* ==================== STEP 1: Customer ==================== */}
							{currentStep === 1 && (
								<motion.div
									key="step-1"
									initial={reduceMotion ? false : { opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={reduceMotion ? undefined : stepExit}
									transition={reduceMotion ? { duration: 0 } : stepTransition}
									className="flex items-start justify-center pt-8 sm:pt-16"
								>
									<section
										aria-label="Customer confirmation"
										aria-busy={isPersistingCustomer}
										className="w-full max-w-2xl"
										onKeyDown={(e) => {
											// Enter on any field jumps to Step 2 (unless a shift/meta
											// modifier or textarea is involved — we never have textareas
											// on Step 1, but the guard keeps future-proofing cheap).
											if (
												e.key === 'Enter' &&
												!e.shiftKey &&
												!e.metaKey &&
												!e.ctrlKey
											) {
												e.preventDefault()
												tryGoToStep(2)
												return
											}
											// Esc returns to wherever the builder came from.
											if (e.key === 'Escape' && onBack) {
												e.preventDefault()
												onBack()
											}
										}}
									>
										{/* Section rule — mono step index · italic phase · rfq imprint */}
										<div className="mb-8 flex items-center gap-4">
											<span
												className="shrink-0 font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
												style={{
													fontSize: '11px',
													letterSpacing: '0.08em',
												}}
											>
												01
											</span>
											<span
												className="shrink-0 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
												style={{ fontSize: '12px' }}
											>
												{isFromRfq ? 'confirm customer' : 'new customer'}
											</span>
											<div
												aria-hidden="true"
												className="h-px flex-1"
												style={{
													backgroundColor: 'var(--color-border)',
													opacity: 0.6,
												}}
											/>
											<span
												className="shrink-0 font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
												style={{
													fontSize: '11px',
													letterSpacing: '0.08em',
												}}
											>
												{rfqReference}
											</span>
										</div>

										{/* Tier annotation — only when the customer carries one */}
										{isFromRfq && customerTier && (
											<p
												className="mb-2 font-[family-name:var(--font-archivo)] italic text-[var(--color-primary)]"
												style={{
													fontSize: '11px',
													letterSpacing: '0.005em',
												}}
											>
												<span className="sr-only">Customer tier: </span>
												tier {customerTier.toLowerCase()}
											</p>
										)}

										{/* Editable headline — Literata display, auto-focus on mount */}
										<label htmlFor="cust-name" className="sr-only">
											Customer name
										</label>
										<input
											ref={custNameRef}
											id="cust-name"
											type="text"
											value={customerName}
											onChange={(e) => setCustomerName(e.target.value)}
											onFocus={() => {
												if (validationErrors.length > 0) setValidationErrors([])
											}}
											placeholder="Customer name"
											autoComplete="name"
											aria-invalid={
												!!errorForField('cust-name', validationErrors)
											}
											aria-describedby={
												errorForField('cust-name', validationErrors)
													? 'cust-name-error'
													: 'cust-name-hint'
											}
											className="w-full bg-transparent py-1 font-[family-name:var(--font-literata)] text-[30px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/40 focus-visible:placeholder:text-[var(--color-text-subtle)]/60 sm:text-[38px]"
											style={{
												fontWeight: 500,
												letterSpacing: '-0.022em',
												lineHeight: 1.2,
											}}
										/>
										{errorForField('cust-name', validationErrors) && (
											<p
												id="cust-name-error"
												className="mt-2 font-[family-name:var(--font-archivo)] italic"
												style={{
													fontSize: '12px',
													color: 'var(--color-signal-red)',
												}}
											>
												{errorForField('cust-name', validationErrors)}
											</p>
										)}
										<p
											id="cust-name-hint"
											className="mt-3 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
											style={{ fontSize: '13px', lineHeight: 1.55 }}
										>
											{isFromRfq
												? 'Review the details below. Any edits here only apply to this quote.'
												: 'Start with a name. Everything else is optional until you send.'}
										</p>

										{/* Horizon rule */}
										<div
											aria-hidden="true"
											className="my-10 h-px"
											style={{
												backgroundColor: 'var(--color-border)',
												opacity: 0.6,
											}}
										/>

										{/* Field strata */}
										<div className="flex flex-col gap-10">
											<FieldGroup label="contact">
												<HairlineField
													label="phone"
													htmlFor="cust-phone"
													error={errorForField('cust-phone', validationErrors)}
												>
													<PhoneInput
														id="cust-phone"
														value={custPhone}
														onChange={setCustPhone}
														ariaInvalid={
															!!errorForField('cust-phone', validationErrors)
														}
														ariaDescribedBy={
															errorForField('cust-phone', validationErrors)
																? 'cust-phone-error'
																: undefined
														}
													/>
												</HairlineField>
												<div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
													<HairlineField
														label="email"
														htmlFor="cust-email"
														error={errorForField(
															'cust-email',
															validationErrors,
														)}
													>
														<input
															id="cust-email"
															type="email"
															value={custEmail}
															onChange={(e) => setCustEmail(e.target.value)}
															placeholder="—"
															autoComplete="email"
															inputMode="email"
															aria-invalid={
																!!errorForField('cust-email', validationErrors)
															}
															aria-describedby={
																errorForField('cust-email', validationErrors)
																	? 'cust-email-error'
																	: undefined
															}
															className="w-full bg-transparent font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/40"
															style={{
																fontSize: '14px',
																letterSpacing: '-0.005em',
															}}
														/>
													</HairlineField>
													<HairlineField
														label="company"
														htmlFor="cust-company"
														error={errorForField(
															'cust-company',
															validationErrors,
														)}
													>
														<input
															id="cust-company"
															type="text"
															value={custCompany}
															onChange={(e) => setCustCompany(e.target.value)}
															placeholder="—"
															autoComplete="organization"
															aria-invalid={
																!!errorForField(
																	'cust-company',
																	validationErrors,
																)
															}
															aria-describedby={
																errorForField('cust-company', validationErrors)
																	? 'cust-company-error'
																	: undefined
															}
															className="w-full bg-transparent font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/40"
															style={{
																fontSize: '14px',
																letterSpacing: '-0.005em',
															}}
														/>
													</HairlineField>
												</div>
											</FieldGroup>

											<FieldGroup label="delivery">
												<HairlineField
													label="site address"
													htmlFor="cust-address"
													error={errorForField(
														'cust-address',
														validationErrors,
													)}
												>
													<input
														id="cust-address"
														type="text"
														value={deliveryAddress}
														onChange={(e) => setDeliveryAddress(e.target.value)}
														placeholder="Where the order ships to"
														autoComplete="street-address"
														aria-invalid={
															!!errorForField('cust-address', validationErrors)
														}
														aria-describedby={
															errorForField('cust-address', validationErrors)
																? 'cust-address-error'
																: undefined
														}
														className="w-full bg-transparent font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/40"
														style={{
															fontSize: '14px',
															letterSpacing: '-0.005em',
														}}
													/>
												</HairlineField>
											</FieldGroup>
										</div>

										{/* Summary of unresolved errors — inline errors still show next
										    to each field; this block gives an overview + screen-reader
										    announcement when validation fires. */}
										{validationErrors.length > 0 && (
											<div
												role="alert"
												aria-live="polite"
												className="mt-8 ps-4"
												style={{
													borderInlineStart:
														'1px solid var(--color-signal-red)',
												}}
											>
												<p
													className="mb-1 font-[family-name:var(--font-archivo)] italic"
													style={{
														fontSize: '11px',
														color: 'var(--color-signal-red)',
														letterSpacing: '0.005em',
													}}
												>
													{validationErrors.length === 1
														? '1 field needs attention'
														: `${validationErrors.length} fields need attention`}
												</p>
												<ul className="space-y-0.5">
													{validationErrors.map((err) => (
														<li
															key={err}
															className="font-[family-name:var(--font-archivo)] italic"
															style={{
																fontSize: '13px',
																lineHeight: 1.55,
																color: 'var(--color-signal-red)',
															}}
														>
															{err}
														</li>
													))}
												</ul>
											</div>
										)}

										{/* Action bar */}
										<div
											className="mt-12 flex flex-col-reverse items-stretch gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between"
											style={{ borderTop: '1px solid var(--color-border)' }}
										>
											<p
												aria-hidden="true"
												className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
												style={{ fontSize: '11px' }}
											>
												press{' '}
												<kbd
													className="font-[family-name:var(--font-plex-mono)] text-[var(--color-text-muted)]"
													style={{ fontSize: '10px' }}
												>
													Enter
												</kbd>{' '}
												to continue
												{onBack && (
													<>
														{' · '}
														<kbd
															className="font-[family-name:var(--font-plex-mono)] text-[var(--color-text-muted)]"
															style={{ fontSize: '10px' }}
														>
															Esc
														</kbd>{' '}
														to cancel
													</>
												)}
											</p>
											<EmployeeActionButton
												type="button"
												onClick={() => tryGoToStep(2)}
												disabled={isPersistingCustomer}
												aria-disabled={isPersistingCustomer}
												fullWidthOnMobile
												trailing={
													<ArrowRight
														size={14}
														strokeWidth={2.25}
														aria-hidden="true"
													/>
												}
											>
												{isPersistingCustomer
													? 'Saving customer'
													: 'Build quote'}
											</EmployeeActionButton>
										</div>
									</section>
								</motion.div>
							)}

							{/* ==================== STEP 2: Build Quote ==================== */}
							{currentStep === 2 && (
								<motion.div
									key="step-2"
									initial={reduceMotion ? false : { opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={reduceMotion ? undefined : stepExit}
									transition={reduceMotion ? { duration: 0 } : stepTransition}
								>
									{/* Section rule — matches Step 1's eyebrow vocabulary */}
									<div className="mt-6 flex items-center gap-4">
										<span
											className="shrink-0 font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
											style={{
												fontSize: '11px',
												letterSpacing: '0.08em',
											}}
										>
											02
										</span>
										<span
											className="shrink-0 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
											style={{ fontSize: '12px' }}
										>
											build quote
										</span>
										<div
											aria-hidden="true"
											className="h-px flex-1"
											style={{
												backgroundColor: 'var(--color-border)',
												opacity: 0.6,
											}}
										/>
										<span
											className="shrink-0 font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
											style={{
												fontSize: '11px',
												letterSpacing: '0.08em',
											}}
										>
											{rfqReference}
										</span>
									</div>

									{/* Customer dedication — proper running head with a
									    subhead that counts the entry as it's being built. */}
									<header className="mt-6 mb-5">
										<div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
											<div className="min-w-0 flex-1">
												<h2
													className="break-words font-[family-name:var(--font-literata)] text-[var(--color-text)]"
													style={{
														fontSize: '30px',
														fontWeight: 500,
														letterSpacing: '-0.02em',
														lineHeight: 1.08,
													}}
												>
													{customerName || 'customer'}
												</h2>
												<p
													className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-[family-name:var(--font-archivo)] italic"
													style={{
														fontSize: '11.5px',
														color: 'var(--color-text-muted)',
														letterSpacing: '0.003em',
													}}
												>
													{customerTier && (
														<>
															<span>tier {customerTier.toLowerCase()}</span>
															<span aria-hidden="true" className="opacity-60">
																·
															</span>
														</>
													)}
													<span
														className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums"
														style={{ letterSpacing: '0.04em' }}
													>
														{(watchedItems ?? []).length}{' '}
														{(watchedItems ?? []).length === 1
															? 'line'
															: 'lines'}
													</span>
													<span aria-hidden="true" className="opacity-60">
														·
													</span>
													<span
														className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums"
														style={{ letterSpacing: '0.04em' }}
													>
														{subtotal > 0
															? `${Math.round(subtotal).toLocaleString('en-EG')} EGP subtotal`
															: 'still building the entry'}
													</span>
												</p>
											</div>
											<EmployeeActionButton
												type="button"
												onClick={() =>
													window.open(`/api/call/${rfqId}`, '_blank')
												}
												aria-label={`Call ${customerName || 'customer'}`}
												size="sm"
												trailing={<span aria-hidden="true">→</span>}
											>
												Call customer
											</EmployeeActionButton>
										</div>
									</header>

									{outdatedItems.length > 0 && (
										<OutdatedPricesBanner
											outdatedCount={outdatedItems.length}
											urgentCount={
												outdatedItems.filter((it) => it.recentlyOrdered).length
											}
											pendingRequest={unrequestedOutdatedItems.length}
											isRequesting={requestUpdateMutation.isPending}
											allRequested={unrequestedOutdatedItems.length === 0}
											onRequestAll={() =>
												handleRequestPriceUpdate(unrequestedOutdatedItems)
											}
										/>
									)}

									{/* Line items */}
									<div className="mt-6">
										<div className="lg:hidden">
											{(watchedItems ?? []).map((item, i) => {
												const level =
													marginThresholds.length > 0
														? getMarginLevel(
																item.marginPercent || 0,
																marginThresholds[0],
															)
														: 'green'
												const marginColor = {
													green: 'var(--color-primary)',
													yellow: 'var(--color-signal-amber)',
													red: 'var(--color-signal-red)',
													blocked: 'var(--color-signal-red)',
												}[level]
												const sourceState = sourcingState[i]
												return (
													<QuoteLineCard
														key={item.id || i}
														item={item}
														index={i}
														marginColor={marginColor}
														sourceLabel={getSourceLabel(
															sourceState?.sourceId ?? '',
															sourceState?.stockAvailable ?? 0,
														)}
														onReplace={() => {
															setSearchOpen(true)
															replaceItemIndexRef.current = i
														}}
														onSelectSource={() => setTableSourceOpen(i)}
														onQuantityChange={(next) => {
															methods.setValue(
																`lineItems.${i}.quantity`,
																next,
																{ shouldDirty: true },
															)
															const sellPrice = item.sellPrice || 0
															methods.setValue(
																`lineItems.${i}.lineTotal`,
																Math.round(sellPrice * next * 100) / 100,
																{ shouldDirty: true },
															)
														}}
														onEditMargin={() => {
															setMapOpen(false)
															setMarginIndex(i)
														}}
														onRemove={() => removeItem(i)}
													/>
												)
											})}
										</div>
										<table
											className="hidden w-full lg:table"
											aria-label={`Line items (${(watchedItems ?? []).length})`}
										>
											<caption className="sr-only">
												Quote line items. Each row shows the product, quantity,
												source, supplier cost, margin, sell price, and line
												total.
											</caption>
											<thead>
												<tr
													style={{
														borderBottom: '1px solid var(--color-border)',
													}}
												>
													<th
														scope="col"
														className="ps-2 pe-1 py-2.5 text-start font-[family-name:var(--font-plex-mono)] uppercase"
														style={{
															fontSize: '9.5px',
															color: 'var(--color-text-subtle)',
															letterSpacing: '0.22em',
															fontWeight: 500,
															width: '32px',
														}}
													>
														№
													</th>
													<th
														scope="col"
														className="px-3 py-2.5 text-start font-[family-name:var(--font-archivo)] italic"
														style={{
															fontSize: '11px',
															color: 'var(--color-text-subtle)',
															fontWeight: 400,
														}}
													>
														item
													</th>
													<th
														scope="col"
														className="px-3 py-2.5 text-end font-[family-name:var(--font-archivo)] italic"
														style={{
															fontSize: '11px',
															color: 'var(--color-text-subtle)',
															fontWeight: 400,
														}}
													>
														source
													</th>
													<th
														scope="col"
														className="px-3 py-2.5 text-end font-[family-name:var(--font-archivo)] italic"
														style={{
															fontSize: '11px',
															color: 'var(--color-text-subtle)',
															fontWeight: 400,
														}}
													>
														qty
													</th>
													<th
														scope="col"
														className="px-3 py-2.5 text-end font-[family-name:var(--font-archivo)] italic"
														style={{
															fontSize: '11px',
															color: 'var(--color-text-subtle)',
															fontWeight: 400,
														}}
													>
														cost
													</th>
													<th
														scope="col"
														className="px-3 py-2.5 text-end font-[family-name:var(--font-archivo)] italic"
														style={{
															fontSize: '11px',
															color: 'var(--color-text-subtle)',
															fontWeight: 400,
														}}
													>
														margin
													</th>
													<th
														scope="col"
														className="px-3 py-2.5 text-end font-[family-name:var(--font-archivo)] italic"
														style={{
															fontSize: '11px',
															color: 'var(--color-text-subtle)',
															fontWeight: 400,
														}}
													>
														price
													</th>
													<th
														scope="col"
														className="px-3 py-2.5 text-end font-[family-name:var(--font-archivo)] italic"
														style={{
															fontSize: '11px',
															color: 'var(--color-text-subtle)',
															fontWeight: 400,
														}}
													>
														total
													</th>
													<th scope="col" className="w-8 py-2.5">
														<span className="sr-only">Remove item</span>
													</th>
												</tr>
											</thead>
											<tbody>
												{(watchedItems ?? []).map((item, i) => {
													const level =
														marginThresholds.length > 0
															? getMarginLevel(
																	item.marginPercent || 0,
																	marginThresholds[0],
																)
															: 'green'
													const marginColor = {
														green: 'var(--color-primary)',
														yellow: 'var(--color-signal-amber)',
														red: 'var(--color-signal-red)',
														blocked: 'var(--color-signal-red)',
													}[level]
													const sourceState = sourcingState[i]
													return (
														<tr
															key={item.id || i}
															className="daybook-row group/row"
															style={{
																opacity:
																	item.priceStatus === 'outdated' ? 0.88 : 1,
															}}
														>
															{/* Ledger number — running count of entries. */}
															<td className="ps-2 pe-1 py-4 align-top">
																<span
																	className="font-[family-name:var(--font-plex-mono)] tabular-nums"
																	style={{
																		fontSize: '10.5px',
																		color: 'var(--color-text-subtle)',
																		letterSpacing: '0.04em',
																	}}
																>
																	{(i + 1).toString().padStart(2, '0')}
																</span>
															</td>
															{/* Item — product name + price status */}
															<td className="px-3 py-4 align-top">
																<div className="flex items-baseline gap-2">
																	<button
																		type="button"
																		onClick={() => {
																			setSearchOpen(true)
																			replaceItemIndexRef.current = i
																		}}
																		className="group relative text-start font-[family-name:var(--font-archivo)] outline-none transition-colors hover:text-[var(--color-primary)] focus-visible:text-[var(--color-primary)]"
																		style={{
																			fontSize: '14px',
																			fontWeight: 500,
																			color: 'var(--color-text)',
																			letterSpacing: '-0.005em',
																		}}
																		aria-label={`Replace ${item.productName}`}
																	>
																		<span className="relative">
																			{item.productName}
																			<span
																				aria-hidden="true"
																				className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
																			/>
																		</span>
																	</button>
																	<PriceStatusBadge
																		priceStatus={item.priceStatus ?? 'updated'}
																		recentlyOrdered={
																			item.recentlyOrdered ?? false
																		}
																	/>
																</div>
																{item.specification && (
																	<p
																		className="mt-0.5 font-[family-name:var(--font-archivo)] italic"
																		style={{
																			fontSize: '11px',
																			color: 'var(--color-text-subtle)',
																		}}
																	>
																		{item.specification}
																	</p>
																)}
															</td>
															{/* Source */}
															<td className="px-3 py-4 text-end align-top">
																<button
																	type="button"
																	onClick={() => setTableSourceOpen(i)}
																	className="inline-flex max-w-[150px] items-center justify-end rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-end font-[family-name:var(--font-archivo)] text-[11px] font-semibold text-[var(--color-text)] outline-none transition-colors hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
																	aria-label={`Choose source for ${item.productName}`}
																>
																	<span className="truncate">
																		{getSourceLabel(
																			sourceState?.sourceId ?? '',
																			sourceState?.stockAvailable ?? 0,
																		)}
																	</span>
																</button>
															</td>
															{/* Qty — editable inline */}
															<td className="px-3 py-4 text-end align-top">
																<input
																	type="number"
																	min={1}
																	step={1}
																	value={item.quantity ?? ''}
																	onChange={(e) => {
																		const raw = Number(e.target.value)
																		const next =
																			Number.isFinite(raw) && raw > 0 ? raw : 1
																		methods.setValue(
																			`lineItems.${i}.quantity`,
																			next,
																			{ shouldDirty: true },
																		)
																		const sellPrice = item.sellPrice || 0
																		methods.setValue(
																			`lineItems.${i}.lineTotal`,
																			Math.round(sellPrice * next * 100) / 100,
																			{ shouldDirty: true },
																		)
																	}}
																	onFocus={(e) => e.currentTarget.select()}
																	onKeyDown={(e) => {
																		if (e.key === 'Enter') {
																			e.preventDefault()
																			;(
																				e.currentTarget as HTMLInputElement
																			).blur()
																		}
																	}}
																	aria-label={`Quantity for ${item.productName}`}
																	className="w-20 bg-transparent text-end font-[family-name:var(--font-plex-mono)] tabular-nums outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-primary)]"
																	style={{
																		fontSize: '13px',
																		color: 'var(--color-text)',
																		fontWeight: 500,
																	}}
																/>
															</td>
															{/* Cost */}
															<td
																className="px-3 py-4 text-end align-top font-[family-name:var(--font-plex-mono)] tabular-nums"
																style={{
																	fontSize: '13px',
																	color: 'var(--color-text-muted)',
																}}
															>
																{item.supplierCost
																	? item.supplierCost.toLocaleString('en-EG')
																	: '—'}
															</td>
															{/* Margin — opens editor */}
															<td className="px-3 py-4 text-end align-top">
																<button
																	type="button"
																	onClick={() => {
																		setMapOpen(false)
																		setMarginIndex(i)
																	}}
																	aria-label={`Edit margin for ${item.productName}, currently ${item.marginPercent || 0}%`}
																	className="group inline-flex items-baseline gap-1.5 font-[family-name:var(--font-plex-mono)] tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
																	style={{
																		fontSize: '13px',
																		fontWeight: 500,
																		color: 'var(--color-text)',
																	}}
																>
																	<span
																		aria-hidden="true"
																		className="shrink-0 self-center rounded-full"
																		style={{
																			width: 6,
																			height: 6,
																			backgroundColor: marginColor,
																		}}
																	/>
																	<span className="relative">
																		{item.marginPercent || 0}%
																		<span
																			aria-hidden="true"
																			className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[var(--color-primary)] transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
																		/>
																	</span>
																</button>
															</td>
															{/* Price */}
															<td
																className="px-3 py-4 text-end align-top font-[family-name:var(--font-plex-mono)] tabular-nums"
																style={{
																	fontSize: '14px',
																	color: 'var(--color-text)',
																	fontWeight: 500,
																}}
															>
																{item.sellPrice
																	? item.sellPrice.toLocaleString('en-EG')
																	: '—'}
															</td>
															{/* Total */}
															<td
																className="px-3 py-4 text-end align-top font-[family-name:var(--font-plex-mono)] tabular-nums"
																style={{
																	fontSize: '15px',
																	color: 'var(--color-text)',
																	fontWeight: 600,
																}}
															>
																{(item.lineTotal || 0).toLocaleString('en-EG', {
																	minimumFractionDigits: 2,
																})}
															</td>
															{/* Strike — remove this entry. Typographic × fades
															    in on row hover so it never competes with data. */}
															<td className="py-4 text-center align-top">
																<button
																	type="button"
																	onClick={() => removeItem(i)}
																	aria-label={`Remove ${item.productName}`}
																	className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent opacity-70 outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--color-signal-red)]/40 hover:border-[var(--color-signal-red)]/30 hover:bg-[var(--color-signal-red)]/[0.08] hover:text-[var(--color-signal-red)] group-hover/row:opacity-100"
																	style={{
																		color: 'var(--color-text-subtle)',
																	}}
																>
																	<span
																		aria-hidden="true"
																		style={{
																			fontFamily: 'var(--font-literata)',
																			fontStyle: 'italic',
																			fontSize: '16px',
																			lineHeight: 1,
																		}}
																	>
																		×
																	</span>
																</button>
															</td>
														</tr>
													)
												})}
											</tbody>
										</table>

										{(watchedItems ?? []).length === 0 && (
											<div className="mt-4 flex justify-center border-t border-[var(--color-border)] pt-10">
												<EmployeeActionButton
													type="button"
													onClick={() => setSearchOpen(true)}
													tone="success"
													trailing={<span aria-hidden="true">→</span>}
												>
													Add first line
												</EmployeeActionButton>
											</div>
										)}
									</div>

									{/* Add another — secondary word-action when the ledger
									    already has entries. The empty-state invitation above
									    handles the first add, so this one stays quiet. */}
									{(watchedItems ?? []).length > 0 && (
										<EmployeeActionButton
											type="button"
											onClick={() => setSearchOpen(true)}
											tone="neutral"
											size="sm"
											className="mt-4"
										>
											Add another line
										</EmployeeActionButton>
									)}

									<ProductSearchMenu
										isOpen={searchOpen}
										onClose={() => {
											setSearchOpen(false)
											replaceItemIndexRef.current = null
										}}
										mode={
											replaceItemIndexRef.current !== null
												? 'replace'
												: 'append'
										}
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

									{/* Delivery section — own rule eyebrow + hairline input */}
									<div ref={deliverySectionRef} className="mt-12">
										<div className="flex items-center gap-4 mb-4">
											<span
												className="shrink-0 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
												style={{ fontSize: '12px' }}
											>
												delivery
											</span>
											<div
												aria-hidden="true"
												className="h-px flex-1"
												style={{
													backgroundColor: isDeliveryDateAttentionVisible
														? 'var(--color-signal-red)'
														: 'var(--color-border)',
													opacity: isDeliveryDateAttentionVisible ? 1 : 0.6,
												}}
											/>
										</div>

										<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-baseline">
											<label htmlFor="delivery-address" className="sr-only">
												Delivery address
											</label>
											<svg
												aria-hidden="true"
												width="12"
												height="12"
												viewBox="0 0 14 14"
												fill="none"
												className="shrink-0 self-center text-[var(--color-text-subtle)]"
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
											<div
												className="w-full min-w-0 flex-1 pb-1.5 transition-colors"
												style={{
													borderBottom: '1px solid var(--color-border)',
												}}
											>
												<input
													id="delivery-address"
													type="text"
													value={deliveryAddress}
													onChange={(e) => setDeliveryAddress(e.target.value)}
													onFocus={() => {
														setMarginIndex(null)
														setMapOpen(true)
													}}
													placeholder="Click to pick on map"
													autoComplete="street-address"
													className="w-full bg-transparent font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/50"
													style={{
														fontSize: '13px',
														letterSpacing: '-0.005em',
													}}
												/>
											</div>
											<EmployeeActionButton
												type="button"
												onClick={() => {
													setMarginIndex(null)
													setMapOpen((open) => !open)
												}}
												aria-expanded={mapOpen}
												aria-controls="delivery-map-panel"
												tone="neutral"
												size="sm"
											>
												{mapOpen ? 'Hide map' : 'Pick on map'}
											</EmployeeActionButton>
										</div>
										<DeliveryTerms
											deliveryAddress={deliveryAddress}
											highlightDate={isDeliveryDateAttentionVisible}
											totalWeightTons={12}
											leadTimeDays={2}
										/>
									</div>

									{/* Validation errors — inline style matches Step 1 */}
									{validationErrors.length > 0 && (
										<div
											role="alert"
											aria-live="polite"
											className="mt-6 ps-4"
											style={{
												borderInlineStart: '1px solid var(--color-signal-red)',
											}}
										>
											<p
												className="mb-1 font-[family-name:var(--font-archivo)] italic"
												style={{
													fontSize: '11px',
													color: 'var(--color-signal-red)',
													letterSpacing: '0.005em',
												}}
											>
												{validationErrors.length === 1
													? '1 thing needs attention'
													: `${validationErrors.length} things need attention`}
											</p>
											<ul className="space-y-0.5">
												{validationErrors.map((err) => (
													<li
														key={err}
														className="font-[family-name:var(--font-archivo)] italic"
														style={{
															fontSize: '13px',
															lineHeight: 1.55,
															color: 'var(--color-signal-red)',
														}}
													>
														{err}
													</li>
												))}
											</ul>
										</div>
									)}
								</motion.div>
							)}

							{/* ==================== STEP 3: Review & Submit ==================== */}
							{currentStep === 3 && (
								<motion.div
									key="step-3"
									initial={reduceMotion ? false : { opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={reduceMotion ? undefined : stepExit}
									transition={reduceMotion ? { duration: 0 } : stepTransition}
									className="flex items-start justify-center pt-8 sm:pt-16"
								>
									<section
										aria-label="Final review"
										className="w-full max-w-3xl"
									>
										{/* Section rule — mono step · italic phase · rfq imprint */}
										<div className="mb-8 flex items-center gap-4">
											<span
												className="shrink-0 font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
												style={{
													fontSize: '11px',
													letterSpacing: '0.08em',
												}}
											>
												03
											</span>
											<span
												className="shrink-0 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
												style={{ fontSize: '12px' }}
											>
												final read
											</span>
											<div
												aria-hidden="true"
												className="h-px flex-1"
												style={{
													backgroundColor: 'var(--color-border)',
													opacity: 0.6,
												}}
											/>
											<span
												className="shrink-0 font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
												style={{
													fontSize: '11px',
													letterSpacing: '0.08em',
												}}
											>
												{rfqReference}
											</span>
										</div>

										{/* Tier annotation */}
										{customerTier && (
											<p
												className="mb-2 font-[family-name:var(--font-archivo)] italic text-[var(--color-primary)]"
												style={{
													fontSize: '11px',
													letterSpacing: '0.005em',
												}}
											>
												<span className="sr-only">Customer tier: </span>
												tier {customerTier.toLowerCase()}
											</p>
										)}

										{/* Headline — Literata, parallel to Step 1 */}
										<h2
											className="break-words py-1 font-[family-name:var(--font-literata)] text-[30px] text-[var(--color-text)] sm:text-[38px]"
											style={{
												fontWeight: 500,
												letterSpacing: '-0.022em',
												lineHeight: 1.2,
											}}
										>
											{customerName}
										</h2>

										{/* Lede */}
										<p
											className="mt-3 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
											style={{ fontSize: '13px', lineHeight: 1.55 }}
										>
											The customer sees these numbers verbatim. Read once, then
											commit.
										</p>

										{/* Horizon rule */}
										<div
											aria-hidden="true"
											className="my-10 h-px"
											style={{
												backgroundColor: 'var(--color-border)',
												opacity: 0.6,
											}}
										/>

										{/* Ledger eyebrow */}
										<div className="mb-3 flex items-baseline gap-3">
											<span
												className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
												style={{ fontSize: '11px' }}
											>
												ledger
											</span>
											<span
												className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-muted)]"
												style={{
													fontSize: '11px',
													letterSpacing: '0.04em',
												}}
											>
												· {watchedItems?.length ?? 0} item
												{(watchedItems?.length ?? 0) === 1 ? '' : 's'}
											</span>
										</div>

										{/* Items ledger */}
										<div>
											<div className="lg:hidden">
												{(watchedItems ?? []).map((item, idx) => (
													<ReviewLineCard key={item.id || idx} item={item} />
												))}
											</div>
											<table className="hidden w-full lg:table">
												<thead>
													<tr
														style={{
															borderBottom: '1px solid var(--color-border)',
														}}
													>
														<th
															scope="col"
															className="py-2 text-start font-[family-name:var(--font-archivo)] italic font-normal text-[var(--color-text-subtle)]"
															style={{ fontSize: '11px' }}
														>
															item
														</th>
														<th
															scope="col"
															className="py-2 text-end font-[family-name:var(--font-archivo)] italic font-normal text-[var(--color-text-subtle)]"
															style={{ fontSize: '11px' }}
														>
															qty
														</th>
														<th
															scope="col"
															className="py-2 text-end font-[family-name:var(--font-archivo)] italic font-normal text-[var(--color-text-subtle)]"
															style={{ fontSize: '11px' }}
														>
															cost
														</th>
														<th
															scope="col"
															className="py-2 text-end font-[family-name:var(--font-archivo)] italic font-normal text-[var(--color-text-subtle)]"
															style={{ fontSize: '11px' }}
														>
															margin
														</th>
														<th
															scope="col"
															className="py-2 text-end font-[family-name:var(--font-archivo)] italic font-normal text-[var(--color-text-subtle)]"
															style={{ fontSize: '11px' }}
														>
															price
														</th>
														<th
															scope="col"
															className="py-2 text-end font-[family-name:var(--font-archivo)] italic font-normal text-[var(--color-text-subtle)]"
															style={{ fontSize: '11px' }}
														>
															total
														</th>
													</tr>
												</thead>
												<tbody>
													{(watchedItems ?? []).map((item, idx) => (
														<tr
															key={item.id || idx}
															style={{
																borderBottom: '1px solid var(--color-border)',
																opacity: 0.95,
															}}
														>
															<td
																className="py-3 pe-4 font-[family-name:var(--font-archivo)] text-[var(--color-text)]"
																style={{
																	fontSize: '14px',
																	letterSpacing: '-0.005em',
																}}
															>
																{item.productName}
															</td>
															<td
																className="py-3 text-end font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-muted)]"
																style={{ fontSize: '12px' }}
															>
																{item.quantity}
															</td>
															<td
																className="py-3 text-end font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-muted)]"
																style={{ fontSize: '12px' }}
															>
																{item.supplierCost?.toLocaleString('en-EG') ??
																	'—'}
															</td>
															<td
																className="py-3 text-end font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-muted)]"
																style={{ fontSize: '12px' }}
															>
																{item.marginPercent}%
															</td>
															<td
																className="py-3 text-end font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text)]"
																style={{ fontSize: '12px' }}
															>
																{item.sellPrice?.toLocaleString('en-EG')}
															</td>
															<td
																className="py-3 text-end font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text)]"
																style={{
																	fontSize: '13px',
																	fontWeight: 500,
																}}
															>
																{(item.lineTotal || 0).toLocaleString('en-EG', {
																	minimumFractionDigits: 2,
																})}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>

										{/* Totals lockup — page anchor */}
										<div className="mt-8 flex flex-col items-stretch gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
											<div
												className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
												style={{
													fontSize: '12px',
													lineHeight: 1.6,
												}}
											>
												<span>
													blended margin{' '}
													<span
														className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums text-[var(--color-text)]"
														style={{ letterSpacing: '0.01em' }}
													>
														{blendedMargin}%
													</span>
												</span>
												<br />
												<span>
													vat{' '}
													<span
														className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums text-[var(--color-text)]"
														style={{ letterSpacing: '0.01em' }}
													>
														{vatAmount.toLocaleString('en-EG', {
															minimumFractionDigits: 2,
														})}
													</span>
												</span>
											</div>
											<div className="min-w-0 text-end">
												<p
													className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
													style={{
														fontSize: '11px',
														letterSpacing: '0.005em',
													}}
												>
													total
												</p>
												<p
													className="mt-1 break-words py-1 font-[family-name:var(--font-literata)] text-[34px] tabular-nums text-[var(--color-text)] sm:text-[44px] lg:text-[52px]"
													style={{
														fontWeight: 500,
														letterSpacing: '-0.035em',
														lineHeight: 1.1,
													}}
												>
													{total.toLocaleString('en-EG', {
														minimumFractionDigits: 2,
													})}
													<span
														className="ms-2 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
														style={{
															fontSize: '15px',
															fontWeight: 400,
															letterSpacing: '0.005em',
														}}
													>
														egp
													</span>
												</p>
											</div>
										</div>

										{/* Horizon rule */}
										<div
											aria-hidden="true"
											className="my-10 h-px"
											style={{
												backgroundColor: 'var(--color-border)',
												opacity: 0.6,
											}}
										/>

										{/* Strata — delivery / terms / evaluation */}
										<dl className="flex flex-col gap-0">
											<ReviewStratum label="delivery">
												<p
													className="font-[family-name:var(--font-archivo)] text-[var(--color-text)]"
													style={{
														fontSize: '14px',
														letterSpacing: '-0.005em',
													}}
												>
													{deliveryAddress || (
														<span className="italic text-[var(--color-text-subtle)]">
															no address yet
														</span>
													)}
												</p>
												<div
													className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
													style={{ fontSize: '11px' }}
												>
													{methods.getValues('deliveryDate') && (
														<span>
															date{' '}
															<span
																className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums text-[var(--color-text)]"
																style={{ letterSpacing: '0.01em' }}
															>
																{methods.getValues('deliveryDate')}
															</span>
														</span>
													)}
													{(() => {
														const WINDOW_LABELS: Record<string, string> = {
															'08:00-13:00': 'morning · 08:00–13:00',
															'13:00-17:00': 'midday · 13:00–17:00',
															'17:00-20:00': 'evening · 17:00–20:00',
															'00:00-06:00': 'night · 00:00–06:00',
														}
														const win =
															methods.getValues('deliveryWindow') ??
															'08:00-13:00'
														return (
															<span>
																window{' '}
																<span className="not-italic text-[var(--color-text)]">
																	{WINDOW_LABELS[win] ?? win}
																</span>
															</span>
														)
													})()}
													{methods.getValues('specialInstructions') && (
														<span>
															notes{' '}
															<span className="not-italic text-[var(--color-text)]">
																{methods.getValues('specialInstructions')}
															</span>
														</span>
													)}
												</div>
											</ReviewStratum>

											<ReviewStratum label="terms">
												<div
													className="flex flex-wrap items-baseline gap-x-6 gap-y-1 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
													style={{ fontSize: '12px' }}
												>
													<span>
														payment{' '}
														<span className="not-italic text-[var(--color-text)]">
															bank transfer / cash
														</span>
													</span>
													<span>
														valid{' '}
														<span
															className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums text-[var(--color-text)]"
															style={{ letterSpacing: '0.01em' }}
														>
															{methods.getValues('validityDays') ?? 14}d
														</span>
													</span>
												</div>
											</ReviewStratum>

											<ReviewStratum label="evaluation" align="start">
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
													showRequestAction={false}
												/>
												{status === 'pending_approval' && (
													<p
														className="mt-3 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
														style={{
															fontSize: '12px',
															lineHeight: 1.55,
														}}
													>
														submitted for evaluation. your manager will review
														and send to the customer.
													</p>
												)}
											</ReviewStratum>
										</dl>
									</section>
								</motion.div>
							)}
						</AnimatePresence>
					</FormProvider>
				</div>
			</div>

			{currentStep === 2 && (
				<footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[0_-14px_30px_-26px_rgba(0,0,0,0.55)] sm:px-6 lg:px-8">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div className="grid grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-6 sm:gap-y-2">
							<FooterAmount label="subtotal" value={subtotal} />
							<FooterAmount label="vat 14%" value={vatAmount} />
							<div className="min-w-0">
								<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--color-text-subtle)]">
									total
								</span>
								<span className="mt-0.5 block break-words font-[family-name:var(--font-plex-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
									EGP{' '}
									{total.toLocaleString('en-EG', {
										minimumFractionDigits: 2,
									})}
								</span>
							</div>
						</div>

						<div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
							<EmployeeActionButton
								type="button"
								onClick={() => goToStep(1)}
								tone="neutral"
								size="sm"
								leading={<span aria-hidden="true">←</span>}
							>
								Customer
							</EmployeeActionButton>
							<EmployeeStatusPill
								tone={outdatedItems.length > 0 ? 'warning' : 'success'}
								leading={
									outdatedItems.length > 0 ? (
										<CircleAlert
											size={14}
											strokeWidth={2.25}
											aria-hidden="true"
										/>
									) : (
										<CheckCircle2
											size={14}
											strokeWidth={2.5}
											aria-hidden="true"
										/>
									)
								}
							>
								{outdatedItems.length > 0
									? `${outdatedItems.length} price${outdatedItems.length === 1 ? '' : 's'} need update`
									: 'Ready to review'}
							</EmployeeStatusPill>
							<EmployeeActionButton
								type="button"
								onClick={() => tryGoToStep(3)}
								disabled={outdatedItems.length > 0}
								aria-disabled={outdatedItems.length > 0}
								trailing={
									<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />
								}
								fullWidthOnMobile
							>
								Review & submit
							</EmployeeActionButton>
						</div>
					</div>
				</footer>
			)}

			{currentStep === 3 && (
				<footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[0_-14px_30px_-26px_rgba(0,0,0,0.55)] sm:px-6 lg:px-8">
					<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
						<div className="grid grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-6 sm:gap-y-2">
							<FooterAmount label="margin" value={blendedMargin} suffix="%" />
							<FooterAmount label="vat 14%" value={vatAmount} />
							<div className="min-w-0">
								<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--color-text-subtle)]">
									total
								</span>
								<span className="mt-0.5 block break-words font-[family-name:var(--font-plex-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
									EGP{' '}
									{total.toLocaleString('en-EG', {
										minimumFractionDigits: 2,
									})}
								</span>
							</div>
						</div>

						<div className="flex min-w-0 flex-col gap-2 xl:items-end">
							<ApprovalWorkflow
								layout="footer"
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
								onSendBlockedChange={handleApprovalBlockedChange}
							/>
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
								<EmployeeActionButton
									type="button"
									onClick={() => goToStep(2)}
									tone="neutral"
									size="sm"
									leading={
										<span aria-hidden="true" className="rtl:rotate-180">
											←
										</span>
									}
								>
									Back to quote
								</EmployeeActionButton>
								<EmployeeStatusPill
									tone={canEvaluate ? 'success' : 'warning'}
									leading={
										canEvaluate ? (
											<CheckCircle2
												size={14}
												strokeWidth={2.5}
												aria-hidden="true"
											/>
										) : (
											<CircleAlert
												size={14}
												strokeWidth={2.25}
												aria-hidden="true"
											/>
										)
									}
								>
									{canEvaluate
										? 'Ready to evaluate · finance receives this order'
										: (approvalBlockReason ??
											'Evaluation blocked · quote is closed')}
								</EmployeeStatusPill>
								<EmployeeActionButton
									type="button"
									onClick={handleEvaluate}
									disabled={!canEvaluate || isEvaluating}
									aria-busy={isEvaluating}
									tone="success"
									fullWidthOnMobile
									trailing={
										!isEvaluating && (
											<ArrowRight
												size={14}
												strokeWidth={2.25}
												aria-hidden="true"
												className="rtl:rotate-180"
											/>
										)
									}
								>
									{isEvaluating ? 'Evaluating' : 'Evaluate & send to finance'}
								</EmployeeActionButton>
							</div>
						</div>
					</div>
				</footer>
			)}

			{/* Map side panel — DeliveryMap carries its own header/footer chrome. */}
			<SlidePanel
				isOpen={mapOpen && currentStep === 2}
				onClose={() => setMapOpen(false)}
				maxWidth={520}
				panelKey="map-overlay"
				ariaLabel="Pick delivery location"
				scope="sales"
			>
				<div
					className="h-full"
					style={{ backgroundColor: 'var(--color-surface)' }}
				>
					<ClientOnly
						fallback={
							<div className="flex h-full items-center justify-center">
								<span
									className="font-[family-name:var(--font-archivo)] italic"
									style={{
										fontSize: '12px',
										color: 'var(--color-text-subtle)',
									}}
								>
									loading map…
								</span>
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
