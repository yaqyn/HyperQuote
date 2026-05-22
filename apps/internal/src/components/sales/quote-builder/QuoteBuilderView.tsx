import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	ArrowRight,
	CheckCircle2,
	CircleAlert,
	Loader2,
	MoreHorizontal,
	Phone,
	RefreshCw,
	Save,
	Undo2,
	X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { FormProvider, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { ClientOnly } from '../../../lib/client-only'
import {
	isValidEmail,
	isValidText,
	normalizeArithmeticInput,
	normalizeDecimalInput,
	normalizeIntegerInput,
} from '../../../lib/inputs'
import { useInternalAuth } from '../../../lib/internal-auth'
import { computeSellPriceFromMargin } from '../../../lib/pricing-math'
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
import { resolveMarginThreshold } from '../../../types/sales'
import { EmployeeActionButton } from '../../shared/EmployeeControls'
import { isValidEGPhone, PhoneInput } from '../../shared/PhoneInput'
import { SlidePanel } from '../../shared/SlidePanel'
import {
	clampSalesMargin,
	getSalesMarginCap,
	getSalesMarginColor,
	SALES_MARGIN_BONUS_COLOR,
	SALES_MARGIN_CAP_PERCENT,
	SALES_MARGIN_FLOOR_COLOR,
	SALES_MARGIN_TARGET_COLOR,
} from '../marginPalette'
import { CallRFQDialog } from '../rfq/CallRFQDialog'
import { CancelRFQDialog } from '../rfq/CancelRFQDialog'
import { DeclineRFQDialog } from '../rfq/DeclineRFQDialog'
import {
	type ApprovalSignatureState,
	ApprovalWorkflow,
	QuoteSignatureSection,
} from './ApprovalWorkflow'
import { DeliveryTerms } from './DeliveryTerms'
import {
	type ProductCatalogSelection,
	ProductSearchMenu,
} from './ProductSearchMenu'
import type { LineItemFormValues, QuoteFormValues } from './types'

const DeliveryMap = lazy(() =>
	import('./DeliveryMap').then((module) => ({ default: module.DeliveryMap })),
)

interface QuoteBuilderViewProps {
	quoteId?: string
	rfqId: string
	isNewCustomer?: boolean
	initialCustomerCompany?: string
	initialCustomerEmail?: string
	initialCustomerName?: string
	initialCustomerPhone?: string
	initialDeliveryAddress?: string
	onBack?: () => void
	onSave?: () => void
}

interface InventoryPriceUpdateContact {
	available: boolean
	name: string
	phone: string | null
}

interface PriceUpdateNoticeState {
	inventoryContact: InventoryPriceUpdateContact | null
	requestedCount: number
	skippedDuplicate: number
	updatedAt: number
}

// Customer phone number is NEVER exposed to the frontend.
// Calls are initiated via server-side endpoint: /api/call/:rfqId
// The server resolves the number, initiates VoIP/SIP, and connects the employee.

const DELIVERY_DATE_REQUIRED_MESSAGE = 'Please select a delivery date'
const DELIVERY_ATTENTION_DURATION_MS = 1400
const MINIMUM_MARGIN_PERCENT = 0

function toNationalEgyptianMobile(value: string): string {
	const digits = value.replace(/\D/g, '')
	if (digits.startsWith('20') && digits.length >= 12) return digits.slice(2)
	if (digits.startsWith('0') && digits.length === 11) return digits.slice(1)
	return digits
}

function phoneHref(value: string | null | undefined): string | null {
	const cleaned = value?.replace(/[^\d+]/g, '') ?? ''
	return cleaned ? `tel:${cleaned}` : null
}

type PanelCurrency = 'EGP' | 'USD' | 'EUR' | 'SAR'
const PANEL_CURRENCIES: PanelCurrency[] = ['EGP', 'USD', 'EUR', 'SAR']
interface AutomaticExchangeRates {
	baseCurrency: 'EGP'
	rates: Record<PanelCurrency, number | null>
	updatedAt: string | null
	source: string
}
const EMPTY_EXCHANGE_RATES: AutomaticExchangeRates = {
	baseCurrency: 'EGP',
	rates: {
		EGP: 1,
		USD: null,
		EUR: null,
		SAR: null,
	},
	updatedAt: null,
	source: '',
}
type ItemEditMobileTool =
	| 'quantity'
	| 'budget'
	| 'exchange'
	| 'calculator'
	| 'inventory'

function CustomerFlowField({
	id,
	label,
	error,
	children,
	className = '',
}: {
	id: string
	label: string
	error?: string
	children: React.ReactNode
	className?: string
}) {
	const errorId = error ? `${id}-error` : undefined
	return (
		<div
			className={`grid min-w-0 gap-2 border-b border-[var(--color-border)] py-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5 ${className}`}
		>
			<label
				htmlFor={id}
				className="pt-1 font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase text-[var(--color-text-subtle)]"
				style={{ letterSpacing: 0 }}
			>
				{label}
			</label>
			<div className="min-w-0">
				{children}
				{error && (
					<p
						id={errorId}
						className="mt-2 font-[family-name:var(--font-archivo)] text-[11px] italic leading-5 text-[var(--color-signal-red)]"
					>
						{error}
					</p>
				)}
			</div>
		</div>
	)
}

function QuoteChromeAction({
	ariaLabel,
	children,
	onClick,
	tone = 'neutral',
}: {
	ariaLabel: string
	children: React.ReactNode
	onClick: () => void
	tone?: 'neutral' | 'danger'
}) {
	return (
		<button
			type="button"
			aria-label={ariaLabel}
			title={ariaLabel}
			onClick={onClick}
			className={`inline-flex h-7 w-7 items-center justify-center rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
				tone === 'danger'
					? 'text-red-700 hover:bg-red-600/[0.07] dark:text-red-300'
					: 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
			}`}
		>
			{children}
		</button>
	)
}

function WorkSection({
	label,
	meta,
	actions,
	children,
	className = '',
}: {
	label: string
	meta?: React.ReactNode
	actions?: React.ReactNode
	children: React.ReactNode
	className?: string
}) {
	return (
		<section className={className} aria-labelledby={`quote-work-${label}`}>
			<header className="flex min-h-10 items-center justify-between gap-3 py-2">
				<div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
					<h3
						id={`quote-work-${label}`}
						className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase text-[var(--color-text)]"
						style={{ letterSpacing: '0.1em' }}
					>
						{label}
					</h3>
					{meta && (
						<span
							className="min-w-0 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
							style={{ fontSize: '11px' }}
						>
							{meta}
						</span>
					)}
				</div>
				{actions && (
					<div className="flex shrink-0 items-center gap-1.5">{actions}</div>
				)}
			</header>
			<div>{children}</div>
		</section>
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

function PriceUpdateNotice({
	notice,
	onClose,
}: {
	notice: PriceUpdateNoticeState
	onClose: () => void
}) {
	const contact = notice.inventoryContact
	const callHref = phoneHref(contact?.phone)
	const affectedCount = notice.requestedCount + notice.skippedDuplicate
	const productLabel =
		affectedCount === 1
			? '1 item needs pricing'
			: `${affectedCount} items need pricing`

	return (
		<motion.div
			role="status"
			initial={{ opacity: 0, y: 8, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: 8, scale: 0.98 }}
			transition={{ duration: 0.16 }}
			className="absolute right-0 bottom-[calc(100%+0.5rem)] z-20 w-[min(24rem,calc(100vw-1.5rem))] rounded-md border border-red-500/25 bg-[var(--color-surface)] p-3 text-start shadow-[0_20px_54px_-30px_rgba(0,0,0,0.75)]"
		>
			<div className="flex min-w-0 items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-red-700 dark:text-red-300">
						Inventory notified
					</p>
					<p className="mt-1 text-[12px] leading-5 text-[var(--color-text-muted)]">
						{productLabel}. Do not confirm until inventory updates the supplier
						price.
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Dismiss inventory notification"
					className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-[var(--color-text-subtle)] outline-none transition-colors hover:bg-black/[0.04] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-red-500/30 dark:hover:bg-white/[0.06]"
				>
					<X size={14} strokeWidth={2.25} aria-hidden="true" />
				</button>
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-2">
				{callHref && contact ? (
					<a
						href={callHref}
						className="inline-flex min-h-9 min-w-0 items-center gap-2 rounded-md border border-red-500/25 bg-red-500/[0.08] px-3 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.08em] text-red-700 outline-none transition-colors hover:bg-red-500/[0.14] focus-visible:ring-2 focus-visible:ring-red-500/30 dark:text-red-300"
					>
						<Phone size={13} strokeWidth={2.25} aria-hidden="true" />
						<span className="min-w-0 truncate">Call {contact.name}</span>
					</a>
				) : (
					<span className="rounded-sm bg-red-500/[0.08] px-2 py-1 font-[family-name:var(--font-archivo)] text-[11px] font-semibold text-red-700 dark:text-red-300">
						No inventory phone recorded
					</span>
				)}
				{contact?.available && (
					<span className="rounded-sm bg-emerald-500/[0.1] px-2 py-1 font-[family-name:var(--font-archivo)] text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
						Online now
					</span>
				)}
			</div>
		</motion.div>
	)
}

function useCompactPanelLayout() {
	const [isCompact, setIsCompact] = useState(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return false
		return window.matchMedia(
			'(max-width: 1023px), (hover: none) and (pointer: coarse) and (max-width: 1279px)',
		).matches
	})

	useEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return
		const query = window.matchMedia(
			'(max-width: 1023px), (hover: none) and (pointer: coarse) and (max-width: 1279px)',
		)
		const update = () => setIsCompact(query.matches)
		update()
		query.addEventListener('change', update)
		return () => query.removeEventListener('change', update)
	}, [])

	return isCompact
}

function ReportEditAction({
	children,
	onClick,
}: {
	children: React.ReactNode
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			data-print-hidden="true"
			className="inline-flex h-8 shrink-0 items-center justify-center px-2 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase text-[var(--color-primary)] outline-none transition-colors hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
			style={{ letterSpacing: 0 }}
		>
			{children}
		</button>
	)
}

function ReportSectionBar({
	id,
	title,
	meta,
	onEdit,
}: {
	id?: string
	title: string
	meta?: React.ReactNode
	onEdit?: () => void
}) {
	return (
		<header className="flex min-h-12 items-end justify-between gap-3 border-b border-[var(--color-border)] px-4 pb-3 pt-5 sm:px-6">
			<div className="min-w-0">
				<h3
					id={id}
					className="font-[family-name:var(--font-literata)] text-[18px] font-medium leading-none text-[var(--color-text)]"
					style={{ letterSpacing: 0 }}
				>
					{title}
				</h3>
				{meta && (
					<p className="mt-1 min-w-0 font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-text-subtle)]">
						{meta}
					</p>
				)}
			</div>
			{onEdit && <ReportEditAction onClick={onEdit}>Edit</ReportEditAction>}
		</header>
	)
}

function ReportInfoCell({
	label,
	value,
	placeholder = false,
	onPress,
}: {
	label: string
	value: React.ReactNode
	placeholder?: boolean
	onPress?: () => void
}) {
	const content = (
		<>
			<span
				className="block font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase text-[var(--color-text-subtle)]"
				style={{ letterSpacing: 0 }}
			>
				{label}
			</span>
			<span
				className={`mt-2 block min-w-0 break-words font-[family-name:var(--font-literata)] text-[15px] leading-7 ${
					placeholder
						? 'italic text-[var(--color-text-subtle)]'
						: 'text-[var(--color-text)]'
				}`}
				style={{ letterSpacing: 0 }}
			>
				{value}
			</span>
		</>
	)

	const className =
		'min-w-0 px-4 py-4 text-start outline-none transition-colors sm:px-6'

	if (onPress) {
		return (
			<button
				type="button"
				onClick={onPress}
				className={`${className} hover:bg-black/[0.018] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 dark:hover:bg-white/[0.025]`}
			>
				{content}
			</button>
		)
	}

	return <div className={className}>{content}</div>
}

function ReviewReportTitle({
	customerName,
	orderNumber,
}: {
	customerName: string
	orderNumber: string
}) {
	return (
		<header
			data-print-title="true"
			className="px-5 py-8 sm:px-8 sm:py-10 lg:px-12"
		>
			<div className="max-w-[780px] border-b border-[var(--color-border)] pb-5">
				<h2
					className="font-[family-name:var(--font-literata)] text-[30px] font-medium leading-tight text-[var(--color-text)] sm:text-[38px]"
					style={{ letterSpacing: 0 }}
				>
					{customerName}
				</h2>
				<p className="mt-2 font-[family-name:var(--font-plex-mono)] text-[11px] uppercase text-[var(--color-text-subtle)]">
					{orderNumber}
				</p>
			</div>
		</header>
	)
}

function ReviewReportParagraph({
	customerName,
	itemCount,
	items,
	address,
	dateTime,
	subtotal,
	vat,
	total,
	margin,
}: {
	customerName: string
	itemCount: number
	items: LineItemFormValues[]
	address: string
	dateTime: string
	subtotal: string
	vat: string
	total: string
	margin: string
}) {
	const visibleItems = items.slice(0, 4)
	const hiddenItemCount = Math.max(0, items.length - visibleItems.length)
	return (
		<section
			aria-label="Quote report paragraph"
			data-print-report-copy="true"
			className="px-5 py-8 sm:px-8 sm:py-10 lg:px-12"
		>
			<div className="max-w-[780px] space-y-5 font-[family-name:var(--font-literata)] text-[16px] leading-8 text-[var(--color-text)]">
				<p>
					HyperQuote submits this note as the commercial reading of the customer
					request before release to leadership. It records the buyer, the
					selected material lines, the delivery commitment, and the financial
					position that will travel with the quote into the next review.
				</p>

				<p>
					The quote for <strong>{customerName}</strong> contains{' '}
					<strong>
						{itemCount} {itemCount === 1 ? 'line' : 'lines'}
					</strong>
					{visibleItems.length > 0 && (
						<>
							{' '}
							covering{' '}
							{visibleItems.map((item, index) => {
								const quantity = item.quantity ?? 0
								const separator =
									index === 0
										? ''
										: index === visibleItems.length - 1
											? ' and '
											: ', '
								return (
									<span key={lineProductKey(item)}>
										{separator}
										<em>{item.productName}</em>{' '}
										<span className="font-[family-name:var(--font-plex-mono)] text-[13px] tabular-nums text-[var(--color-text-muted)]">
											({quantity} {quantity === 1 ? 'Unit' : 'Units'})
										</span>
									</span>
								)
							})}
							{hiddenItemCount > 0 && (
								<span> and {hiddenItemCount} additional line(s)</span>
							)}
						</>
					)}
					. These lines are ready for final commercial inspection against price,
					margin, and delivery timing.
				</p>

				<div>
					<div className="mx-auto max-w-[620px] text-center">
						<p className="font-[family-name:var(--font-literata)] text-[18px] italic leading-8 text-[var(--color-text)]">
							{address}
						</p>
						<div className="mx-auto mt-3 h-px w-24 bg-[var(--color-border)]" />
						<p className="mt-3 font-[family-name:var(--font-archivo)] text-[12px] italic text-[var(--color-text-muted)]">
							{dateTime}
						</p>
					</div>
				</div>

				<p>
					Financially, the quote stands at <strong>{subtotal}</strong> before
					tax, adds <strong>{vat}</strong> in VAT, and reaches{' '}
					<strong>{total}</strong> as the customer-facing total. The retained
					margin is <strong>{margin}</strong>, which is the key figure to read
					before the quote is sent onward.
				</p>

				<div className="font-[family-name:var(--font-archivo)] text-[12px] leading-6 text-[var(--color-text-muted)]">
					<p>
						Calculation summary:{' '}
						{items.length === 0
							? 'no material lines have been selected.'
							: items.map((item, index) => {
									const quantity = item.quantity ?? 0
									const separator =
										index === 0
											? ''
											: index === items.length - 1
												? '; and '
												: '; '
									return (
										<span key={lineProductKey(item)}>
											{separator}
											<em>{item.productName}</em> carries{' '}
											<span className="font-[family-name:var(--font-plex-mono)] tabular-nums">
												{quantity} {quantity === 1 ? 'Unit' : 'Units'}
											</span>{' '}
											at{' '}
											<span className="font-[family-name:var(--font-plex-mono)] tabular-nums">
												{formatLineMoney(item.sellPrice)}
											</span>{' '}
											each, producing{' '}
											<span className="font-[family-name:var(--font-plex-mono)] tabular-nums">
												{formatLineMoney(item.lineTotal, 2)}
											</span>
										</span>
									)
								})}
					</p>
					<p className="mt-2">
						Together, those lines form <strong>{subtotal}</strong> before tax,{' '}
						<strong>{vat}</strong> in VAT, <strong>{total}</strong> due from the
						customer, and <strong>{margin}</strong> retained margin.
					</p>
				</div>

				<p>
					This report presents the quote as a decision-ready commercial record:
					what the customer will receive, what HyperQuote is committing to
					deliver, and where the margin, tax, and final value stand before
					finance release.
				</p>
			</div>
		</section>
	)
}

function ReportLineRow({
	item,
	index,
	marginColor,
}: {
	item: LineItemFormValues
	index: number
	marginColor: string
}) {
	const quantityLabel = `${item.quantity ?? 0} ${
		item.quantity === 1 ? 'Unit' : 'Units'
	}`

	return (
		<li className="grid gap-3 border-b border-[var(--color-border)] px-4 py-4 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(8rem,auto)] sm:items-start sm:px-6">
			<div className="font-[family-name:var(--font-plex-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)] sm:pt-1">
				{(index + 1).toString().padStart(2, '0')}
			</div>
			<div className="min-w-0">
				<p className="break-words font-[family-name:var(--font-literata)] text-[16px] font-medium leading-6 text-[var(--color-text)]">
					{item.productName}
					<LineStatusMark priceStatus={item.priceStatus ?? 'updated'} />
				</p>
				<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-[family-name:var(--font-archivo)] text-[11px] leading-5 text-[var(--color-text-muted)]">
					<span>
						<span className="text-[var(--color-text-subtle)]">Quantity</span>{' '}
						<span className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text)]">
							{quantityLabel}
						</span>
					</span>
					<span>
						<span className="text-[var(--color-text-subtle)]">Unit price</span>{' '}
						<span className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text)]">
							{formatLineMoney(item.sellPrice)}
						</span>
					</span>
					<span>
						<span className="text-[var(--color-text-subtle)]">Margin</span>{' '}
						<span
							className="font-[family-name:var(--font-plex-mono)] font-semibold tabular-nums"
							style={{ color: marginColor }}
						>
							{item.marginPercent || 0}%
						</span>
					</span>
				</div>
			</div>
			<div className="text-start sm:text-end">
				<span className="block font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase text-[var(--color-text-subtle)]">
					Line total
				</span>
				<span className="mt-1 block font-[family-name:var(--font-plex-mono)] text-[14px] font-semibold tabular-nums text-[var(--color-text)]">
					{formatLineMoney(item.lineTotal, 2)}
				</span>
			</div>
		</li>
	)
}

function ReportSummaryRow({
	label,
	value,
	tone,
	emphasis = false,
}: {
	label: string
	value: React.ReactNode
	tone?: string
	emphasis?: boolean
}) {
	return (
		<div
			className={`grid min-h-11 grid-cols-[minmax(0,1fr)_minmax(7rem,auto)] border-b border-[var(--color-border)] last:border-b-0 ${
				emphasis ? 'border-t border-[var(--color-border)]' : ''
			}`}
		>
			<div
				className="px-4 py-3 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase text-[var(--color-text-subtle)] sm:px-6"
				style={{ letterSpacing: 0 }}
			>
				{label}
			</div>
			<div
				className={`px-4 py-3 text-end font-[family-name:var(--font-plex-mono)] tabular-nums sm:px-6 ${
					emphasis
						? 'text-[18px] font-semibold text-[var(--color-text)]'
						: 'text-[12px] font-medium text-[var(--color-text)]'
				}`}
				style={{ color: tone }}
			>
				{value}
			</div>
		</div>
	)
}

function ReportTextBlock({
	label,
	value,
	placeholder = false,
}: {
	label: string
	value: React.ReactNode
	placeholder?: boolean
}) {
	return (
		<div className="px-4 py-4 sm:px-6">
			<span
				className="block font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase text-[var(--color-text-subtle)]"
				style={{ letterSpacing: 0 }}
			>
				{label}
			</span>
			<p
				className={`mt-3 max-w-[62ch] break-words font-[family-name:var(--font-literata)] text-[15px] leading-7 ${
					placeholder
						? 'italic text-[var(--color-text-subtle)]'
						: 'text-[var(--color-text)]'
				}`}
				style={{ letterSpacing: 0 }}
			>
				{value}
			</p>
		</div>
	)
}

function formatDeliveryWindow(value?: string) {
	const labels: Record<string, string> = {
		'08:00-13:00': 'Morning',
		'13:00-17:00': 'Midday',
		'17:00-20:00': 'Evening',
		'00:00-06:00': 'Night',
	}
	return labels[value ?? ''] ?? value ?? 'Pick time'
}

function formatReviewDate(value?: string) {
	if (!value) return ''
	const [year, month, day] = value.split('-').map(Number)
	if (!year || !month || !day) return value
	return new Date(year, month - 1, day).toLocaleDateString('en-EG', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

function QuoteLineCard({
	item,
	index,
	isLast,
	marginColor,
	onEditMargin,
	onRemove,
}: {
	item: LineItemFormValues
	index: number
	isLast: boolean
	marginColor: string
	onEditMargin: () => void
	onRemove: () => void
}) {
	const priceLabel = formatLineMoney(item.sellPrice)
	const totalLabel = formatLineMoney(item.lineTotal, 2)
	const rowBackground =
		index % 2 === 1
			? 'bg-black/[0.018] dark:bg-white/[0.025]'
			: 'bg-transparent'

	return (
		<li
			className={`group/line relative -mx-3 border-x border-x-transparent px-3 py-3.5 transition-colors hover:border-x-black/[0.16] focus-within:border-x-black/[0.16] dark:hover:border-x-white/[0.16] dark:focus-within:border-x-white/[0.16] sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8 lg:py-4 ${rowBackground} ${isLast ? '' : 'border-b border-b-[var(--color-border)]'}`}
			aria-label={`Line ${index + 1}: ${item.productName}`}
		>
			<div className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
				<button
					type="button"
					onClick={onEditMargin}
					aria-label={`Edit ${item.productName}, quantity ${item.quantity ?? 0}, margin ${item.marginPercent || 0}%`}
					className="block w-full min-w-0 rounded-md border-0 bg-transparent p-0 text-start outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
				>
					<span className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
						<span className="min-w-0">
							<span className="flex flex-wrap items-center gap-x-2 gap-y-1">
								<span
									className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
									style={{ fontSize: '10px', letterSpacing: '0.04em' }}
								>
									{(index + 1).toString().padStart(2, '0')}
								</span>
							</span>
							<span
								className="mt-0.5 block break-words font-[family-name:var(--font-archivo)] text-[var(--color-text)]"
								style={{
									fontSize: '15px',
									fontWeight: 500,
									letterSpacing: '0',
									lineHeight: 1.25,
								}}
							>
								{item.productName}
								<LineStatusMark priceStatus={item.priceStatus ?? 'updated'} />
							</span>
						</span>
						<span className="min-w-[92px] text-end">
							<span className="block font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
								total
							</span>
							<span className="mt-0.5 block break-words font-[family-name:var(--font-plex-mono)] text-[14px] font-semibold tabular-nums text-[var(--color-text)]">
								{totalLabel}
							</span>
						</span>
					</span>

					<span className="mt-3 flex flex-wrap items-center gap-2">
						<span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5">
							<span className="font-[family-name:var(--font-plex-mono)] text-[12px] font-semibold tabular-nums text-[var(--color-text)]">
								{item.quantity ?? 0}
							</span>
							<span
								className="font-[family-name:var(--font-archivo)] text-[10px] italic text-[var(--color-text-muted)]"
								style={{ letterSpacing: '0' }}
							>
								{item.quantity === 1 ? 'Unit' : 'Units'}
							</span>
						</span>
						<span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5">
							<span className="font-[family-name:var(--font-plex-mono)] text-[12px] font-medium tabular-nums text-[var(--color-text)]">
								{priceLabel}
							</span>
						</span>
						<span className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 text-start">
							<span
								className="font-[family-name:var(--font-plex-mono)] text-[12px] font-semibold tabular-nums"
								style={{ color: marginColor }}
							>
								{item.marginPercent || 0}%
							</span>
						</span>
					</span>
				</button>
				<button
					type="button"
					onClick={onRemove}
					aria-label={`Remove ${item.productName} from quote`}
					className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-black/[0.08] text-[var(--color-text-subtle)] outline-none transition-colors hover:border-red-600/35 hover:bg-red-600/[0.05] hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/25 dark:border-white/[0.1] dark:hover:text-red-300"
				>
					<X size={14} strokeWidth={2} aria-hidden="true" />
				</button>
			</div>
		</li>
	)
}

function AddQuoteLineCard({ onAdd }: { onAdd: () => void }) {
	return (
		<li className="py-3.5">
			<button
				type="button"
				onClick={onAdd}
				className="flex min-h-14 w-full items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)] outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-primary)]/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
			>
				+ADD
			</button>
		</li>
	)
}

function PanelMetric({
	label,
	value,
	emphasis = false,
}: {
	label: string
	value: string
	emphasis?: boolean
}) {
	return (
		<div className="min-w-0 px-3 py-2">
			<span className="block font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
				{label}
			</span>
			<span
				className={`mt-0.5 block break-words font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text)] ${
					emphasis ? 'text-[15px] font-semibold' : 'text-[13px] font-medium'
				}`}
			>
				{value}
			</span>
		</div>
	)
}

function AutomaticFxLine({
	summary,
	updatedLabel,
	className = '',
}: {
	summary: string
	updatedLabel: string
	className?: string
}) {
	return (
		<p
			className={`font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-text-subtle)] ${className}`}
		>
			<span>{summary}</span>
			<span aria-hidden="true"> · </span>
			<span>{updatedLabel}</span>
		</p>
	)
}

function LineStatusMark({ priceStatus }: { priceStatus: PriceStatus }) {
	const isOutdated = priceStatus === 'outdated'
	if (!isOutdated) return null

	return <OutdatedPriceIcon />
}

function OutdatedPriceIcon() {
	return (
		<svg
			role="img"
			aria-label="Outdated price"
			viewBox="0 0 16 16"
			fill="none"
			className="ml-1.5 inline-block h-[0.92em] w-[0.92em] align-[-0.08em] text-[var(--color-signal-amber)]"
		>
			<path
				d="M8 2.25 14.25 13.25H1.75L8 2.25Z"
				fill="currentColor"
				opacity="0.13"
			/>
			<path
				d="M8 2.25 14.25 13.25H1.75L8 2.25Z"
				stroke="currentColor"
				strokeWidth="1.45"
				strokeLinejoin="round"
			/>
			<path
				d="M8 5.75V9"
				stroke="currentColor"
				strokeWidth="1.45"
				strokeLinecap="round"
			/>
			<path
				d="M8 11.35H8.01"
				stroke="currentColor"
				strokeWidth="1.9"
				strokeLinecap="round"
			/>
		</svg>
	)
}

function formatLineMoney(value?: number, minimumFractionDigits = 2) {
	if (!value || value <= 0) return '—'
	return `${value.toLocaleString('en-EG', { minimumFractionDigits })}LE`
}

function formatMoneyAmount(value: number | null, minimumFractionDigits = 2) {
	if (value == null || !Number.isFinite(value) || value < 0) return '—'
	return `${value.toLocaleString('en-EG', { minimumFractionDigits })}LE`
}

function formatPlainNumber(value: number, maximumFractionDigits = 4) {
	return value.toLocaleString('en-EG', {
		maximumFractionDigits,
		minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
	})
}

function formatUnitCount(value: number | null) {
	if (value == null || !Number.isFinite(value) || value < 0) return '—'
	return `${value.toLocaleString('en-EG')} Units`
}

function getEffectiveQuoteMarginCap(floor: number, bonus?: number) {
	return Math.max(getSalesMarginCap(floor), bonus ?? SALES_MARGIN_CAP_PERCENT)
}

function clampQuoteMargin(raw: number, min: number, bonus?: number): number {
	return clampSalesMargin(raw, min, getEffectiveQuoteMarginCap(min, bonus))
}

function getMarginProgress(value: number, floor: number, cap: number) {
	const span = Math.max(1, cap - floor)
	return Math.max(0, Math.min(100, ((value - floor) / span) * 100))
}

function getItemEditorMarginColor(
	margin: number,
	floorMargin: number,
	targetMargin: number,
	bonusMargin: number,
) {
	if (margin < floorMargin) return SALES_MARGIN_FLOOR_COLOR
	return getSalesMarginColor(margin, targetMargin, bonusMargin)
}

function getItemEditorMarginTrack(
	targetProgress: number,
	bonusProgress: number,
) {
	const low = SALES_MARGIN_FLOOR_COLOR
	const target = SALES_MARGIN_TARGET_COLOR
	const bonus = SALES_MARGIN_BONUS_COLOR
	return `linear-gradient(90deg, ${low} 0%, ${low} ${targetProgress}%, ${target} ${targetProgress}%, ${target} ${bonusProgress}%, ${bonus} ${bonusProgress}%, ${bonus} 100%)`
}

function parseMoneyInput(raw: string): {
	amount: number | null
	currency?: PanelCurrency
} {
	const normalized = raw.trim().toLowerCase()
	if (!normalized) return { amount: null }

	let currency: PanelCurrency | undefined
	if (normalized.includes('$') || normalized.includes('usd')) currency = 'USD'
	else if (normalized.includes('€') || normalized.includes('eur'))
		currency = 'EUR'
	else if (normalized.includes('sar') || normalized.includes('riyal'))
		currency = 'SAR'
	else if (
		normalized.includes('egp') ||
		normalized.includes('le') ||
		normalized.includes('جنيه')
	)
		currency = 'EGP'

	const amountText = normalized.replace(/,/g, '').replace(/[^\d.-]/g, '')
	const amount = Number(amountText)
	return {
		amount: Number.isFinite(amount) && amount > 0 ? amount : null,
		currency,
	}
}

type ArithmeticToken =
	| { kind: 'number'; value: number }
	| { kind: 'operator'; value: '+' | '-' | '*' | '/' }
	| { kind: 'paren'; value: '(' | ')' }

function tokenizeArithmeticExpression(expression: string) {
	const tokens: ArithmeticToken[] = []
	let index = 0

	while (index < expression.length) {
		const character = expression[index]
		if (!character) break
		if (/\s/.test(character) || character === ',') {
			index += 1
			continue
		}

		if ((character >= '0' && character <= '9') || character === '.') {
			let numberText = ''
			let decimalCount = 0
			while (index < expression.length) {
				const next = expression[index]
				if (!next) break
				if (next === '.') {
					decimalCount += 1
					if (decimalCount > 1) return null
					numberText += next
					index += 1
					continue
				}
				if (next < '0' || next > '9') break
				numberText += next
				index += 1
			}
			if (numberText === '.') return null
			const value = Number(numberText)
			if (!Number.isFinite(value)) return null
			tokens.push({ kind: 'number', value })
			continue
		}

		switch (character) {
			case '+':
			case '-':
			case '*':
			case '/':
				tokens.push({ kind: 'operator', value: character })
				index += 1
				break
			case '(':
			case ')':
				tokens.push({ kind: 'paren', value: character })
				index += 1
				break
			default:
				return null
		}
	}

	return tokens
}

function evaluateArithmeticExpression(expression: string) {
	const tokens = tokenizeArithmeticExpression(expression)
	if (!tokens || tokens.length === 0) return null
	let position = 0

	const peek = () => tokens[position]
	const consume = () => {
		const token = tokens[position]
		position += 1
		return token
	}

	const parseFactor = (): number | null => {
		const token = peek()
		if (!token) return null

		if (
			token.kind === 'operator' &&
			(token.value === '-' || token.value === '+')
		) {
			consume()
			const value = parseFactor()
			if (value == null) return null
			return token.value === '-' ? -value : value
		}

		if (token.kind === 'number') {
			consume()
			return token.value
		}

		if (token.kind === 'paren' && token.value === '(') {
			consume()
			const value = parseExpression()
			const closing = consume()
			if (!closing || closing.kind !== 'paren' || closing.value !== ')') {
				return null
			}
			return value
		}

		return null
	}

	const parseTerm = (): number | null => {
		let value = parseFactor()
		if (value == null) return null

		while (true) {
			const token = peek()
			if (
				!token ||
				token.kind !== 'operator' ||
				(token.value !== '*' && token.value !== '/')
			) {
				break
			}
			consume()
			const next = parseFactor()
			if (next == null) return null
			if (token.value === '*') value *= next
			else {
				if (next === 0) return null
				value /= next
			}
		}

		return value
	}

	function parseExpression(): number | null {
		let value = parseTerm()
		if (value == null) return null

		while (true) {
			const token = peek()
			if (
				!token ||
				token.kind !== 'operator' ||
				(token.value !== '+' && token.value !== '-')
			) {
				break
			}
			consume()
			const next = parseTerm()
			if (next == null) return null
			value = token.value === '+' ? value + next : value - next
		}

		return value
	}

	const result = parseExpression()
	if (
		result == null ||
		position !== tokens.length ||
		!Number.isFinite(result)
	) {
		return null
	}
	return Math.round(result * 10000) / 10000
}

function getLineMarginColor(
	marginPercent: number,
	thresholds: MarginThresholds | null,
) {
	if (!thresholds) return getSalesMarginColor(marginPercent)
	return getSalesMarginColor(marginPercent, thresholds.target, thresholds.bonus)
}

function ItemEditPanel({
	item,
	index,
	marginFloor,
	thresholds,
	exchangeRates,
	isRequestingPrice,
	isPriceRequested,
	onQuantityChange,
	onMarginChange,
	onRequestPriceUpdate,
	onClose,
}: {
	item: LineItemFormValues
	index: number
	marginFloor: number
	thresholds: MarginThresholds | null
	exchangeRates: AutomaticExchangeRates
	isRequestingPrice: boolean
	isPriceRequested: boolean
	onQuantityChange: (quantity: number) => void
	onMarginChange: (margin: number) => void
	onRequestPriceUpdate: () => void
	onClose: () => void
}) {
	const reduceMotion = useReducedMotion()
	const isCompactPanel = useCompactPanelLayout()
	const priceStatus = item.priceStatus ?? 'updated'
	const isOutdated = priceStatus === 'outdated'
	const quantity = item.quantity || 0
	const supplierCost = item.supplierCost || 0
	const margin = item.marginPercent || 0
	const sellPrice = item.sellPrice || 0
	const lineTotal =
		item.lineTotal || Math.round(sellPrice * quantity * 100) / 100
	const lineCost = Math.round(supplierCost * quantity * 100) / 100
	const lineProfit = lineTotal - lineCost
	const fieldBaseId = `quote-line-${index}`
	const [calculatorExpression, setCalculatorExpression] = useState('')
	const [calculatorResult, setCalculatorResult] = useState<number | null>(null)
	const [calculatorError, setCalculatorError] = useState('')
	const [budgetAmount, setBudgetAmount] = useState('')
	const [budgetCurrency, setBudgetCurrency] = useState<PanelCurrency>('EGP')
	const [exchangeCurrency, setExchangeCurrency] = useState<PanelCurrency>('EGP')
	const [activeMobileTool, setActiveMobileTool] =
		useState<ItemEditMobileTool | null>(null)
	const [isMobileToolMenuOpen, setIsMobileToolMenuOpen] = useState(false)
	const [highlightedMobileTool, setHighlightedMobileTool] =
		useState<ItemEditMobileTool | null>(null)
	const [dimmedMobileTool, setDimmedMobileTool] =
		useState<ItemEditMobileTool | null>(null)
	const [activeDesktopTool, setActiveDesktopTool] =
		useState<ItemEditMobileTool | null>(null)
	const [isDesktopToolMenuOpen, setIsDesktopToolMenuOpen] = useState(false)
	const [highlightedDesktopTool, setHighlightedDesktopTool] =
		useState<ItemEditMobileTool | null>(null)
	const [dimmedDesktopTool, setDimmedDesktopTool] =
		useState<ItemEditMobileTool | null>(null)
	const mobileScrollRef = useRef<HTMLDivElement | null>(null)
	const desktopScrollRef = useRef<HTMLDivElement | null>(null)
	const mobileHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	)
	const mobileDimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const desktopHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	)
	const desktopDimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const mobileToolRefs = useRef<Record<ItemEditMobileTool, HTMLElement | null>>(
		{
			quantity: null,
			budget: null,
			exchange: null,
			calculator: null,
			inventory: null,
		},
	)
	const desktopToolRefs = useRef<
		Record<ItemEditMobileTool, HTMLElement | null>
	>({
		quantity: null,
		budget: null,
		exchange: null,
		calculator: null,
		inventory: null,
	})
	const marginCap = getEffectiveQuoteMarginCap(marginFloor, thresholds?.bonus)
	const targetMargin = thresholds
		? Math.min(marginCap, Math.max(marginFloor, thresholds.target))
		: Math.min(marginCap, marginFloor + 5)
	const bonusMargin = thresholds
		? Math.min(marginCap, Math.max(targetMargin, thresholds.bonus))
		: marginCap
	const targetProgress = getMarginProgress(targetMargin, marginFloor, marginCap)
	const bonusProgress = getMarginProgress(bonusMargin, marginFloor, marginCap)
	const currentMarginColor = getItemEditorMarginColor(
		margin,
		marginFloor,
		targetMargin,
		bonusMargin,
	)
	const marginTrackBackground = getItemEditorMarginTrack(
		targetProgress,
		bonusProgress,
	)
	const canUseCurrencyRate = (currency: PanelCurrency) => {
		if (currency === 'EGP') return true
		const rate = exchangeRates.rates[currency]
		return rate != null && Number.isFinite(rate) && rate > 0
	}
	const normalizeMoneyToEgp = (value: number, currency: PanelCurrency) => {
		if (currency === 'EGP') return value
		return value * (exchangeRates.rates[currency] ?? 0)
	}
	const parsedBudget = parseMoneyInput(budgetAmount)
	const effectiveBudgetCurrency = parsedBudget.currency ?? budgetCurrency
	const budgetUsesForeignRate = effectiveBudgetCurrency !== 'EGP'
	const budgetRate = exchangeRates.rates[effectiveBudgetCurrency]
	const exchangeNeedsRate = exchangeCurrency !== 'EGP'
	const budgetEgp =
		parsedBudget.amount != null && canUseCurrencyRate(effectiveBudgetCurrency)
			? normalizeMoneyToEgp(parsedBudget.amount, effectiveBudgetCurrency)
			: null
	const unitPriceAtMargin =
		computeSellPriceFromMargin(supplierCost, margin) || sellPrice
	const budgetUnits =
		budgetEgp != null && unitPriceAtMargin > 0
			? Math.floor(budgetEgp / unitPriceAtMargin)
			: null
	const budgetUsed =
		budgetUnits != null
			? Math.round(budgetUnits * unitPriceAtMargin * 100) / 100
			: null
	const budgetRemaining =
		budgetEgp != null && budgetUsed != null
			? Math.max(0, Math.round((budgetEgp - budgetUsed) * 100) / 100)
			: null
	const parsedExchangeRate = exchangeRates.rates[exchangeCurrency]
	const canConvertExchange =
		exchangeCurrency === 'EGP' ||
		(parsedExchangeRate != null &&
			Number.isFinite(parsedExchangeRate) &&
			parsedExchangeRate > 0)
	const exchangeUnitValue =
		exchangeCurrency === 'EGP'
			? sellPrice
			: parsedExchangeRate != null && parsedExchangeRate > 0
				? sellPrice / parsedExchangeRate
				: null
	const exchangeLineValue =
		exchangeCurrency === 'EGP'
			? lineTotal
			: parsedExchangeRate != null && parsedExchangeRate > 0
				? lineTotal / parsedExchangeRate
				: null
	const exchangeRateSummary =
		exchangeCurrency === 'EGP'
			? 'Base currency'
			: parsedExchangeRate != null && parsedExchangeRate > 0
				? `1 ${exchangeCurrency} = ${formatMoneyAmount(parsedExchangeRate)}`
				: 'Automatic rate unavailable'
	const budgetRateSummary =
		effectiveBudgetCurrency === 'EGP'
			? 'Base currency'
			: budgetRate != null && budgetRate > 0
				? `1 ${effectiveBudgetCurrency} = ${formatMoneyAmount(budgetRate)}`
				: 'Automatic rate unavailable'
	const exchangeUpdatedAt = exchangeRates.updatedAt
		? new Date(exchangeRates.updatedAt)
		: null
	const exchangeUpdatedLabel =
		exchangeUpdatedAt && !Number.isNaN(exchangeUpdatedAt.getTime())
			? exchangeUpdatedAt.toLocaleDateString('en-EG', {
					month: 'short',
					day: 'numeric',
				})
			: 'latest available'
	const appendCalculatorToken = (token: string) => {
		setCalculatorExpression((current) => {
			const trimmed = current.trimEnd()
			const needsLeadingSpace = trimmed.length > 0
			return `${trimmed}${needsLeadingSpace ? ' ' : ''}${token} `
		})
		setCalculatorError('')
	}
	const requestLabel = isRequestingPrice
		? 'Updating price'
		: isPriceRequested
			? 'Inventory notified'
			: isOutdated
				? 'Update price'
				: 'Price current'
	const inputClassName =
		'h-11 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 font-[family-name:var(--font-plex-mono)] text-[14px] font-semibold tabular-nums text-[var(--color-text)] outline-none transition-colors [appearance:textfield] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
	const runCalculator = () => {
		const result = evaluateArithmeticExpression(calculatorExpression)
		if (result == null) {
			setCalculatorError('Enter a valid calculation')
			setCalculatorResult(null)
			return
		}
		setCalculatorError('')
		setCalculatorResult(result)
	}
	const mobileTools: Array<{
		id: ItemEditMobileTool
		label: string
		detail: string
	}> = [
		{
			id: 'quantity',
			label: 'Quantity',
			detail: quantity.toLocaleString('en-EG'),
		},
		{
			id: 'budget',
			label: 'Budget',
			detail:
				budgetUnits == null ? 'plan' : budgetUnits.toLocaleString('en-EG'),
		},
		{
			id: 'exchange',
			label: 'Exchange',
			detail: exchangeCurrency,
		},
		{
			id: 'calculator',
			label: 'Calculator',
			detail:
				calculatorResult == null ? '+-*/' : formatPlainNumber(calculatorResult),
		},
		{
			id: 'inventory',
			label: 'Inventory',
			detail: isOutdated ? 'outdated' : 'current',
		},
	]
	const mobileToolHeadingClassName = (tool: ItemEditMobileTool) =>
		`font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300 ${
			highlightedMobileTool === tool
				? 'text-[var(--color-primary)]'
				: 'text-[var(--color-text)]'
		}`
	const mobileToolSectionClassName = (tool: ItemEditMobileTool) =>
		`-mx-2 scroll-mt-4 space-y-3 rounded-md px-2 py-5 transition-colors duration-300 first:pt-2 last:pb-2 ${
			dimmedMobileTool === tool
				? 'bg-black/[0.035] dark:bg-white/[0.055]'
				: 'bg-transparent'
		}`
	const desktopToolHeadingClassName = (tool: ItemEditMobileTool) =>
		`font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300 ${
			highlightedDesktopTool === tool
				? 'text-[var(--color-primary)]'
				: 'text-[var(--color-text)]'
		}`
	const desktopToolSectionClassName = (
		tool: ItemEditMobileTool,
		baseClassName = '',
	) =>
		`${baseClassName} scroll-mt-4 transition-colors duration-300 ${
			dimmedDesktopTool === tool ? 'bg-black/[0.035] dark:bg-white/[0.055]' : ''
		}`
	const setMobileToolRef =
		(tool: ItemEditMobileTool) => (node: HTMLElement | null) => {
			mobileToolRefs.current[tool] = node
		}
	const setDesktopToolRef =
		(tool: ItemEditMobileTool) => (node: HTMLElement | null) => {
			desktopToolRefs.current[tool] = node
		}
	const selectMobileTool = (tool: ItemEditMobileTool | null) => {
		setActiveMobileTool(tool)
		setIsMobileToolMenuOpen(false)

		if (mobileHighlightTimerRef.current) {
			clearTimeout(mobileHighlightTimerRef.current)
			mobileHighlightTimerRef.current = null
		}
		if (mobileDimTimerRef.current) {
			clearTimeout(mobileDimTimerRef.current)
			mobileDimTimerRef.current = null
		}

		if (!tool) {
			setHighlightedMobileTool(null)
			setDimmedMobileTool(null)
			window.requestAnimationFrame(() => {
				mobileScrollRef.current?.scrollTo({
					top: 0,
					behavior: reduceMotion ? 'auto' : 'smooth',
				})
			})
			return
		}

		setHighlightedMobileTool(tool)
		setDimmedMobileTool(tool)
		mobileHighlightTimerRef.current = setTimeout(() => {
			setHighlightedMobileTool(null)
			mobileHighlightTimerRef.current = null
		}, 3000)
		mobileDimTimerRef.current = setTimeout(() => {
			setDimmedMobileTool(null)
			mobileDimTimerRef.current = null
		}, 1000)
		window.requestAnimationFrame(() => {
			mobileToolRefs.current[tool]?.scrollIntoView({
				behavior: reduceMotion ? 'auto' : 'smooth',
				block: 'start',
			})
		})
	}
	const selectDesktopTool = (tool: ItemEditMobileTool | null) => {
		setActiveDesktopTool(tool)
		setIsDesktopToolMenuOpen(false)

		if (desktopHighlightTimerRef.current) {
			clearTimeout(desktopHighlightTimerRef.current)
			desktopHighlightTimerRef.current = null
		}
		if (desktopDimTimerRef.current) {
			clearTimeout(desktopDimTimerRef.current)
			desktopDimTimerRef.current = null
		}

		if (!tool) {
			setHighlightedDesktopTool(null)
			setDimmedDesktopTool(null)
			window.requestAnimationFrame(() => {
				desktopScrollRef.current?.scrollTo({
					top: 0,
					behavior: reduceMotion ? 'auto' : 'smooth',
				})
			})
			return
		}

		setHighlightedDesktopTool(tool)
		setDimmedDesktopTool(tool)
		desktopHighlightTimerRef.current = setTimeout(() => {
			setHighlightedDesktopTool(null)
			desktopHighlightTimerRef.current = null
		}, 3000)
		desktopDimTimerRef.current = setTimeout(() => {
			setDimmedDesktopTool(null)
			desktopDimTimerRef.current = null
		}, 1000)
		window.requestAnimationFrame(() => {
			desktopToolRefs.current[tool]?.scrollIntoView({
				behavior: reduceMotion ? 'auto' : 'smooth',
				block: 'start',
			})
		})
	}

	useEffect(() => {
		return () => {
			if (mobileHighlightTimerRef.current) {
				clearTimeout(mobileHighlightTimerRef.current)
			}
			if (mobileDimTimerRef.current) {
				clearTimeout(mobileDimTimerRef.current)
			}
			if (desktopHighlightTimerRef.current) {
				clearTimeout(desktopHighlightTimerRef.current)
			}
			if (desktopDimTimerRef.current) {
				clearTimeout(desktopDimTimerRef.current)
			}
		}
	}, [])

	if (isCompactPanel) {
		return (
			<div className="flex h-full flex-col bg-[var(--color-surface)]">
				<div ref={mobileScrollRef} className="min-h-0 flex-1 overflow-auto">
					<header className="border-b border-[var(--color-border)] px-4 py-4">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
									item {(index + 1).toString().padStart(2, '0')} /{' '}
									{quantity.toLocaleString('en-EG')}{' '}
									{quantity === 1 ? 'Unit' : 'Units'}
								</p>
								<p className="mt-1 font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-text-subtle)]">
									{isOutdated ? 'price needs refresh' : 'price is current'}
								</p>
							</div>
							<div className="shrink-0 text-end">
								<span className="block font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
									line
								</span>
								<span className="mt-1 block max-w-[118px] break-words font-[family-name:var(--font-plex-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
									{formatLineMoney(lineTotal, 2)}
								</span>
							</div>
						</div>

						<div className="mt-4 border-y border-[var(--color-border)] py-5">
							<div className="flex items-end justify-between gap-3">
								<div className="min-w-0">
									<p className="font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--color-text-subtle)]">
										margin
									</p>
									<p
										className="mt-1 font-[family-name:var(--font-plex-mono)] text-[44px] font-semibold leading-none tabular-nums"
										style={{ color: currentMarginColor, letterSpacing: '0' }}
									>
										{formatMarginPercent(margin)}
									</p>
								</div>
								<div className="shrink-0 text-end">
									<p className="font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
										unit
									</p>
									<p className="mt-1 max-w-[120px] break-words font-[family-name:var(--font-plex-mono)] text-[15px] font-semibold tabular-nums text-[var(--color-text)]">
										{formatLineMoney(sellPrice)}
									</p>
								</div>
							</div>

							<div className="mt-4">
								<input
									id={`${fieldBaseId}-mobile-margin`}
									type="range"
									min={marginFloor}
									max={marginCap}
									step="0.1"
									value={margin}
									onChange={(e) => {
										const raw = Number(e.target.value)
										if (Number.isFinite(raw)) onMarginChange(raw)
									}}
									className="h-2 w-full cursor-pointer appearance-none rounded-full border-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-current [&::-moz-range-thumb]:shadow-[0_6px_14px_-8px_rgba(0,0,0,0.55)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-current [&::-webkit-slider-thumb]:shadow-[0_6px_14px_-8px_rgba(0,0,0,0.55)]"
									style={{
										background: marginTrackBackground,
										color: currentMarginColor,
									}}
									aria-label={`Margin for ${item.productName}`}
								/>
							</div>
							<div className="mt-3 flex items-center justify-between font-[family-name:var(--font-plex-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
								<span>{formatMarginPercent(marginFloor)}</span>
								<span>{formatMarginPercent(targetMargin)}</span>
								<span>{formatMarginPercent(marginCap)}</span>
							</div>

							<div className="mt-5 grid grid-cols-4 gap-2.5">
								<MarginStepButton
									label="-1"
									onClick={() => onMarginChange(margin - 1)}
								/>
								<MarginStepButton
									label="-0.1"
									onClick={() => onMarginChange(margin - 0.1)}
								/>
								<MarginStepButton
									label="+0.1"
									onClick={() => onMarginChange(margin + 0.1)}
								/>
								<MarginStepButton
									label="+1"
									onClick={() => onMarginChange(margin + 1)}
								/>
							</div>
							<div className="mt-3 grid grid-cols-3 gap-2.5">
								<CompactMarginPresetButton
									label="floor"
									value={marginFloor}
									tone="floor"
									onClick={onMarginChange}
								/>
								<CompactMarginPresetButton
									label="target"
									value={targetMargin}
									tone="target"
									onClick={onMarginChange}
								/>
								<CompactMarginPresetButton
									label="bonus"
									value={bonusMargin}
									tone="bonus"
									onClick={onMarginChange}
								/>
							</div>
						</div>
					</header>

					<div className="divide-y-2 divide-[var(--color-border)] px-3 py-4">
						{
							<section
								ref={setMobileToolRef('quantity')}
								aria-labelledby={`${fieldBaseId}-mobile-quantity`}
								className={mobileToolSectionClassName('quantity')}
							>
								<h3
									id={`${fieldBaseId}-mobile-quantity`}
									className={mobileToolHeadingClassName('quantity')}
								>
									quantity
								</h3>
								<ItemEditField
									id={`${fieldBaseId}-mobile-quantity-input`}
									label="units"
								>
									<input
										id={`${fieldBaseId}-mobile-quantity-input`}
										type="text"
										inputMode="numeric"
										pattern="[0-9]*"
										min={1}
										value={item.quantity ?? ''}
										onChange={(e) => {
											const raw = Number(normalizeIntegerInput(e.target.value))
											onQuantityChange(
												Number.isFinite(raw) && raw > 0 ? raw : 1,
											)
										}}
										onFocus={(e) => e.currentTarget.select()}
										className="h-14 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 font-[family-name:var(--font-plex-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)] outline-none [appearance:textfield] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
										aria-label={`Quantity for ${item.productName}`}
									/>
								</ItemEditField>
								<div className="grid grid-cols-3 gap-2">
									<QuantityButton
										label="-1"
										onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
									/>
									<QuantityButton
										label="+1"
										onClick={() => onQuantityChange(quantity + 1)}
									/>
									<QuantityButton
										label="+10"
										onClick={() => onQuantityChange(quantity + 10)}
									/>
								</div>
								<div className="grid divide-y divide-[var(--color-border)] overflow-hidden rounded-md border border-[var(--color-border)] bg-black/[0.012] dark:bg-white/[0.025]">
									<PanelMetric
										label="cost basis"
										value={formatLineMoney(supplierCost)}
									/>
									<PanelMetric
										label="line cost"
										value={formatLineMoney(lineCost)}
									/>
									<PanelMetric
										label="profit"
										value={formatLineMoney(lineProfit)}
										emphasis
									/>
								</div>
							</section>
						}

						{
							<section
								ref={setMobileToolRef('budget')}
								aria-labelledby={`${fieldBaseId}-mobile-budget`}
								className={mobileToolSectionClassName('budget')}
							>
								<h3
									id={`${fieldBaseId}-mobile-budget`}
									className={mobileToolHeadingClassName('budget')}
								>
									budget planner
								</h3>
								<ItemEditField
									id={`${fieldBaseId}-mobile-budget-input`}
									label="approved budget"
								>
									<input
										id={`${fieldBaseId}-mobile-budget-input`}
										type="text"
										inputMode="decimal"
										value={budgetAmount}
										onChange={(e) =>
											setBudgetAmount(normalizeDecimalInput(e.target.value))
										}
										onFocus={(e) => e.currentTarget.select()}
										className={inputClassName}
										placeholder="Approved customer budget"
									/>
								</ItemEditField>
								<div className="grid grid-cols-4 gap-2">
									{PANEL_CURRENCIES.map((currency) => (
										<button
											key={currency}
											type="button"
											onClick={() => setBudgetCurrency(currency)}
											aria-pressed={effectiveBudgetCurrency === currency}
											className={`h-10 rounded-md border px-2 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
												effectiveBudgetCurrency === currency
													? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.08] text-[var(--color-text)]'
													: 'border-[var(--color-border)] text-[var(--color-text-muted)]'
											}`}
										>
											{currency}
										</button>
									))}
								</div>
								<AutomaticFxLine
									summary={budgetRateSummary}
									updatedLabel={exchangeUpdatedLabel}
								/>
								<div className="grid grid-cols-2 gap-2">
									<PanelMetric
										label="available"
										value={formatUnitCount(budgetUnits)}
										emphasis={budgetUnits != null}
									/>
									<PanelMetric
										label="unit"
										value={formatLineMoney(unitPriceAtMargin)}
									/>
									<PanelMetric
										label="used"
										value={formatMoneyAmount(budgetUsed)}
									/>
									<PanelMetric
										label="left"
										value={formatMoneyAmount(budgetRemaining)}
									/>
								</div>
								{budgetUsesForeignRate &&
									!canUseCurrencyRate(effectiveBudgetCurrency) && (
										<p className="font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-text-subtle)]">
											Automatic FX is unavailable for {effectiveBudgetCurrency}.
											Use an EGP budget or try again later.
										</p>
									)}
							</section>
						}

						{
							<section
								ref={setMobileToolRef('exchange')}
								aria-labelledby={`${fieldBaseId}-mobile-exchange`}
								className={mobileToolSectionClassName('exchange')}
							>
								<h3
									id={`${fieldBaseId}-mobile-exchange`}
									className={mobileToolHeadingClassName('exchange')}
								>
									exchange desk
								</h3>
								<div className="grid grid-cols-4 gap-2">
									{PANEL_CURRENCIES.map((currency) => (
										<button
											key={currency}
											type="button"
											onClick={() => setExchangeCurrency(currency)}
											aria-pressed={exchangeCurrency === currency}
											className={`h-10 rounded-md border px-2 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
												exchangeCurrency === currency
													? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.08] text-[var(--color-text)]'
													: 'border-[var(--color-border)] text-[var(--color-text-muted)]'
											}`}
										>
											{currency}
										</button>
									))}
								</div>
								<AutomaticFxLine
									summary={exchangeRateSummary}
									updatedLabel={exchangeUpdatedLabel}
								/>
								<div className="grid grid-cols-2 gap-2">
									<PanelMetric
										label="unit egp"
										value={formatLineMoney(sellPrice)}
									/>
									<PanelMetric
										label="line egp"
										value={formatLineMoney(lineTotal, 2)}
										emphasis
									/>
									<PanelMetric
										label={`unit ${exchangeCurrency}`}
										value={formatExchangeValue(
											exchangeUnitValue,
											exchangeCurrency,
										)}
										emphasis={canConvertExchange}
									/>
									<PanelMetric
										label={`line ${exchangeCurrency}`}
										value={formatExchangeValue(
											exchangeLineValue,
											exchangeCurrency,
										)}
										emphasis={canConvertExchange}
									/>
								</div>
								{exchangeNeedsRate && !canConvertExchange && (
									<p className="font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-text-subtle)]">
										Automatic FX is unavailable for {exchangeCurrency}. Try
										again later.
									</p>
								)}
							</section>
						}

						{
							<section
								ref={setMobileToolRef('calculator')}
								aria-labelledby={`${fieldBaseId}-mobile-calculator`}
								className={mobileToolSectionClassName('calculator')}
							>
								<div className="flex items-center justify-between gap-3">
									<h3
										id={`${fieldBaseId}-mobile-calculator`}
										className={mobileToolHeadingClassName('calculator')}
									>
										calculator
									</h3>
									<button
										type="button"
										onClick={() => {
											setCalculatorExpression(String(lineTotal || ''))
											setCalculatorError('')
										}}
										className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)]"
									>
										use current
									</button>
								</div>
								<ItemEditField
									id={`${fieldBaseId}-mobile-calculator-input`}
									label="calculation"
								>
									<input
										id={`${fieldBaseId}-mobile-calculator-input`}
										type="text"
										inputMode="decimal"
										value={calculatorExpression}
										onChange={(e) => {
											setCalculatorExpression(
												normalizeArithmeticInput(e.target.value),
											)
											setCalculatorError('')
										}}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault()
												runCalculator()
											}
										}}
										onFocus={(e) => e.currentTarget.select()}
										className={inputClassName}
										placeholder="Arithmetic expression"
									/>
								</ItemEditField>
								<div className="grid grid-cols-4 gap-2">
									{['+', '-', '*', '/'].map((operator) => (
										<button
											key={operator}
											type="button"
											onClick={() => appendCalculatorToken(operator)}
											className="h-12 rounded-md border border-[var(--color-border)] font-[family-name:var(--font-plex-mono)] text-[16px] font-semibold text-[var(--color-text-muted)]"
										>
											{operator}
										</button>
									))}
								</div>
								<button
									type="button"
									onClick={runCalculator}
									className="inline-flex h-12 w-full items-center justify-center rounded-md border border-[var(--color-border)] px-3 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text)]"
								>
									calculate
								</button>
								<div className="grid grid-cols-2 gap-2">
									<PanelMetric
										label="result"
										value={
											calculatorResult == null
												? '—'
												: formatPlainNumber(calculatorResult)
										}
										emphasis={calculatorResult != null}
									/>
									<PanelMetric
										label="current line"
										value={formatLineMoney(lineTotal, 2)}
									/>
								</div>
								{calculatorError && (
									<p
										role="alert"
										className="font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-signal-red)]"
									>
										{calculatorError}
									</p>
								)}
							</section>
						}

						{
							<section
								ref={setMobileToolRef('inventory')}
								aria-labelledby={`${fieldBaseId}-mobile-inventory`}
								className={mobileToolSectionClassName('inventory')}
							>
								<h3
									id={`${fieldBaseId}-mobile-inventory`}
									className={mobileToolHeadingClassName('inventory')}
								>
									inventory handoff
								</h3>
								<div className="grid divide-y divide-[var(--color-border)] overflow-hidden rounded-md border border-[var(--color-border)]">
									<PanelMetric
										label="source cost"
										value={formatLineMoney(supplierCost)}
									/>
									<PanelMetric
										label="status"
										value={isOutdated ? 'outdated' : 'updated'}
									/>
									<PanelMetric
										label="line total"
										value={formatLineMoney(lineTotal, 2)}
										emphasis
									/>
								</div>
								<EmployeeActionButton
									type="button"
									tone={isOutdated && !isPriceRequested ? 'primary' : 'neutral'}
									onClick={onRequestPriceUpdate}
									disabled={
										!isOutdated || isPriceRequested || isRequestingPrice
									}
									aria-disabled={
										!isOutdated || isPriceRequested || isRequestingPrice
									}
									leading={
										isRequestingPrice ? (
											<Loader2
												size={13}
												strokeWidth={2.25}
												className="animate-spin"
												aria-hidden="true"
											/>
										) : (
											<RefreshCw
												size={14}
												strokeWidth={2.2}
												aria-hidden="true"
											/>
										)
									}
									fullWidthOnMobile
								>
									{requestLabel}
								</EmployeeActionButton>
							</section>
						}
					</div>
				</div>

				<footer className="relative shrink-0 border-t border-[var(--color-border)] px-3 py-3">
					{isMobileToolMenuOpen && (
						<div
							role="menu"
							className="absolute bottom-[calc(100%+8px)] left-3 z-20 w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_18px_50px_-28px_rgba(0,0,0,0.65)]"
						>
							<button
								type="button"
								role="menuitem"
								onClick={() => {
									selectMobileTool(null)
								}}
								className={`flex min-h-12 w-full items-center justify-between gap-4 border-x border-b border-x-transparent border-b-[var(--color-border)] px-3 text-start outline-none transition-colors hover:border-x-black/[0.16] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 dark:hover:border-x-white/[0.16] ${
									activeMobileTool === null
										? 'bg-[var(--color-primary)]/[0.055]'
										: ''
								}`}
							>
								<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text)]">
									Margin only
								</span>
								<span className="font-[family-name:var(--font-plex-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
									{formatMarginPercent(margin)}
								</span>
							</button>
							{mobileTools.map((tool) => (
								<button
									key={tool.id}
									type="button"
									role="menuitem"
									onClick={() => {
										selectMobileTool(tool.id)
									}}
									className={`flex min-h-12 w-full items-center justify-between gap-4 border-x border-b border-x-transparent border-b-[var(--color-border)] px-3 text-start outline-none transition-colors hover:border-x-black/[0.16] last:border-b-0 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 dark:hover:border-x-white/[0.16] ${
										activeMobileTool === tool.id
											? 'bg-[var(--color-primary)]/[0.055]'
											: ''
									}`}
								>
									<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text)]">
										{tool.label}
									</span>
									<span className="font-[family-name:var(--font-plex-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
										{tool.detail}
									</span>
								</button>
							))}
						</div>
					)}
					<div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
						<button
							type="button"
							onClick={() => setIsMobileToolMenuOpen((open) => !open)}
							aria-label="Choose item tools"
							aria-haspopup="menu"
							aria-expanded={isMobileToolMenuOpen}
							className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
						>
							<MoreHorizontal size={18} strokeWidth={2.2} aria-hidden="true" />
						</button>
						<EmployeeActionButton
							type="button"
							onClick={onClose}
							tone="primary"
							leading={<Save size={14} strokeWidth={2.2} aria-hidden="true" />}
							fullWidthOnMobile
							className="w-full"
						>
							Apply changes
						</EmployeeActionButton>
					</div>
				</footer>
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col">
			<header className="shrink-0 border-b border-[var(--color-border)] px-3 py-3 sm:px-4 lg:px-6 lg:py-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
							<span>item {(index + 1).toString().padStart(2, '0')}</span>
							<span aria-hidden="true">/</span>
							<span className="truncate">
								{quantity.toLocaleString('en-EG')}{' '}
								{quantity === 1 ? 'Unit' : 'Units'}
							</span>
						</div>
						<h2 className="mt-1 break-words font-[family-name:var(--font-archivo)] text-[20px] font-semibold leading-tight text-[var(--color-text)]">
							{item.productName}
							<LineStatusMark priceStatus={priceStatus} />
						</h2>
					</div>
				</div>

				<div className="mt-4 border-y border-[var(--color-border)] bg-black/[0.012] px-1 py-4 dark:bg-white/[0.025] sm:px-2">
					<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
						<div className="min-w-0">
							<p className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
								margin command
							</p>
							<p
								className="mt-1 font-[family-name:var(--font-plex-mono)] text-[42px] font-semibold leading-none tabular-nums sm:text-[54px]"
								style={{ color: currentMarginColor, letterSpacing: '0' }}
							>
								{formatMarginPercent(margin)}
							</p>
						</div>
						<div className="min-w-0 sm:min-w-[116px] sm:text-end">
							<p className="font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
								customer price
							</p>
							<p className="mt-1 break-words font-[family-name:var(--font-plex-mono)] text-[16px] font-semibold tabular-nums text-[var(--color-text)]">
								{formatLineMoney(sellPrice)}
							</p>
							<p className="mt-1 font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-text-subtle)]">
								{formatLineMoney(lineTotal, 2)} line
							</p>
						</div>
					</div>

					<div className="mt-5">
						<input
							id={`${fieldBaseId}-margin`}
							type="range"
							min={marginFloor}
							max={marginCap}
							step="0.1"
							value={margin}
							onChange={(e) => {
								const raw = Number(e.target.value)
								if (Number.isFinite(raw)) onMarginChange(raw)
							}}
							className="h-2 w-full cursor-pointer appearance-none rounded-full border-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-current [&::-moz-range-thumb]:shadow-[0_6px_14px_-8px_rgba(0,0,0,0.55)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-current [&::-webkit-slider-thumb]:shadow-[0_6px_14px_-8px_rgba(0,0,0,0.55)]"
							style={{
								background: marginTrackBackground,
								color: currentMarginColor,
							}}
							aria-label={`Margin for ${item.productName}`}
						/>
					</div>
					<div className="mt-2 flex items-center justify-between font-[family-name:var(--font-plex-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
						<span>{formatMarginPercent(marginFloor)} floor</span>
						<span>{formatMarginPercent(targetMargin)} target</span>
						<span>{formatMarginPercent(marginCap)} cap</span>
					</div>

					<div className="mt-4 grid grid-cols-4 gap-2">
						<MarginStepButton
							label="-1"
							onClick={() => onMarginChange(margin - 1)}
						/>
						<MarginStepButton
							label="-0.1"
							onClick={() => onMarginChange(margin - 0.1)}
						/>
						<MarginStepButton
							label="+0.1"
							onClick={() => onMarginChange(margin + 0.1)}
						/>
						<MarginStepButton
							label="+1"
							onClick={() => onMarginChange(margin + 1)}
						/>
					</div>

					<div className="mt-3 grid grid-cols-3 gap-2">
						<MarginPresetButton
							label="floor"
							value={marginFloor}
							tone="floor"
							onClick={onMarginChange}
						/>
						<MarginPresetButton
							label="target"
							value={targetMargin}
							tone="target"
							onClick={onMarginChange}
						/>
						<MarginPresetButton
							label="bonus"
							value={bonusMargin}
							tone="bonus"
							onClick={onMarginChange}
						/>
					</div>
				</div>
			</header>

			<div
				ref={desktopScrollRef}
				className="min-h-0 flex-1 space-y-5 overflow-auto px-3 py-4 sm:px-4 lg:px-6"
			>
				<section
					ref={setDesktopToolRef('quantity')}
					aria-labelledby={`${fieldBaseId}-workspace-title`}
					className={desktopToolSectionClassName('quantity')}
				>
					<div className="mb-3 flex items-center justify-between gap-3">
						<h3
							id={`${fieldBaseId}-workspace-title`}
							className={desktopToolHeadingClassName('quantity')}
						>
							line workspace
						</h3>
						<span
							aria-hidden="true"
							className="h-px min-w-8 flex-1 bg-[var(--color-border)]"
						/>
					</div>
					<div className="grid gap-3">
						<div className="grid divide-y divide-[var(--color-border)] overflow-hidden rounded-md border border-[var(--color-border)] bg-black/[0.012] dark:bg-white/[0.025] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
							<PanelMetric
								label="cost basis"
								value={formatLineMoney(supplierCost)}
							/>
							<PanelMetric
								label="line cost"
								value={formatLineMoney(lineCost)}
							/>
							<PanelMetric
								label="profit"
								value={formatLineMoney(lineProfit)}
								emphasis
							/>
						</div>

						<div className="rounded-md border border-[var(--color-border)] px-3 py-3">
							<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
								<ItemEditField id={`${fieldBaseId}-quantity`} label="quantity">
									<input
										id={`${fieldBaseId}-quantity`}
										type="text"
										inputMode="numeric"
										pattern="[0-9]*"
										min={1}
										value={item.quantity ?? ''}
										onChange={(e) => {
											const raw = Number(normalizeIntegerInput(e.target.value))
											onQuantityChange(
												Number.isFinite(raw) && raw > 0 ? raw : 1,
											)
										}}
										onFocus={(e) => e.currentTarget.select()}
										className={inputClassName}
										aria-label={`Quantity for ${item.productName}`}
									/>
								</ItemEditField>
								<div className="grid grid-cols-3 gap-2 sm:w-[150px]">
									<QuantityButton
										label="-1"
										onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
									/>
									<QuantityButton
										label="+1"
										onClick={() => onQuantityChange(quantity + 1)}
									/>
									<QuantityButton
										label="+10"
										onClick={() => onQuantityChange(quantity + 10)}
									/>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section
					ref={setDesktopToolRef('calculator')}
					aria-labelledby={`${fieldBaseId}-calculator-title`}
					className={desktopToolSectionClassName(
						'calculator',
						'rounded-md border border-[var(--color-border)] px-3 py-3',
					)}
				>
					<div className="flex items-center justify-between gap-3">
						<h3
							id={`${fieldBaseId}-calculator-title`}
							className={desktopToolHeadingClassName('calculator')}
						>
							calculator
						</h3>
						<button
							type="button"
							onClick={() => {
								setCalculatorExpression(String(lineTotal || ''))
								setCalculatorError('')
							}}
							className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)] outline-none transition-colors hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
						>
							use current
						</button>
					</div>
					<div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
						<ItemEditField
							id={`${fieldBaseId}-calculator-expression`}
							label="calculation"
						>
							<input
								id={`${fieldBaseId}-calculator-expression`}
								type="text"
								inputMode="decimal"
								value={calculatorExpression}
								onChange={(e) => {
									setCalculatorExpression(
										normalizeArithmeticInput(e.target.value),
									)
									setCalculatorError('')
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault()
										runCalculator()
									}
								}}
								onFocus={(e) => e.currentTarget.select()}
								className={inputClassName}
								placeholder="Arithmetic expression"
								aria-label={`Calculator for ${item.productName}`}
							/>
						</ItemEditField>
						<button
							type="button"
							onClick={runCalculator}
							className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-md border border-[var(--color-border)] px-3 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text)] outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-primary)]/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:text-[var(--color-text-subtle)]"
						>
							calculate
						</button>
					</div>
					<div className="mt-2 grid grid-cols-4 gap-2">
						{['+', '-', '*', '/'].map((operator) => (
							<button
								key={operator}
								type="button"
								onClick={() => appendCalculatorToken(operator)}
								className="h-9 rounded-md border border-[var(--color-border)] font-[family-name:var(--font-plex-mono)] text-[14px] font-semibold text-[var(--color-text-muted)] outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-primary)]/[0.04] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
							>
								{operator}
							</button>
						))}
					</div>
					<div className="mt-3 grid gap-2 sm:grid-cols-2">
						<PanelMetric
							label="result"
							value={
								calculatorResult == null
									? '—'
									: formatPlainNumber(calculatorResult)
							}
							emphasis={calculatorResult != null}
						/>
						<PanelMetric
							label="current line"
							value={formatLineMoney(lineTotal, 2)}
						/>
					</div>
					{calculatorError && (
						<p
							role="alert"
							className="mt-2 font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-signal-red)]"
						>
							{calculatorError}
						</p>
					)}
				</section>

				<section
					ref={setDesktopToolRef('budget')}
					aria-labelledby={`${fieldBaseId}-budget-title`}
					className={desktopToolSectionClassName(
						'budget',
						'rounded-md border border-[var(--color-border)] px-3 py-3',
					)}
				>
					<div className="flex items-center justify-between gap-3">
						<h3
							id={`${fieldBaseId}-budget-title`}
							className={desktopToolHeadingClassName('budget')}
						>
							budget planner
						</h3>
						<span className="font-[family-name:var(--font-plex-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
							{formatMarginPercent(margin)}
						</span>
					</div>
					<div className="mt-3 grid gap-3">
						<ItemEditField id={`${fieldBaseId}-budget`} label="approved budget">
							<input
								id={`${fieldBaseId}-budget`}
								type="text"
								inputMode="decimal"
								value={budgetAmount}
								onChange={(e) =>
									setBudgetAmount(normalizeDecimalInput(e.target.value))
								}
								onFocus={(e) => e.currentTarget.select()}
								className={inputClassName}
								placeholder="Approved customer budget"
								aria-label={`Budget planner for ${item.productName}`}
							/>
						</ItemEditField>
						<div className="grid grid-cols-4 gap-2">
							{PANEL_CURRENCIES.map((currency) => (
								<button
									key={currency}
									type="button"
									onClick={() => setBudgetCurrency(currency)}
									aria-pressed={effectiveBudgetCurrency === currency}
									className={`h-9 rounded-md border px-2 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
										effectiveBudgetCurrency === currency
											? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.08] text-[var(--color-text)]'
											: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
									}`}
								>
									{currency}
								</button>
							))}
						</div>
						<AutomaticFxLine
							summary={budgetRateSummary}
							updatedLabel={exchangeUpdatedLabel}
						/>
					</div>
					<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
						<PanelMetric
							label="available"
							value={formatUnitCount(budgetUnits)}
							emphasis={budgetUnits != null}
						/>
						<PanelMetric
							label="unit at margin"
							value={formatLineMoney(unitPriceAtMargin)}
						/>
						<PanelMetric
							label="budget used"
							value={formatMoneyAmount(budgetUsed)}
						/>
						<PanelMetric
							label="left over"
							value={formatMoneyAmount(budgetRemaining)}
						/>
					</div>
					{budgetUsesForeignRate &&
						!canUseCurrencyRate(effectiveBudgetCurrency) && (
							<p className="mt-2 font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-text-subtle)]">
								Automatic FX is unavailable for {effectiveBudgetCurrency}. Use
								an EGP budget or try again later.
							</p>
						)}
				</section>

				<section
					ref={setDesktopToolRef('exchange')}
					aria-labelledby={`${fieldBaseId}-exchange-title`}
					className={desktopToolSectionClassName(
						'exchange',
						'rounded-md border border-[var(--color-border)] px-3 py-3',
					)}
				>
					<div className="flex items-center justify-between gap-3">
						<h3
							id={`${fieldBaseId}-exchange-title`}
							className={desktopToolHeadingClassName('exchange')}
						>
							exchange desk
						</h3>
						<span className="font-[family-name:var(--font-archivo)] text-[10px] italic text-[var(--color-text-subtle)]">
							automatic rate
						</span>
					</div>
					<div className="mt-3 grid grid-cols-4 gap-2">
						{PANEL_CURRENCIES.map((currency) => (
							<button
								key={currency}
								type="button"
								onClick={() => setExchangeCurrency(currency)}
								aria-pressed={exchangeCurrency === currency}
								className={`h-9 rounded-md border px-2 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
									exchangeCurrency === currency
										? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.08] text-[var(--color-text)]'
										: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
								}`}
							>
								{currency}
							</button>
						))}
					</div>
					<AutomaticFxLine
						summary={exchangeRateSummary}
						updatedLabel={exchangeUpdatedLabel}
						className="mt-3"
					/>
					<div className="mt-3 grid gap-2 sm:grid-cols-2">
						<PanelMetric
							label="unit in egp"
							value={formatLineMoney(sellPrice)}
						/>
						<PanelMetric
							label="line in egp"
							value={formatLineMoney(lineTotal, 2)}
							emphasis
						/>
						<PanelMetric
							label={`unit in ${exchangeCurrency}`}
							value={formatExchangeValue(exchangeUnitValue, exchangeCurrency)}
							emphasis={canConvertExchange}
						/>
						<PanelMetric
							label={`line in ${exchangeCurrency}`}
							value={formatExchangeValue(exchangeLineValue, exchangeCurrency)}
							emphasis={canConvertExchange}
						/>
					</div>
					{exchangeNeedsRate && !canConvertExchange && (
						<p className="mt-2 font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-text-subtle)]">
							Automatic FX is unavailable for {exchangeCurrency}. Try again
							later.
						</p>
					)}
				</section>

				<section
					ref={setDesktopToolRef('inventory')}
					aria-labelledby={`${fieldBaseId}-actions-title`}
					className={desktopToolSectionClassName(
						'inventory',
						'border-t border-[var(--color-border)] pt-4',
					)}
				>
					<h3
						id={`${fieldBaseId}-actions-title`}
						className={desktopToolHeadingClassName('inventory')}
					>
						inventory handoff
					</h3>
					<div className="mt-2 grid gap-2">
						<div className="grid divide-y divide-[var(--color-border)] overflow-hidden rounded-md border border-[var(--color-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
							<PanelMetric
								label="source cost"
								value={formatLineMoney(supplierCost)}
							/>
							<PanelMetric
								label="status"
								value={isOutdated ? 'outdated' : 'updated'}
							/>
							<PanelMetric
								label="line total"
								value={formatLineMoney(lineTotal, 2)}
								emphasis
							/>
						</div>
					</div>
					<div className="mt-3 grid gap-2 sm:grid-cols-2">
						<EmployeeActionButton
							type="button"
							tone={isOutdated && !isPriceRequested ? 'primary' : 'neutral'}
							onClick={onRequestPriceUpdate}
							disabled={!isOutdated || isPriceRequested || isRequestingPrice}
							aria-disabled={
								!isOutdated || isPriceRequested || isRequestingPrice
							}
							leading={
								isRequestingPrice ? (
									<Loader2
										size={13}
										strokeWidth={2.25}
										className="animate-spin"
										aria-hidden="true"
									/>
								) : (
									<RefreshCw size={14} strokeWidth={2.2} aria-hidden="true" />
								)
							}
							fullWidthOnMobile
						>
							{requestLabel}
						</EmployeeActionButton>
					</div>
				</section>
			</div>

			<footer className="relative shrink-0 border-t border-[var(--color-border)] px-4 py-2.5 lg:px-6">
				{isDesktopToolMenuOpen && (
					<div
						role="menu"
						className="absolute bottom-[calc(100%+8px)] left-4 z-20 w-[320px] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_18px_50px_-28px_rgba(0,0,0,0.65)] lg:left-6"
					>
						<button
							type="button"
							role="menuitem"
							onClick={() => {
								selectDesktopTool(null)
							}}
							className={`flex min-h-11 w-full items-center justify-between gap-4 border-x border-b border-x-transparent border-b-[var(--color-border)] px-3 text-start outline-none transition-colors hover:border-x-black/[0.16] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 dark:hover:border-x-white/[0.16] ${
								activeDesktopTool === null
									? 'bg-[var(--color-primary)]/[0.055]'
									: ''
							}`}
						>
							<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text)]">
								Margin only
							</span>
							<span className="font-[family-name:var(--font-plex-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
								{formatMarginPercent(margin)}
							</span>
						</button>
						{mobileTools.map((tool) => (
							<button
								key={tool.id}
								type="button"
								role="menuitem"
								onClick={() => {
									selectDesktopTool(tool.id)
								}}
								className={`flex min-h-11 w-full items-center justify-between gap-4 border-x border-b border-x-transparent border-b-[var(--color-border)] px-3 text-start outline-none transition-colors hover:border-x-black/[0.16] last:border-b-0 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 dark:hover:border-x-white/[0.16] ${
									activeDesktopTool === tool.id
										? 'bg-[var(--color-primary)]/[0.055]'
										: ''
								}`}
							>
								<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text)]">
									{tool.label}
								</span>
								<span className="font-[family-name:var(--font-plex-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
									{tool.detail}
								</span>
							</button>
						))}
					</div>
				)}
				<div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
					<button
						type="button"
						onClick={() => setIsDesktopToolMenuOpen((open) => !open)}
						aria-label="Choose item tools"
						aria-haspopup="menu"
						aria-expanded={isDesktopToolMenuOpen}
						className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					>
						<MoreHorizontal size={18} strokeWidth={2.2} aria-hidden="true" />
					</button>
					<EmployeeActionButton
						type="button"
						onClick={onClose}
						tone="primary"
						leading={<Save size={14} strokeWidth={2.2} aria-hidden="true" />}
						fullWidthOnMobile
						className="w-full"
					>
						Apply changes
					</EmployeeActionButton>
				</div>
			</footer>
		</div>
	)
}

function ItemEditField({
	id,
	label,
	children,
	className = '',
}: {
	id: string
	label: string
	children: React.ReactNode
	className?: string
}) {
	return (
		<div className={`min-w-0 ${className}`}>
			<label
				htmlFor={id}
				className="mb-1.5 block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--color-text-subtle)]"
			>
				{label}
			</label>
			{children}
		</div>
	)
}

function formatMarginPercent(value: number) {
	return `${value.toLocaleString('en-EG', {
		maximumFractionDigits: 1,
		minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
	})}%`
}

function formatExchangeValue(value: number | null, currency: string) {
	if (value == null || !Number.isFinite(value) || value <= 0) return '—'
	if (currency === 'EGP') return formatLineMoney(value, 2)
	return `${value.toLocaleString('en-EG', {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	})} ${currency}`
}

function MarginStepButton({
	label,
	onClick,
}: {
	label: string
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="h-11 rounded-md border border-[var(--color-border)] px-2 font-[family-name:var(--font-plex-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text-muted)] outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-primary)]/[0.04] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
		>
			{label}
		</button>
	)
}

function CompactMarginPresetButton({
	label,
	value,
	tone,
	onClick,
}: {
	label: string
	value: number
	tone: 'floor' | 'target' | 'bonus'
	onClick: (value: number) => void
}) {
	const toneClassName = {
		floor:
			'border-orange-500/30 bg-orange-500/[0.07] text-orange-600 dark:text-orange-300',
		target:
			'border-[var(--color-primary)]/25 bg-[var(--color-primary)]/[0.055] text-[var(--color-primary)]',
		bonus:
			'border-[#090909]/20 bg-[#090909]/[0.045] text-[#090909] dark:border-white/20 dark:bg-white/[0.045] dark:text-white',
	}[tone]

	return (
		<button
			type="button"
			onClick={() => onClick(value)}
			className={`flex h-10 min-w-0 items-center justify-center gap-1 rounded-md border px-1 font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase outline-none transition-colors hover:bg-black/[0.025] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 dark:hover:bg-white/[0.035] ${toneClassName}`}
			style={{ letterSpacing: 0 }}
		>
			<span className="truncate">{label}</span>
			<span className="font-[family-name:var(--font-plex-mono)] text-[10px] tabular-nums">
				{formatMarginPercent(value)}
			</span>
		</button>
	)
}

function MarginPresetButton({
	label,
	value,
	tone,
	onClick,
}: {
	label: string
	value: number
	tone: 'floor' | 'target' | 'bonus'
	onClick: (value: number) => void
}) {
	const toneClassName = {
		floor:
			'border-orange-500/30 bg-orange-500/[0.07] text-orange-600 dark:text-orange-300',
		target:
			'border-[var(--color-primary)]/25 bg-[var(--color-primary)]/[0.065] text-[var(--color-primary)]',
		bonus:
			'border-[#090909]/20 bg-[#090909]/[0.05] text-[#090909] dark:border-white/20 dark:bg-white/[0.05] dark:text-white',
	}[tone]

	return (
		<button
			type="button"
			onClick={() => onClick(value)}
			className={`min-h-11 rounded-md border px-2 py-2 text-start outline-none transition-colors hover:bg-black/[0.025] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 dark:hover:bg-white/[0.035] ${toneClassName}`}
		>
			<span className="block font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.1em]">
				{label}
			</span>
			<span className="mt-0.5 block font-[family-name:var(--font-plex-mono)] text-[12px] font-semibold tabular-nums">
				{formatMarginPercent(value)}
			</span>
		</button>
	)
}

function QuantityButton({
	label,
	onClick,
}: {
	label: string
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="h-11 rounded-md border border-[var(--color-border)] px-2 font-[family-name:var(--font-plex-mono)] text-[11px] font-semibold tabular-nums text-[var(--color-text-muted)] outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
		>
			{label}
		</button>
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
		return false
	})
	return match
}

function lineProductKey(item: LineItemFormValues): string {
	return item.productSlug || item.id
}

function lineMarginThreshold(
	item: Pick<LineItemFormValues, 'productCategory' | 'productSlug'>,
	thresholds: MarginThresholds[],
) {
	return resolveMarginThreshold(thresholds, {
		categorySlug: item.productCategory || null,
		productSlug: item.productSlug || null,
	})
}

// --- Main view ---

export function QuoteBuilderView({
	quoteId: initialQuoteId,
	rfqId,
	isNewCustomer = false,
	initialCustomerCompany,
	initialCustomerEmail,
	initialCustomerName,
	initialCustomerPhone,
	initialDeliveryAddress,
	onBack,
	onSave,
}: QuoteBuilderViewProps) {
	const reduceMotion = useReducedMotion()
	const auth = useInternalAuth()
	const authName = auth?.user?.user_metadata?.name
	const authEmail = auth?.user?.email
	const preparedByName =
		typeof authName === 'string' && authName.trim()
			? authName.trim()
			: typeof authEmail === 'string' && authEmail.trim()
				? authEmail.trim()
				: ''
	const custNameRef = useRef<HTMLInputElement | null>(null)
	const [isPersistingCustomer, setIsPersistingCustomer] = useState(false)
	const [quoteId, setQuoteId] = useState<string | undefined>(initialQuoteId)
	const [status, setStatus] = useState<QuoteStatus>('draft')
	const quoteNumber = quoteId ?? rfqId
	const [marginThresholds, setMarginThresholds] = useState<MarginThresholds[]>(
		[],
	)
	const [exchangeRates, setExchangeRates] =
		useState<AutomaticExchangeRates>(EMPTY_EXCHANGE_RATES)
	const [_customerCredit, setCustomerCredit] = useState<{
		creditLimit: number
		currentExposure: number
		availableCredit: number
	} | null>(null)
	// Customer fields start empty; they hydrate from getQuoteBuilderData once
	// the loader resolves. No invented names or addresses.
	const [customerName, setCustomerName] = useState(initialCustomerName ?? '')
	const [customerTier, setCustomerTier] = useState<string>(
		isNewCustomer ? 'New' : '',
	)
	const rfqReference = rfqId
	const [deliveryAddress, setDeliveryAddress] = useState(
		initialDeliveryAddress ?? '',
	)
	const deliverySectionRef = useRef<HTMLDivElement | null>(null)
	const approvalSectionRef = useRef<HTMLDivElement | null>(null)
	const deliveryAttentionTimerRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null)
	const [isDeliveryDateAttentionVisible, setDeliveryDateAttentionVisible] =
		useState(false)
	const [deliveryDatePickerOpenSignal, setDeliveryDatePickerOpenSignal] =
		useState(0)
	const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

	// Customer form fields (Step 1)
	const [custPhone, setCustPhone] = useState(
		toNationalEgyptianMobile(initialCustomerPhone ?? ''),
	)
	const [custEmail, setCustEmail] = useState(initialCustomerEmail ?? '')
	const [custCompany, setCustCompany] = useState(initialCustomerCompany ?? '')

	// Wizard state — start at Step 1 (Customer) for new, Step 2 (Build) for existing RFQ
	const isFromRfq = !isNewCustomer && !rfqId.startsWith('new-')
	const canEditCustomerFields = !isFromRfq
	const [currentStep, setCurrentStep] = useState(isFromRfq ? 2 : 1)
	const [declineOpen, setDeclineOpen] = useState(false)
	const [cancelOpen, setCancelOpen] = useState(false)
	const [callDialogOpen, setCallDialogOpen] = useState(false)
	const [itemEditIndex, setItemEditIndex] = useState<number | null>(null)
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
	const { remove: removeItem, replace: replaceItems } = useFieldArray({
		control: methods.control,
		name: 'lineItems',
	})
	const [searchOpen, setSearchOpen] = useState(false)

	// Compute totals from watched items (useWatch, NOT watch)
	const watchedItems = useWatch({ control: methods.control, name: 'lineItems' })
	const watchedDeliveryDate = useWatch({
		control: methods.control,
		name: 'deliveryDate',
	})
	const watchedDeliveryWindow = useWatch({
		control: methods.control,
		name: 'deliveryWindow',
	})
	const watchedSpecialInstructions = useWatch({
		control: methods.control,
		name: 'specialInstructions',
	})
	const catalogSelections = useMemo(
		() =>
			(watchedItems ?? []).map((item) => ({
				productId: lineProductKey(item),
				productName: item.productName,
				quantity: item.quantity,
			})),
		[watchedItems],
	)
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
	const [approvalSignature, setApprovalSignature] =
		useState<ApprovalSignatureState>({
			needsApproval: false,
			managerSigned: false,
		})
	const handleApprovalBlockedChange = useCallback(
		(blocked: boolean, reason: string | null) => {
			setApprovalBlocked(blocked)
			setApprovalBlockReason(reason)
		},
		[],
	)
	const handleApprovalSignatureChange = useCallback(
		(next: ApprovalSignatureState) => {
			setApprovalSignature((prev) =>
				prev.needsApproval === next.needsApproval &&
				prev.managerName === next.managerName &&
				prev.managerSigned === next.managerSigned
					? prev
					: next,
			)
		},
		[],
	)
	const canEvaluateByStatus =
		status !== 'accepted' &&
		status !== 'declined' &&
		rfqStatus !== 'declined' &&
		rfqStatus !== 'expired'
	const hasOutdatedPrices = outdatedItems.length > 0
	const canEvaluate =
		canEvaluateByStatus && !approvalBlocked && !hasOutdatedPrices

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
			const message = err instanceof Error ? err.message : ''
			if (message.includes('outdated_quote_prices')) {
				setValidationErrors([
					'Inventory must update outdated prices before finance.',
				])
				if (outdatedItems.length > 0) handleRequestPriceUpdate(outdatedItems)
			}
			setIsEvaluating(false)
		}
	}

	const [requestedPriceIds, setRequestedPriceIds] = useState<Set<string>>(
		new Set(),
	)
	const [priceUpdateNotice, setPriceUpdateNotice] =
		useState<PriceUpdateNoticeState | null>(null)
	const requestUpdateMutation = useMutation({
		mutationFn: requestInventoryPriceUpdate,
		onSuccess: (result) => {
			if (!result.success) {
				setValidationErrors([
					result.error ?? 'Inventory could not be notified. Try again.',
				])
				return
			}
			setPriceUpdateNotice({
				inventoryContact: result.inventoryContact,
				requestedCount: result.requestedCount,
				skippedDuplicate: result.skippedDuplicate,
				updatedAt: Date.now(),
			})
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
			setValidationErrors([])
			requestUpdateMutation.mutate({
				data: {
					rfqId,
					items: items.map((i) => ({
						productId: lineProductKey(i),
						productName: i.productName,
						supplierName: i.supplierName,
					})),
				},
			})
			setRequestedPriceIds((prev) => {
				const next = new Set(prev)
				for (const it of items) next.add(lineProductKey(it))
				return next
			})
		},
		[requestUpdateMutation, rfqId],
	)
	const [validationErrors, setValidationErrors] = useState<string[]>([])

	const goToStep = (step: number) => {
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
				setExchangeRates(data.exchangeRates ?? EMPTY_EXCHANGE_RATES)
				setCustomerCredit(data.customerCredit)
				if (data.rfqStatus) setRfqStatus(data.rfqStatus)
				// Hydrate the quote status from the existing draft (if any) so
				// the Evaluate button knows whether the order has already been
				// committed to Finance.
				if (data.quoteStatus) setStatus(data.quoteStatus as QuoteStatus)

				if (!isNewCustomer && data.customer) {
					setCustomerName(data.customer.name)
					setCustomerTier(
						data.customer.tier === 'new' ? 'New' : data.customer.tier,
					)
					setCustPhone(toNationalEgyptianMobile(data.customer.phone ?? ''))
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
					const getScopedThreshold = (
						productSlug?: string,
						category?: string,
					) => {
						return resolveMarginThreshold(data.marginThresholds, {
							categorySlug: category ?? null,
							productSlug: productSlug ?? null,
						})
					}

					const items = data.suggestedProducts.map((p, i) => {
						// If the saved draft already has a margin/price (hydrated by the
						// server), respect it; otherwise fall back to the category target.
						const savedMargin = (p as { marginPercent?: number }).marginPercent
						const savedSellPrice = (p as { sellPrice?: number }).sellPrice
						const productSlug = p.productSlug ?? p.id ?? `item-${i}`
						const productCategory = p.productCategory ?? p.category ?? ''
						const threshold = getScopedThreshold(productSlug, productCategory)
						const margin = clampQuoteMargin(
							savedMargin ?? threshold.target,
							Math.max(MINIMUM_MARGIN_PERCENT, threshold.floor),
							threshold.bonus,
						)
						const canReuseSavedSellPrice =
							savedMargin != null &&
							Math.abs(savedMargin - margin) < 0.05 &&
							savedSellPrice != null
						const sellPrice = canReuseSavedSellPrice
							? savedSellPrice
							: p.supplierCost > 0
								? computeSellPriceFromMargin(p.supplierCost, margin)
								: 0
						return {
							id: productSlug,
							productSlug,
							productCategory,
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
						productSlug: item.productSlug,
						productCategory: item.productCategory,
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
						productSlug: item.productSlug,
						productCategory: item.productCategory,
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

	const primaryMarginThreshold =
		marginThresholds.length > 0
			? resolveMarginThreshold(marginThresholds, {})
			: null
	const updateLineQuantity = (index: number, quantity: number) => {
		const item = (watchedItems ?? [])[index]
		if (!item) return
		methods.setValue(`lineItems.${index}.quantity`, quantity, {
			shouldDirty: true,
		})
		const sellPrice = item.sellPrice || 0
		methods.setValue(
			`lineItems.${index}.lineTotal`,
			Math.round(sellPrice * quantity * 100) / 100,
			{ shouldDirty: true },
		)
	}
	const updateLineMargin = (index: number, margin: number) => {
		const item = (watchedItems ?? [])[index]
		if (!item) return
		const threshold = lineMarginThreshold(item, marginThresholds)
		const nextMargin = clampQuoteMargin(
			margin,
			Math.max(MINIMUM_MARGIN_PERCENT, threshold.floor),
			threshold.bonus,
		)
		const price = computeSellPriceFromMargin(item.supplierCost || 0, nextMargin)
		methods.setValue(`lineItems.${index}.marginPercent`, nextMargin, {
			shouldDirty: true,
		})
		methods.setValue(`lineItems.${index}.sellPrice`, price, {
			shouldDirty: true,
		})
		methods.setValue(
			`lineItems.${index}.lineTotal`,
			Math.round(price * item.quantity * 100) / 100,
			{ shouldDirty: true },
		)
	}
	const handleFinishQuoteEdit = (selections: ProductCatalogSelection[]) => {
		const currentItems = methods.getValues('lineItems')
		const currentById = new Map(
			currentItems.map((item) => [lineProductKey(item), item]),
		)
		const selectedById = new Map(
			selections
				.filter((selection) => selection.quantity > 0)
				.map((selection) => [selection.productId, selection]),
		)
		const orderedSelectedIds = [
			...currentItems
				.map((item) => lineProductKey(item))
				.filter((productId) => selectedById.has(productId)),
			...selections
				.map((selection) => selection.productId)
				.filter((productId) => !currentById.has(productId)),
		]
		const nextItems = orderedSelectedIds.flatMap((productId) => {
			const selection = selectedById.get(productId)
			if (!selection) return []
			const quantity = Math.max(1, Math.round(selection.quantity))
			const existing = currentById.get(productId)
			if (existing) {
				const liveProduct = selection.product
				const productCategory =
					liveProduct?.category ?? existing.productCategory ?? ''
				const productSlug = liveProduct?.slug ?? existing.productSlug
				const threshold = resolveMarginThreshold(marginThresholds, {
					categorySlug: productCategory || null,
					productSlug: productSlug || null,
				})
				const margin = clampQuoteMargin(
					existing.marginPercent,
					Math.max(MINIMUM_MARGIN_PERCENT, threshold.floor),
					threshold.bonus,
				)
				const supplierCost = liveProduct?.supplierCost ?? existing.supplierCost
				const sellPrice = liveProduct
					? computeSellPriceFromMargin(supplierCost, margin)
					: existing.sellPrice || 0
				return [
					{
						...existing,
						freshnessIndicator:
							liveProduct?.freshness ?? existing.freshnessIndicator,
						lineTotal: Math.round(sellPrice * quantity * 100) / 100,
						marginPercent: margin,
						priceStatus: liveProduct?.priceStatus ?? existing.priceStatus,
						productCategory,
						productName: liveProduct?.name ?? existing.productName,
						productSlug,
						quantity,
						recentlyOrdered:
							liveProduct?.recentlyOrdered ?? existing.recentlyOrdered,
						sellPrice,
						specification: liveProduct?.specification ?? existing.specification,
						supplierCost,
						supplierName: liveProduct?.supplierName ?? existing.supplierName,
						unit: liveProduct?.unit ?? existing.unit,
					},
				]
			}
			if (!selection.product) return []
			const threshold = resolveMarginThreshold(marginThresholds, {
				categorySlug: selection.product.category || null,
				productSlug: selection.product.slug,
			})
			const margin = clampQuoteMargin(
				Math.max(MINIMUM_MARGIN_PERCENT, threshold.target),
				Math.max(MINIMUM_MARGIN_PERCENT, threshold.floor),
				threshold.bonus,
			)
			const sellPrice = computeSellPriceFromMargin(
				selection.product.supplierCost,
				margin,
			)
			return [
				{
					id: selection.product.slug,
					productSlug: selection.product.slug,
					productCategory: selection.product.category,
					productName: selection.product.name,
					specification: selection.product.specification,
					quantity,
					unit: selection.product.unit,
					supplierCost: selection.product.supplierCost,
					marginPercent: margin,
					sellPrice,
					lineTotal: Math.round(sellPrice * quantity * 100) / 100,
					freshnessIndicator: selection.product.freshness,
					priceStatus: selection.product.priceStatus,
					recentlyOrdered: selection.product.recentlyOrdered,
					supplierName: selection.product.supplierName,
				},
			]
		})
		replaceItems(nextItems)
	}

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
	const canRequestPriceUpdate =
		outdatedItems.length > 0 && !requestUpdateMutation.isPending
	const outdatedPriceLabel = requestUpdateMutation.isPending
		? 'Updating prices'
		: outdatedItems.length > 1
			? `Update prices (${outdatedItems.length})`
			: 'Update price'
	const totalLabel = `EGP ${total.toLocaleString('en-EG', {
		minimumFractionDigits: 2,
	})}`
	const reviewItemCount = watchedItems?.length ?? 0
	const reviewDeliveryDate = formatReviewDate(watchedDeliveryDate)
	const reviewDeliveryWindow = formatDeliveryWindow(watchedDeliveryWindow)
	const reviewDateTime = reviewDeliveryDate
		? `${reviewDeliveryDate} at ${reviewDeliveryWindow}`
		: reviewDeliveryWindow
	const reviewNotes = (watchedSpecialInstructions ?? '').trim()
	const reviewCustomerName = customerName || 'Customer'
	const reviewDeliveryAddress = deliveryAddress || 'No address'
	const hasQuoteItems = reviewItemCount > 0
	const hasDeliveryAddress = isValidText(deliveryAddress, 4, 300)
	const hasDeliveryDateTime = Boolean(watchedDeliveryDate)
	const step2PrimaryAction:
		| 'add_items'
		| 'set_address'
		| 'set_datetime'
		| 'request_prices'
		| 'review' = !hasQuoteItems
		? 'add_items'
		: !hasDeliveryAddress
			? 'set_address'
			: !hasDeliveryDateTime
				? 'set_datetime'
				: outdatedItems.length > 0
					? 'request_prices'
					: 'review'
	const step2PrimaryLabel =
		step2PrimaryAction === 'add_items'
			? 'Add items'
			: step2PrimaryAction === 'set_address'
				? 'Set address'
				: step2PrimaryAction === 'set_datetime'
					? 'Set date & time'
					: step2PrimaryAction === 'request_prices'
						? outdatedPriceLabel
						: 'Review & submit'
	const handleStep2PrimaryPress = () => {
		if (step2PrimaryAction === 'add_items') {
			setSearchOpen(true)
			return
		}
		if (step2PrimaryAction === 'set_address') {
			setItemEditIndex(null)
			setMapOpen(true)
			return
		}
		if (step2PrimaryAction === 'set_datetime') {
			showDeliveryDateAttention()
			setDeliveryDatePickerOpenSignal((signal) => signal + 1)
			return
		}
		if (step2PrimaryAction === 'request_prices') {
			handleRequestPriceUpdate(outdatedItems)
			return
		}
		tryGoToStep(3)
	}
	const isStep2PrimaryDisabled =
		step2PrimaryAction === 'request_prices' && !canRequestPriceUpdate
	const reviewPrimaryNeedsApproval = approvalBlocked && canEvaluateByStatus
	const reviewPrimaryNeedsPrices = hasOutdatedPrices && canEvaluateByStatus
	const canUseReviewPrimary =
		canEvaluate || reviewPrimaryNeedsApproval || reviewPrimaryNeedsPrices
	const isReviewPrimaryBusy =
		isEvaluating ||
		(reviewPrimaryNeedsPrices && requestUpdateMutation.isPending)
	const handleReviewPrimaryPress = () => {
		if (reviewPrimaryNeedsPrices) {
			handleRequestPriceUpdate(outdatedItems)
			return
		}
		if (reviewPrimaryNeedsApproval) {
			approvalSectionRef.current?.scrollIntoView({
				block: 'center',
				behavior: reduceMotion ? 'auto' : 'smooth',
			})
			return
		}
		void handleEvaluate()
	}
	const handlePrintReport = useCallback(
		(event: React.MouseEvent<HTMLAnchorElement>) => {
			event.preventDefault()
			document.body.dataset.printTarget = 'quote-report'
			const cleanup = () => {
				delete document.body.dataset.printTarget
				window.removeEventListener('afterprint', cleanup)
			}
			window.addEventListener('afterprint', cleanup)
			window.print()
			window.setTimeout(cleanup, 1000)
		},
		[],
	)

	const handleSaveForLater = async () => {
		const savedId = await persistDraftAndGetId()
		if (!savedId) {
			setValidationErrors(['Add at least one item before saving.'])
			return
		}
		if (onSave) {
			onSave()
		} else {
			onBack?.()
		}
	}

	const handleCallCustomer = () => setCallDialogOpen(true)

	return (
		<div className="flex h-full flex-col">
			<header className="border-b border-[var(--color-border)] px-3 py-2.5 sm:px-5 lg:px-8">
				<div className="flex min-w-0 items-center justify-between gap-3">
					<div className="flex min-w-0 flex-1 items-center gap-1.5">
						<h1 className="min-w-0 truncate font-[family-name:var(--font-archivo)] text-[17px] font-semibold text-[var(--color-text)]">
							{customerName || 'Customer'}
						</h1>
						<button
							type="button"
							onClick={handleCallCustomer}
							aria-label={`Call ${customerName || 'customer'}`}
							className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-[var(--color-primary)] outline-none transition-colors hover:bg-[var(--color-primary)]/[0.06] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
						>
							<Phone size={15} strokeWidth={2} aria-hidden="true" />
						</button>
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<QuoteChromeAction
							ariaLabel="Reject quote"
							onClick={() => setDeclineOpen(true)}
							tone="danger"
						>
							<Undo2 size={15} strokeWidth={2.2} aria-hidden="true" />
						</QuoteChromeAction>
						<QuoteChromeAction
							ariaLabel="Cancel quote"
							onClick={() => setCancelOpen(true)}
							tone="danger"
						>
							<X size={15} strokeWidth={2.2} aria-hidden="true" />
						</QuoteChromeAction>
						<QuoteChromeAction
							ariaLabel="Save for later"
							onClick={handleSaveForLater}
						>
							<Save size={15} strokeWidth={2.2} aria-hidden="true" />
						</QuoteChromeAction>
					</div>
				</div>
			</header>

			{/* Step content */}
			<div className="flex flex-1 overflow-hidden">
				{/* Main content — scrollable */}
				<div
					className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-28 sm:px-5 sm:pb-32 lg:px-8 lg:pb-16"
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
									className="pb-6 pt-3 sm:pt-5 lg:pt-8"
								>
									<section
										aria-label="Customer confirmation"
										aria-busy={isPersistingCustomer}
										className="mx-auto w-full max-w-[980px]"
										onKeyDown={(e) => {
											const target = e.target as HTMLElement
											const isTextArea = target.tagName === 'TEXTAREA'
											if (
												e.key === 'Enter' &&
												!isTextArea &&
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
										<header className="grid gap-3 border-b border-[var(--color-border)] pb-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
											<div className="min-w-0">
												<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
													<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tabular-nums text-[var(--color-text-subtle)]">
														01
													</span>
													<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold uppercase text-[var(--color-text)]">
														Customer contract
													</span>
													<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tabular-nums text-[var(--color-text-subtle)]">
														{rfqReference}
													</span>
												</div>
											</div>
											<div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
												<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">
													{canEditCustomerFields
														? 'Editable new order'
														: 'Locked RFQ record'}
												</span>
												{customerTier && (
													<>
														<span
															aria-hidden="true"
															className="h-1 w-1 rounded-full bg-[var(--color-border)]"
														/>
														<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase text-[var(--color-primary)]">
															tier {customerTier.toLowerCase()}
														</span>
													</>
												)}
											</div>
										</header>

										<div className="mt-4">
											<div className="min-w-0 border-t border-[var(--color-border)]">
												<CustomerFlowField
													id="cust-name"
													label="Contracting party"
													error={errorForField('cust-name', validationErrors)}
													className="py-4"
												>
													<input
														ref={custNameRef}
														id="cust-name"
														type="text"
														value={customerName}
														onChange={(e) => setCustomerName(e.target.value)}
														readOnly={!canEditCustomerFields}
														onFocus={() => {
															if (validationErrors.length > 0)
																setValidationErrors([])
														}}
														placeholder="Customer name"
														autoComplete="name"
														aria-invalid={
															!!errorForField('cust-name', validationErrors)
														}
														aria-describedby={
															errorForField('cust-name', validationErrors)
																? 'cust-name-error'
																: undefined
														}
														className={`w-full bg-transparent font-[family-name:var(--font-archivo)] text-[24px] font-semibold leading-tight text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/40 sm:text-[30px] ${
															canEditCustomerFields
																? ''
																: 'cursor-default focus-visible:ring-0'
														}`}
														style={{ letterSpacing: 0 }}
													/>
												</CustomerFlowField>
												<CustomerFlowField
													id="cust-company"
													label="Company"
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
														readOnly={!canEditCustomerFields}
														placeholder="—"
														autoComplete="organization"
														aria-invalid={
															!!errorForField('cust-company', validationErrors)
														}
														aria-describedby={
															errorForField('cust-company', validationErrors)
																? 'cust-company-error'
																: undefined
														}
														className={`w-full bg-transparent font-[family-name:var(--font-archivo)] text-[15px] font-medium text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/40 ${
															canEditCustomerFields ? '' : 'cursor-default'
														}`}
													/>
												</CustomerFlowField>
												<div className="grid gap-0 md:grid-cols-2 md:gap-x-8">
													<CustomerFlowField
														id="cust-phone"
														label="Direct phone"
														error={errorForField(
															'cust-phone',
															validationErrors,
														)}
													>
														<PhoneInput
															id="cust-phone"
															value={custPhone}
															onChange={setCustPhone}
															readOnly={!canEditCustomerFields}
															inputClassName={`font-[family-name:var(--font-plex-mono)] text-[15px] font-medium ${
																canEditCustomerFields ? '' : 'cursor-default'
															}`}
															ariaInvalid={
																!!errorForField('cust-phone', validationErrors)
															}
															ariaDescribedBy={
																errorForField('cust-phone', validationErrors)
																	? 'cust-phone-error'
																	: undefined
															}
														/>
													</CustomerFlowField>
													<CustomerFlowField
														id="cust-email"
														label="Email"
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
															readOnly={!canEditCustomerFields}
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
															className={`w-full bg-transparent font-[family-name:var(--font-archivo)] text-[15px] font-medium text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/40 ${
																canEditCustomerFields ? '' : 'cursor-default'
															}`}
														/>
													</CustomerFlowField>
												</div>
											</div>
										</div>

										{validationErrors.length > 0 && (
											<div
												role="alert"
												aria-live="polite"
												className="mt-3 rounded-md border border-red-600/20 bg-red-600/[0.045] px-4 py-3"
											>
												<p className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase text-[var(--color-signal-red)]">
													{validationErrors.length === 1
														? '1 field needs attention'
														: `${validationErrors.length} fields need attention`}
												</p>
												<ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
													{validationErrors.map((err) => (
														<li
															key={err}
															className="font-[family-name:var(--font-archivo)] text-[12px] italic leading-5 text-[var(--color-signal-red)]"
														>
															{err}
														</li>
													))}
												</ul>
											</div>
										)}
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
									<WorkSection
										label="items"
										className="mt-3"
										meta={
											<>
												{(watchedItems ?? []).length}{' '}
												{(watchedItems ?? []).length === 1 ? 'line' : 'lines'}
												{subtotal > 0 && (
													<>
														{' '}
														·{' '}
														<span className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums">
															{Math.round(subtotal).toLocaleString('en-EG')} EGP
														</span>
													</>
												)}{' '}
												·{' '}
												<span className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums">
													{quoteNumber}
												</span>
											</>
										}
									>
										<ul
											aria-label={`Line items (${(watchedItems ?? []).length})`}
										>
											{(watchedItems ?? []).map((item, i) => {
												const items = watchedItems ?? []
												const marginColor = getLineMarginColor(
													item.marginPercent || 0,
													primaryMarginThreshold,
												)
												return (
													<QuoteLineCard
														key={item.id || i}
														item={item}
														index={i}
														isLast={i === items.length - 1}
														marginColor={marginColor}
														onEditMargin={() => {
															setMapOpen(false)
															setItemEditIndex(i)
														}}
														onRemove={() => removeItem(i)}
													/>
												)
											})}

											<AddQuoteLineCard onAdd={() => setSearchOpen(true)} />
										</ul>
									</WorkSection>

									<ProductSearchMenu
										isOpen={searchOpen}
										onClose={() => setSearchOpen(false)}
										initialSelections={catalogSelections}
										onFinishSelection={handleFinishQuoteEdit}
									/>

									<div ref={deliverySectionRef}>
										<div className="mt-4 border-t-2 border-[var(--color-border)]">
											<DeliveryTerms
												deliveryAddress={deliveryAddress}
												onAddressChange={setDeliveryAddress}
												highlightDate={isDeliveryDateAttentionVisible}
												datePickerOpenSignal={deliveryDatePickerOpenSignal}
												onAddressPress={() => {
													setItemEditIndex(null)
													setMapOpen(true)
												}}
												totalWeightTons={12}
												leadTimeDays={2}
											/>
										</div>
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
									className="pb-6 sm:pt-4 lg:pt-5"
								>
									<section
										aria-label="Quote review"
										id="quote-report-print"
										className="mx-auto w-full max-w-[980px]"
									>
										<div
											data-print-hidden="true"
											className="flex justify-end px-5 pt-2 sm:px-8 lg:px-12"
										>
											{/* biome-ignore lint/a11y/useValidAnchor: This is intentionally a real report anchor that opens browser print for the linked report section. */}
											<a
												href="#quote-report-print"
												onClick={handlePrintReport}
												className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase text-[var(--color-primary)] underline decoration-[var(--color-primary)]/30 underline-offset-4 outline-none transition-colors hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
											>
												Print full report
											</a>
										</div>
										<ReviewReportTitle
											customerName={reviewCustomerName}
											orderNumber={quoteNumber}
										/>

										<div
											data-print-sheet="true"
											className="mt-2 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_22px_70px_-54px_rgba(0,0,0,0.72)]"
										>
											<ReportSectionBar
												title="Commercial Sheet"
												meta={quoteNumber}
											/>
											<div className="grid border-b border-[var(--color-border)] md:grid-cols-2 md:divide-x md:divide-[var(--color-border)]">
												<ReportInfoCell
													label="Destination"
													value={reviewDeliveryAddress}
													placeholder={!deliveryAddress}
													onPress={() => goToStep(2)}
												/>
												<ReportInfoCell
													label="Delivery Time"
													value={
														reviewDeliveryDate
															? reviewDateTime
															: 'Pick date & time'
													}
													placeholder={!reviewDeliveryDate}
													onPress={() => goToStep(2)}
												/>
											</div>

											<section aria-labelledby="review-items-title">
												<ReportSectionBar
													id="review-items-title"
													title="Material Lines"
													meta={`${reviewItemCount} ${reviewItemCount === 1 ? 'line' : 'lines'}`}
													onEdit={() => goToStep(2)}
												/>
												<ul>
													{(watchedItems ?? []).map((item, idx) => (
														<ReportLineRow
															key={lineProductKey(item) || idx}
															item={item}
															index={idx}
															marginColor={getLineMarginColor(
																item.marginPercent || 0,
																primaryMarginThreshold,
															)}
														/>
													))}
												</ul>
											</section>

											<div className="grid border-t border-[var(--color-border)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
												<section
													aria-labelledby="review-notes-title"
													className="min-w-0"
												>
													<ReportSectionBar
														id="review-notes-title"
														title="Notes"
														onEdit={() => goToStep(2)}
													/>
													<ReportTextBlock
														label="Customer / delivery notes"
														value={reviewNotes || 'No notes recorded.'}
														placeholder={!reviewNotes}
													/>
												</section>

												<aside className="min-w-0 border-t border-[var(--color-border)] lg:border-l lg:border-t-0">
													<ReportSectionBar title="Ledger" />
													<ReportSummaryRow
														label="subtotal"
														value={formatLineMoney(subtotal, 2)}
													/>
													<ReportSummaryRow
														label="vat 14%"
														value={formatLineMoney(vatAmount, 2)}
													/>
													<ReportSummaryRow
														label="margin"
														value={`${blendedMargin}%`}
														tone={getLineMarginColor(
															blendedMargin,
															primaryMarginThreshold,
														)}
													/>
													<ReportSummaryRow
														label="total"
														value={formatLineMoney(total, 2)}
														emphasis
													/>
												</aside>
											</div>

											<div ref={approvalSectionRef}>
												<ApprovalWorkflow
													marginPercent={blendedMargin}
													totalValue={total}
													thresholds={marginThresholds}
													status={
														status === 'pending_approval'
															? 'pending_approval'
															: status === 'approved'
																? 'approved'
																: 'draft'
													}
													className="border-t border-[var(--color-border)] px-4 py-4 sm:px-6"
													onStatusChange={(newStatus) =>
														setStatus(newStatus as QuoteStatus)
													}
													onSendBlockedChange={handleApprovalBlockedChange}
													onSignatureChange={handleApprovalSignatureChange}
												/>
											</div>
										</div>
										<div data-print-report-page="true">
											<ReviewReportParagraph
												customerName={reviewCustomerName}
												itemCount={reviewItemCount}
												items={watchedItems ?? []}
												address={reviewDeliveryAddress}
												dateTime={
													reviewDeliveryDate
														? reviewDateTime
														: 'no date selected'
												}
												subtotal={formatLineMoney(subtotal, 2)}
												vat={formatLineMoney(vatAmount, 2)}
												total={formatLineMoney(total, 2)}
												margin={`${blendedMargin}%`}
											/>
											<div data-print-signatures="true">
												<QuoteSignatureSection
													preparedByName={preparedByName}
													needsApproval={approvalSignature.needsApproval}
													managerName={approvalSignature.managerName}
													managerSigned={approvalSignature.managerSigned}
												/>
											</div>
										</div>
									</section>
								</motion.div>
							)}
						</AnimatePresence>
					</FormProvider>
				</div>
			</div>

			{currentStep === 1 && (
				<footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[0_-14px_30px_-26px_rgba(0,0,0,0.55)] sm:px-6 lg:px-8 lg:py-3">
					<div className="flex justify-end">
						<EmployeeActionButton
							type="button"
							onClick={() => tryGoToStep(2)}
							disabled={isPersistingCustomer}
							aria-disabled={isPersistingCustomer}
							fullWidthOnMobile
							className="sm:min-w-[180px]"
							trailing={
								<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />
							}
						>
							{isPersistingCustomer ? 'Saving customer' : 'Build quote'}
						</EmployeeActionButton>
					</div>
				</footer>
			)}

			{currentStep === 2 && (
				<footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[0_-14px_30px_-26px_rgba(0,0,0,0.55)] sm:px-6 lg:px-8 lg:py-3">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div className="hidden grid-cols-3 gap-3 lg:grid lg:flex-wrap lg:items-baseline lg:gap-x-6 lg:gap-y-2">
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

						<div className="relative grid grid-cols-[auto_minmax(0,1fr)] gap-2 lg:flex lg:items-center lg:justify-end">
							<AnimatePresence>
								{priceUpdateNotice && (
									<PriceUpdateNotice
										key={priceUpdateNotice.updatedAt}
										notice={priceUpdateNotice}
										onClose={() => setPriceUpdateNotice(null)}
									/>
								)}
							</AnimatePresence>
							<EmployeeActionButton
								type="button"
								onClick={() => goToStep(1)}
								tone="neutral"
								size="sm"
								leading={<span aria-hidden="true">←</span>}
								className="h-full max-lg:min-h-11 max-lg:px-3"
							>
								<span className="sr-only lg:not-sr-only">Customer</span>
							</EmployeeActionButton>
							<button
								type="button"
								onClick={handleStep2PrimaryPress}
								disabled={isStep2PrimaryDisabled}
								aria-disabled={isStep2PrimaryDisabled}
								className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-3 py-2 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 ${
									step2PrimaryAction === 'request_prices'
										? 'border-red-500/25 bg-red-500/[0.12] text-red-700 focus-visible:ring-red-500/25 disabled:cursor-not-allowed disabled:opacity-70 dark:text-red-300'
										: 'border-transparent bg-[var(--color-primary)] text-white hover:bg-blue-700 focus-visible:ring-[var(--color-primary)]/40'
								}`}
							>
								{step2PrimaryAction === 'request_prices' ? (
									<>
										{requestUpdateMutation.isPending ? (
											<Loader2
												size={14}
												strokeWidth={2.25}
												aria-hidden="true"
												className="shrink-0 animate-spin"
											/>
										) : (
											<CircleAlert
												size={14}
												strokeWidth={2.25}
												aria-hidden="true"
												className="shrink-0"
											/>
										)}
										<span className="min-w-0 break-words leading-tight">
											{step2PrimaryLabel}
										</span>
									</>
								) : (
									<>
										<span className="min-w-0 break-words leading-tight">
											{step2PrimaryLabel}
										</span>
										{step2PrimaryAction === 'review' && (
											<span className="hidden min-w-0 break-words leading-tight normal-case tracking-normal opacity-85 sm:inline">
												· {totalLabel}
											</span>
										)}
										<ArrowRight
											size={14}
											strokeWidth={2.25}
											aria-hidden="true"
											className="shrink-0"
										/>
									</>
								)}
							</button>
						</div>
					</div>
				</footer>
			)}

			{currentStep === 3 && (
				<footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[0_-14px_30px_-26px_rgba(0,0,0,0.55)] sm:px-6 lg:px-8">
					<div className="relative grid grid-cols-[auto_minmax(0,1fr)] gap-2 xl:flex xl:items-center xl:justify-end">
						<AnimatePresence>
							{priceUpdateNotice && (
								<PriceUpdateNotice
									key={priceUpdateNotice.updatedAt}
									notice={priceUpdateNotice}
									onClose={() => setPriceUpdateNotice(null)}
								/>
							)}
						</AnimatePresence>
						<button
							type="button"
							onClick={() => goToStep(2)}
							aria-label="Back to quote"
							className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--color-border)] px-3 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)] outline-none transition-colors hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
						>
							<span aria-hidden="true">←</span>
							<span className="sr-only xl:not-sr-only xl:ms-2">Quote</span>
						</button>
						<button
							type="button"
							onClick={handleReviewPrimaryPress}
							disabled={!canUseReviewPrimary || isReviewPrimaryBusy}
							aria-busy={isReviewPrimaryBusy}
							aria-disabled={!canUseReviewPrimary || isReviewPrimaryBusy}
							className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-3 py-2 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 xl:min-w-[280px] ${
								canEvaluate
									? 'border-transparent bg-[var(--color-primary)] text-white hover:bg-blue-700 focus-visible:ring-[var(--color-primary)]/40'
									: reviewPrimaryNeedsPrices
										? 'border-red-500/25 bg-red-500/[0.12] text-red-700 disabled:cursor-not-allowed disabled:opacity-80 focus-visible:ring-red-500/25 dark:text-red-300'
										: 'border-amber-500/20 bg-amber-500/[0.12] text-amber-700 disabled:cursor-not-allowed disabled:opacity-80 dark:text-amber-300'
							}`}
						>
							{isReviewPrimaryBusy ? (
								<Loader2
									size={14}
									strokeWidth={2.25}
									aria-hidden="true"
									className="shrink-0 animate-spin"
								/>
							) : canEvaluate ? (
								<CheckCircle2
									size={14}
									strokeWidth={2.4}
									aria-hidden="true"
									className="shrink-0"
								/>
							) : (
								<CircleAlert
									size={14}
									strokeWidth={2.25}
									aria-hidden="true"
									className="shrink-0"
								/>
							)}
							<span className="min-w-0 break-words leading-tight">
								{canEvaluate
									? isEvaluating
										? 'Sending to finance'
										: `Send to finance · ${totalLabel}`
									: reviewPrimaryNeedsPrices
										? outdatedPriceLabel
										: reviewPrimaryNeedsApproval
											? `Approve manager · ${totalLabel}`
											: (approvalBlockReason ?? 'Evaluation blocked')}
							</span>
							{canEvaluate && !isEvaluating && (
								<ArrowRight
									size={14}
									strokeWidth={2.25}
									aria-hidden="true"
									className="hidden shrink-0 sm:block"
								/>
							)}
						</button>
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
						<Suspense
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
								onDeliveryConfirmed={() => setMapOpen(false)}
							/>
						</Suspense>
					</ClientOnly>
				</div>
			</SlidePanel>

			{/* Line item side panel. */}
			<SlidePanel
				isOpen={itemEditIndex !== null && !!(watchedItems ?? [])[itemEditIndex]}
				onClose={() => setItemEditIndex(null)}
				maxWidth={540}
				panelKey="line-item-editor"
				ariaLabel="Edit quote item"
				scope="sales"
				mobileTitle={
					itemEditIndex !== null
						? (watchedItems ?? [])[itemEditIndex]?.productName
						: undefined
				}
				mobileSubtitle={
					itemEditIndex !== null && (watchedItems ?? [])[itemEditIndex]
						? `${((watchedItems ?? [])[itemEditIndex].quantity || 0).toLocaleString('en-EG')} Units`
						: undefined
				}
			>
				{itemEditIndex !== null && (watchedItems ?? [])[itemEditIndex] && (
					<ItemEditPanel
						item={(watchedItems ?? [])[itemEditIndex]}
						index={itemEditIndex}
						marginFloor={Math.max(
							MINIMUM_MARGIN_PERCENT,
							lineMarginThreshold(
								(watchedItems ?? [])[itemEditIndex],
								marginThresholds,
							).floor,
						)}
						thresholds={lineMarginThreshold(
							(watchedItems ?? [])[itemEditIndex],
							marginThresholds,
						)}
						exchangeRates={exchangeRates}
						isRequestingPrice={requestUpdateMutation.isPending}
						isPriceRequested={requestedPriceIds.has(
							lineProductKey((watchedItems ?? [])[itemEditIndex]),
						)}
						onQuantityChange={(quantity) =>
							updateLineQuantity(itemEditIndex, quantity)
						}
						onMarginChange={(margin) => updateLineMargin(itemEditIndex, margin)}
						onRequestPriceUpdate={() =>
							handleRequestPriceUpdate([(watchedItems ?? [])[itemEditIndex]])
						}
						onClose={() => setItemEditIndex(null)}
					/>
				)}
			</SlidePanel>

			<DeclineRFQDialog
				rfqId={rfqId}
				isOpen={declineOpen}
				onClose={() => setDeclineOpen(false)}
				onDeclined={() => onBack?.()}
			/>
			<CancelRFQDialog
				rfqId={rfqId}
				isOpen={cancelOpen}
				onClose={() => setCancelOpen(false)}
				onCanceled={() => onBack?.()}
			/>
			<CallRFQDialog
				rfqId={rfqId}
				isOpen={callDialogOpen}
				onClose={() => setCallDialogOpen(false)}
				onRecorded={(message) => setValidationErrors([message])}
			/>
		</div>
	)
}
