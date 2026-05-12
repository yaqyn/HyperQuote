/**
 * Dispatch — The Horizon
 *
 * A single hairline rule cuts the panel. The line is the work. Above it
 * sits one sovereign number. Below it, strata of routes (or drivers, with
 * the horizon inverted for Fleet). Brand palette — near-black ink on
 * near-white paper, blue for motion, amber for overdue, red for returns.
 * Texture (paper pinpricks + ghost ledger rule) carries the module's
 * signature through the disciplined palette.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertTriangle,
	ArrowLeft,
	Ban,
	CheckCircle2,
	MapPinned,
	Phone,
	Truck,
	X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
	type DispatchBoardTotals,
	type DispatchDriverView,
	type DispatchRouteView,
	getDispatchBoard,
	getDispatchDrivers,
	getDispatchRouteDetail,
	getWarehouseEmployeesForDispatch,
	markOrderDelivered,
	markOrderReturned,
} from '../../lib/server/dispatch'
import type { SecurityMethod } from '../../lib/server/warehouse'
import { useDispatchStore } from '../../stores/dispatch'
import {
	EmployeeActionButton,
	EmployeeFilterChip,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'

type Mode = 'orders' | 'fleet'

interface DispatchSidePanelProps {
	isOpen: boolean
	onToggle: () => void
}

// ─── Panel ──────────────────────────────────────────────

export function DispatchSidePanel({
	isOpen,
	onToggle,
}: DispatchSidePanelProps) {
	const reduce = useReducedMotion()
	const [mode, setMode] = useState<Mode>('orders')
	const selectedQuoteId = useDispatchStore((s) => s.selectedQuoteId)
	const setSelectedQuoteId = useDispatchStore((s) => s.setSelectedQuoteId)
	const setOverlayCloseHandler = useDispatchStore(
		(s) => s.setOverlayCloseHandler,
	)

	// Esc / outer-X dismissal: first back out of detail, then close panel
	useEffect(() => {
		if (!isOpen) {
			setOverlayCloseHandler(null)
			return
		}
		setOverlayCloseHandler(() => {
			if (selectedQuoteId) {
				setSelectedQuoteId(null)
				return true
			}
			onToggle()
			return true
		})
		return () => setOverlayCloseHandler(null)
	}, [
		isOpen,
		selectedQuoteId,
		onToggle,
		setOverlayCloseHandler,
		setSelectedQuoteId,
	])

	return (
		<>
			{!isOpen && <EdgeHandle onToggle={onToggle} />}

			<AnimatePresence>
				{isOpen && (
					<motion.aside
						initial={reduce ? false : { x: '100%' }}
						animate={{ x: 0 }}
						exit={reduce ? undefined : { x: '100%' }}
						transition={{ type: 'spring', stiffness: 280, damping: 34 }}
						className="dispatch-theme dispatch-paper absolute inset-0 z-10 flex w-full flex-col shadow-[-24px_0_60px_-20px_rgba(20,15,10,0.28)] lg:inset-y-0 lg:start-auto lg:end-0 lg:w-[440px] lg:border-s lg:border-[var(--rule-soft)]"
						style={{ color: 'var(--ink)' }}
					>
						<div className="flex-1 min-h-0 flex flex-col">
							<AnimatePresence mode="wait">
								{mode === 'orders' ? (
									selectedQuoteId ? (
										<OrderDetail
											key={`detail-${selectedQuoteId}`}
											quoteId={selectedQuoteId}
											onBack={() => setSelectedQuoteId(null)}
											reduce={reduce}
										/>
									) : (
										<OrdersView key="orders" reduce={reduce} />
									)
								) : (
									<FleetView key="fleet" reduce={reduce} />
								)}
							</AnimatePresence>
						</div>

						<ModeToggle
							mode={mode}
							onChange={(m) => {
								setMode(m)
								setSelectedQuoteId(null)
							}}
							onClose={onToggle}
						/>
					</motion.aside>
				)}
			</AnimatePresence>
		</>
	)
}

// ─── Edge handle (panel closed) ──────────────────────────

function EdgeHandle({ onToggle }: { onToggle: () => void }) {
	return (
		<EmployeeActionButton
			tone="primary"
			size="sm"
			leading={<MapPinned aria-hidden="true" size={15} />}
			aria-label="Open dispatch panel"
			onClick={onToggle}
			className="dispatch-theme absolute end-4 bottom-4 z-20 shadow-[-8px_0_20px_-6px_rgba(20,15,10,0.2)] lg:end-3 lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2"
		>
			Open dispatch
		</EmployeeActionButton>
	)
}

// ─── Orders view ─────────────────────────────────────────

function OrdersView({ reduce }: { reduce: boolean | null }) {
	const { data, isError, isLoading } = useQuery({
		queryKey: ['dispatch-board'],
		queryFn: () => getDispatchBoard({ data: {} }),
		staleTime: 5_000,
	})
	const setSelectedQuoteId = useDispatchStore((s) => s.setSelectedQuoteId)

	const routes = data?.routes ?? []
	const totals = data?.totals

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={reduce ? undefined : { opacity: 0 }}
			transition={{ duration: 0.24 }}
			className="flex-1 min-h-0 flex flex-col"
		>
			{/* Sovereign header — compact, left-aligned */}
			<div className="shrink-0 px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5 lg:px-8">
				{isLoading ? (
					<SovereignSkeleton />
				) : isError ? (
					<PanelStateMessage
						title="Dispatch board did not load"
						copy="Refresh and try again. No delivery record was changed."
					/>
				) : (
					<SovereignOrders totals={totals} />
				)}
			</div>

			<HorizonRule />

			{/* Strata */}
			<div className="flex-1 min-h-0 overflow-y-auto">
				{isLoading ? (
					<LoadingWhisper />
				) : isError ? (
					<EmptyVoid
						text="dispatch board unavailable"
						sub="refresh and try again before marking any delivery."
					/>
				) : routes.length === 0 ? (
					<EmptyVoid
						text="No deliveries in transit"
						sub="Warehouse handoffs appear here when trucks leave."
					/>
				) : (
					routes.map((r, i) => (
						<OrderBand
							key={r.quoteId}
							route={r}
							index={i}
							reduce={reduce}
							onSelect={() => setSelectedQuoteId(r.quoteId)}
						/>
					))
				)}
			</div>
		</motion.div>
	)
}

function SovereignOrders({ totals }: { totals?: DispatchBoardTotals }) {
	if (!totals) return null
	const { inTransit, overdue, deliveredToday, returnedToday } = totals

	let value: string
	let color: string
	let annotation: string

	if (overdue > 0) {
		value = String(overdue)
		color = 'var(--overdue)'
		annotation =
			inTransit === overdue
				? `${overdue === 1 ? 'delivery' : 'deliveries'} need attention now`
				: `${overdue} need attention · ${inTransit} in transit`
	} else if (inTransit > 0) {
		value = String(inTransit)
		color = 'var(--ink)'
		annotation =
			inTransit === 1 ? 'delivery in transit' : 'deliveries in transit'
	} else {
		value = '—'
		color = 'var(--ink-ghost)'
		annotation = 'no deliveries in transit'
	}

	const aside =
		deliveredToday > 0 || returnedToday > 0
			? `${deliveredToday} delivered today${returnedToday > 0 ? ` · ${returnedToday} returned` : ''}`
			: null

	return (
		<div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
			<p
				className="font-[family-name:var(--font-literata)] leading-none tabular-nums animate-sovereign-rise shrink-0"
				style={{
					fontSize: '56px',
					fontWeight: 400,
					color,
					letterSpacing: 0,
				}}
			>
				{value}
			</p>
			<div className="min-w-0 flex-1">
				<p
					className="font-[family-name:var(--font-archivo)] italic animate-sovereign-rise"
					style={{
						fontSize: '13px',
						color: 'var(--ink-mid)',
						animationDelay: '120ms',
						lineHeight: 1.3,
					}}
				>
					{annotation}
				</p>
				{aside && (
					<p
						className="mt-1.5 font-[family-name:var(--font-plex-mono)] tabular-nums animate-sovereign-rise"
						style={{
							fontSize: '10px',
							color: 'var(--ink-ghost)',
							letterSpacing: '0.06em',
							animationDelay: '200ms',
						}}
					>
						{aside}
					</p>
				)}
			</div>
		</div>
	)
}

function OrderBand({
	route,
	index,
	reduce,
	onSelect,
}: {
	route: DispatchRouteView
	index: number
	reduce: boolean | null
	onSelect: () => void
}) {
	const truckCount = route.trucks.length
	const itemCount = route.items.length
	const leadTruck = route.trucks[0]
	const driverFirst = leadTruck?.driverName?.split(' ')[0]?.toLowerCase() ?? ''
	const urgency =
		route.deliveryUrgencyDays <= 0
			? 'due today'
			: route.deliveryUrgencyDays === 1
				? 'tomorrow'
				: `in ${route.deliveryUrgencyDays}d`
	// Crude progress: how many km traversed vs delivery distance. We don't
	// know the origin so we approximate by squared distance driver→delivery
	// and clamp to 0–1 so overdue routes still read as "moving".
	const dLat = route.deliveryLat - route.driverLat
	const dLng = route.deliveryLng - route.driverLng
	const remaining = Math.sqrt(dLat * dLat + dLng * dLng)
	const progressPct = Math.max(0, Math.min(1, 1 - remaining / 0.8)) * 100
	return (
		<motion.article
			initial={reduce ? false : { opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				delay: 0.08 + index * 0.035,
				duration: 0.26,
				ease: [0.16, 1, 0.3, 1],
			}}
			className="relative grid w-full gap-3 px-3 py-4 transition-colors hover:bg-[var(--rule-soft)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start lg:grid-cols-[34px_minmax(0,1fr)_auto] lg:px-0 lg:py-0"
			style={{
				minHeight: '84px',
				borderBottom: '1px solid var(--rule-soft)',
			}}
		>
			{/* Left gutter — quote number rotated, plus an index dot so
			    the eye can anchor scanning count. */}
			<div
				className="hidden flex-col items-center justify-between py-3 lg:flex lg:w-[34px]"
				style={{ borderInlineEnd: '1px solid var(--rule-soft)' }}
			>
				<span
					className="font-[family-name:var(--font-plex-mono)] tabular-nums"
					style={{
						fontSize: '9px',
						color: 'var(--ink-mid)',
						letterSpacing: '0.14em',
					}}
				>
					{(index + 1).toString().padStart(2, '0')}
				</span>
				<span
					className="font-[family-name:var(--font-plex-mono)] tabular-nums"
					style={{
						fontSize: '9px',
						color: 'var(--ink-ghost)',
						writingMode: 'vertical-rl',
						transform: 'rotate(180deg)',
						letterSpacing: '0.22em',
					}}
				>
					{route.quoteNumber}
				</span>
			</div>

			{/* Center */}
			<div className="min-w-0 lg:px-4 lg:py-3">
				<div className="mb-2 flex flex-wrap items-center gap-2 lg:hidden">
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums"
						style={{
							fontSize: '10px',
							color: 'var(--ink-mid)',
							letterSpacing: '0.08em',
						}}
					>
						{(index + 1).toString().padStart(2, '0')}
					</span>
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums"
						style={{
							fontSize: '10px',
							color: 'var(--ink-mid)',
							letterSpacing: '0.08em',
						}}
					>
						{route.quoteNumber}
					</span>
				</div>
				<p
					className="break-words font-[family-name:var(--font-archivo)]"
					style={{
						fontSize: '15px',
						fontWeight: 600,
						color: 'var(--ink)',
						lineHeight: 1.2,
					}}
				>
					{route.customerName}
				</p>
				<p
					className="mt-1 break-words font-[family-name:var(--font-archivo)]"
					style={{ fontSize: '11px', color: 'var(--ink-soft)' }}
				>
					{route.deliveryCity.toLowerCase()}
					{route.customerContactName && (
						<>
							{' · '}
							<span style={{ color: 'var(--ink-mid)' }}>
								{route.customerContactName.toLowerCase()}
							</span>
						</>
					)}
				</p>

				{/* Metadata strip */}
				<div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums shrink-0"
						style={{
							fontSize: '10px',
							color: route.isOverdue ? 'var(--overdue)' : 'var(--motion)',
							letterSpacing: '0.04em',
						}}
					>
						{route.passedAtHoursAgo.toFixed(1)}h
					</span>
					<span style={{ color: 'var(--ink-ghost)', fontSize: '9px' }}>·</span>
					<span
						className="font-[family-name:var(--font-archivo)] italic shrink-0"
						style={{
							fontSize: '10px',
							color:
								route.deliveryUrgencyDays <= 0
									? 'var(--overdue)'
									: 'var(--ink-mid)',
						}}
					>
						{urgency}
					</span>
					{driverFirst && (
						<>
							<span style={{ color: 'var(--ink-ghost)', fontSize: '9px' }}>
								·
							</span>
							<span
								className="font-[family-name:var(--font-archivo)] italic"
								style={{ fontSize: '10px', color: 'var(--ink-mid)' }}
							>
								{driverFirst}
							</span>
						</>
					)}
					<span style={{ color: 'var(--ink-ghost)', fontSize: '9px' }}>·</span>
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums shrink-0"
						style={{
							fontSize: '10px',
							color: 'var(--ink-ghost)',
							letterSpacing: '0.04em',
						}}
					>
						{truckCount}t · {itemCount}i
					</span>
				</div>

				{/* Progress hairline — a 1px trail underneath showing how
				    far the driver has moved toward the destination. */}
				<div
					aria-hidden="true"
					className="mt-2 h-px w-full"
					style={{ background: 'var(--rule-soft)' }}
				>
					<div
						className="h-full"
						style={{
							width: `${progressPct}%`,
							background: route.isOverdue ? 'var(--overdue)' : 'var(--motion)',
							transition: 'width 420ms cubic-bezier(0.16,1,0.3,1)',
						}}
					/>
				</div>
			</div>

			{/* Right gutter — status glyph + plate */}
			<div className="flex flex-col items-stretch gap-2 sm:w-[170px] lg:w-[152px] lg:justify-center lg:pe-4">
				<EmployeeStatusPill
					tone={route.isOverdue ? 'warning' : 'neutral'}
					leading={
						route.isOverdue ? (
							<AlertTriangle aria-hidden="true" size={14} />
						) : (
							<Truck aria-hidden="true" size={14} />
						)
					}
					className="w-full"
				>
					{route.isOverdue ? 'Needs attention' : 'On route'}
				</EmployeeStatusPill>
				{leadTruck?.plateNumber && (
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums"
						style={{
							fontSize: '10px',
							color: 'var(--ink-mid)',
							letterSpacing: '0.08em',
						}}
					>
						{leadTruck.plateNumber}
					</span>
				)}
				<EmployeeActionButton
					tone="primary"
					size="sm"
					leading={<MapPinned aria-hidden="true" size={14} />}
					fullWidthOnMobile
					onClick={onSelect}
				>
					Open delivery
				</EmployeeActionButton>
			</div>
		</motion.article>
	)
}

// ─── Order detail ────────────────────────────────────────

function OrderDetail({
	quoteId,
	onBack,
	reduce,
}: {
	quoteId: string
	onBack: () => void
	reduce: boolean | null
}) {
	const { data: route, isLoading } = useQuery({
		queryKey: ['dispatch-route', quoteId],
		queryFn: () => getDispatchRouteDetail({ data: { quoteId } }),
		staleTime: 5_000,
	})

	const [showDelivered, setShowDelivered] = useState(false)
	const [showReturned, setShowReturned] = useState(false)

	if (isLoading || !route) {
		return (
			<motion.div
				initial={reduce ? false : { opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={reduce ? undefined : { opacity: 0 }}
				transition={{ duration: 0.2 }}
				className="flex-1 min-h-0 flex items-center justify-center"
			>
				<LoadingWhisper />
			</motion.div>
		)
	}

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={reduce ? undefined : { opacity: 0 }}
			transition={{ duration: 0.24 }}
			className="flex-1 min-h-0 flex flex-col"
		>
			{/* Back */}
			<div className="px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8">
				<EmployeeActionButton
					tone="neutral"
					size="sm"
					leading={<ArrowLeft aria-hidden="true" size={14} />}
					onClick={onBack}
				>
					Back to deliveries
				</EmployeeActionButton>
			</div>

			{/* Hero — customer heading */}
			<div className="px-4 pt-3 pb-4 sm:px-6 sm:pb-5 lg:px-8">
				<h2
					className="break-words font-[family-name:var(--font-literata)] animate-sovereign-rise"
					style={{
						fontSize: '24px',
						fontWeight: 500,
						color: 'var(--ink)',
						lineHeight: 1.1,
					}}
				>
					{route.customerName}
				</h2>
				<p
					className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 animate-sovereign-rise"
					style={{ animationDelay: '100ms' }}
				>
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums"
						style={{
							fontSize: '11px',
							color: 'var(--ink-mid)',
							letterSpacing: '0.08em',
						}}
					>
						{route.quoteNumber}
					</span>
					<span style={{ color: 'var(--ink-ghost)' }}>·</span>
					<span
						className="font-[family-name:var(--font-archivo)] italic"
						style={{ fontSize: '12px', color: 'var(--ink-soft)' }}
					>
						{route.deliveryCity.toLowerCase()}
					</span>
					<span style={{ color: 'var(--ink-ghost)' }}>·</span>
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums"
						style={{
							fontSize: '11px',
							color: route.isOverdue ? 'var(--overdue)' : 'var(--ink-mid)',
							letterSpacing: '0.04em',
						}}
					>
						{route.passedAtHoursAgo.toFixed(1)}h in transit
					</span>
					{route.deliveryUrgencyDays > 0 && (
						<>
							<span style={{ color: 'var(--ink-ghost)' }}>·</span>
							<span
								className="font-[family-name:var(--font-archivo)] italic"
								style={{ fontSize: '12px', color: 'var(--overdue)' }}
							>
								{route.deliveryUrgencyDays}d urgent
							</span>
						</>
					)}
				</p>
				<div className="mt-3 flex flex-wrap gap-2">
					<EmployeeStatusPill
						tone={route.isOverdue ? 'warning' : 'neutral'}
						leading={
							route.isOverdue ? (
								<AlertTriangle aria-hidden="true" size={14} />
							) : (
								<Truck aria-hidden="true" size={14} />
							)
						}
					>
						{route.isOverdue ? 'Needs dispatcher attention' : 'On route'}
					</EmployeeStatusPill>
					<EmployeeStatusPill tone="neutral">
						{route.trucks.length} truck{route.trucks.length === 1 ? '' : 's'} ·{' '}
						{route.items.length} item{route.items.length === 1 ? '' : 's'}
					</EmployeeStatusPill>
				</div>
			</div>

			<HorizonRule />

			{/* Content strata */}
			<div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
				<DetailStratum label="destination">
					<DataLine label="contact" value={route.customerContactName} />
					<DataLine
						label="phone"
						value={route.customerPhone}
						href={`tel:${route.customerPhone}`}
					/>
					<DataLine label="address" value={route.deliveryAddress} />
				</DetailStratum>

				<DetailStratum label={`trucks · ${route.trucks.length}`}>
					{route.trucks.map((t) => (
						<div
							key={t.truckId}
							className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between"
							style={{ borderBottom: '1px solid var(--rule-soft)' }}
						>
							<div className="min-w-0 lg:flex-1">
								<p
									className="break-words font-[family-name:var(--font-archivo)]"
									style={{
										fontSize: '14px',
										fontWeight: 600,
										color: 'var(--ink)',
										lineHeight: 1.15,
									}}
								>
									{t.driverName}
								</p>
								<p
									className="mt-0.5 font-[family-name:var(--font-plex-mono)] tabular-nums"
									style={{
										fontSize: '10px',
										color: 'var(--ink-mid)',
										letterSpacing: '0.08em',
									}}
								>
									{t.plateNumber} · {t.capacityTons}t
								</p>
							</div>
							<a
								href={`tel:${t.driverPhone}`}
								className="inline-flex min-h-9 items-center gap-2 self-start rounded-md border border-black/[0.1] px-3 font-[family-name:var(--font-archivo)] text-[var(--motion)] transition-colors hover:border-[var(--motion)]/40 dark:border-white/[0.12] lg:ms-4 lg:shrink-0"
								style={{ fontSize: '12px', fontWeight: 600 }}
							>
								<Phone aria-hidden="true" size={13} />
								Call driver
							</a>
						</div>
					))}
				</DetailStratum>

				<DetailStratum label={`cargo · ${route.items.length} items`}>
					{route.items.map((item) => (
						<div
							key={item.productSlug}
							className="flex flex-col gap-1 py-2 lg:flex-row lg:items-baseline lg:justify-between lg:gap-4"
							style={{ borderBottom: '1px solid var(--rule-soft)' }}
						>
							<span
								className="min-w-0 break-words font-[family-name:var(--font-archivo)]"
								style={{ fontSize: '13px', color: 'var(--ink-soft)' }}
							>
								{item.productName}
							</span>
							<span
								className="shrink-0 font-[family-name:var(--font-plex-mono)] tabular-nums"
								style={{ fontSize: '11px', color: 'var(--ink)' }}
							>
								{item.qty}
								<span
									style={{
										color: 'var(--ink-ghost)',
										fontSize: '9px',
										marginInlineStart: '3px',
									}}
								>
									{item.unit}
								</span>
							</span>
						</div>
					))}
				</DetailStratum>
			</div>

			{/* Actions */}
			<div
				className="flex-shrink-0 grid grid-cols-1 gap-2 px-4 py-4 sm:px-6 lg:grid-cols-2 lg:px-8"
				style={{ borderTop: '1px solid var(--rule)' }}
			>
				<EmployeeActionButton
					tone="success"
					leading={<CheckCircle2 aria-hidden="true" size={15} />}
					fullWidthOnMobile
					onClick={() => setShowDelivered(true)}
				>
					Confirm delivered
				</EmployeeActionButton>
				<EmployeeActionButton
					tone="danger"
					leading={<Ban aria-hidden="true" size={15} />}
					fullWidthOnMobile
					onClick={() => setShowReturned(true)}
				>
					Return to warehouse
				</EmployeeActionButton>
			</div>

			<AnimatePresence>
				{showDelivered && (
					<ConfirmDialog
						route={route}
						type="delivered"
						onClose={() => setShowDelivered(false)}
						onSuccess={() => {
							setShowDelivered(false)
							onBack()
						}}
					/>
				)}
			</AnimatePresence>
			<AnimatePresence>
				{showReturned && (
					<ConfirmDialog
						route={route}
						type="returned"
						onClose={() => setShowReturned(false)}
						onSuccess={() => {
							setShowReturned(false)
							onBack()
						}}
					/>
				)}
			</AnimatePresence>
		</motion.div>
	)
}

// ─── Fleet view (horizon inverted) ───────────────────────

function FleetView({ reduce }: { reduce: boolean | null }) {
	const { data, isError, isLoading } = useQuery({
		queryKey: ['dispatch-drivers'],
		queryFn: () => getDispatchDrivers({ data: {} }),
		staleTime: 5_000,
	})
	const drivers = data?.drivers ?? []
	const dispatched = drivers.filter((d) => d.status === 'dispatched')
	const available = drivers.filter((d) => d.status === 'available')
	const offline = drivers.filter(
		(d) => d.status !== 'dispatched' && d.status !== 'available',
	)

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={reduce ? undefined : { opacity: 0 }}
			transition={{ duration: 0.24 }}
			className="flex-1 min-h-0 flex flex-col"
		>
			{/* Strata upper */}
			<div
				className="overflow-y-auto"
				style={{ flex: '1 1 auto', minHeight: 0 }}
			>
				{isLoading ? (
					<LoadingWhisper />
				) : isError ? (
					<EmptyVoid
						text="Fleet status unavailable"
						sub="Refresh before assigning or calling a driver."
					/>
				) : drivers.length === 0 ? (
					<EmptyVoid
						text="No fleet registered"
						sub="Trucks show up once the motor pool is provisioned."
					/>
				) : (
					<>
						{dispatched.length > 0 && (
							<DriverGroup
								label={`on route · ${dispatched.length}`}
								drivers={dispatched}
								reduce={reduce}
							/>
						)}
						{available.length > 0 && (
							<DriverGroup
								label={`available · ${available.length}`}
								drivers={available}
								reduce={reduce}
							/>
						)}
						{offline.length > 0 && (
							<DriverGroup
								label={`offline · ${offline.length}`}
								drivers={offline}
								reduce={reduce}
							/>
						)}
					</>
				)}
			</div>

			<HorizonRule />

			{/* Sovereign — utilization as foundation, compact */}
			<div className="shrink-0 px-4 pt-5 pb-5 sm:px-6 sm:pb-6 lg:px-8">
				{isLoading ? (
					<SovereignSkeleton />
				) : isError ? (
					<PanelStateMessage
						title="Fleet did not load"
						copy="Driver availability could not be refreshed."
					/>
				) : (
					<SovereignFleet
						total={drivers.length}
						dispatched={dispatched.length}
						available={available.length}
					/>
				)}
			</div>
		</motion.div>
	)
}

function SovereignFleet({
	total,
	dispatched,
	available,
}: {
	total: number
	dispatched: number
	available: number
}) {
	if (total === 0) return null
	const offline = Math.max(0, total - dispatched - available)
	const pct = total === 0 ? 0 : Math.round((dispatched / total) * 100)
	return (
		<div>
			<div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
				<p
					className="font-[family-name:var(--font-literata)] leading-none tabular-nums animate-sovereign-rise shrink-0"
					style={{
						fontSize: '56px',
						fontWeight: 400,
						color: 'var(--ink)',
						letterSpacing: 0,
					}}
				>
					{dispatched}
					<span
						className="font-[family-name:var(--font-plex-mono)]"
						style={{
							fontSize: '22px',
							color: 'var(--ink-ghost)',
							fontWeight: 400,
							letterSpacing: 0,
							marginInlineStart: '2px',
						}}
					>
						/{total}
					</span>
				</p>
				<div className="min-w-0 flex-1">
					<p
						className="font-[family-name:var(--font-archivo)] animate-sovereign-rise"
						style={{
							fontSize: '13px',
							color: 'var(--ink-mid)',
							animationDelay: '120ms',
							lineHeight: 1.3,
						}}
					>
						{dispatched === 1 ? 'truck' : 'trucks'} currently on route
					</p>
					<p
						className="mt-1.5 font-[family-name:var(--font-plex-mono)] tabular-nums animate-sovereign-rise"
						style={{
							fontSize: '10px',
							color: 'var(--ink-ghost)',
							letterSpacing: '0.06em',
							animationDelay: '200ms',
						}}
					>
						{available} available for dispatch
						{offline > 0 ? ` · ${offline} unavailable` : ''}
					</p>
				</div>
			</div>

			{/* Utilization strip — fine ink bar */}
			<div
				className="mt-4 h-[2px] w-full relative overflow-hidden animate-sovereign-rise"
				style={{
					animationDelay: '280ms',
					backgroundColor: 'var(--rule-soft)',
				}}
			>
				<div
					className="absolute inset-y-0 start-0 transition-all duration-500"
					style={{
						width: `${pct}%`,
						backgroundColor: pct > 80 ? 'var(--overdue)' : 'var(--motion)',
					}}
				/>
			</div>
		</div>
	)
}

function DriverGroup({
	label,
	drivers,
	reduce,
}: {
	label: string
	drivers: DispatchDriverView[]
	reduce: boolean | null
}) {
	return (
		<section>
			<div className="flex items-center gap-3 px-4 pt-5 pb-2 sm:px-6 lg:px-10">
				<span
					className="font-[family-name:var(--font-archivo)] font-semibold uppercase"
					style={{
						fontSize: '11px',
						color: 'var(--ink-mid)',
						letterSpacing: '0.1em',
					}}
				>
					{label}
				</span>
				<div
					className="flex-1 h-px"
					style={{ backgroundColor: 'var(--rule-soft)' }}
				/>
			</div>
			{drivers.map((d, i) => (
				<DriverBand key={d.truckId} driver={d} index={i} reduce={reduce} />
			))}
		</section>
	)
}

function DriverBand({
	driver,
	index,
	reduce,
}: {
	driver: DispatchDriverView
	index: number
	reduce: boolean | null
}) {
	const setSelectedQuoteId = useDispatchStore((s) => s.setSelectedQuoteId)
	const isDispatched = driver.status === 'dispatched'
	const isAvailable = driver.status === 'available'
	const numericId =
		driver.truckId.replace(/\D/g, '').padStart(2, '0').slice(-2) || '—'

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.06 + index * 0.025, duration: 0.22 }}
			className="grid min-h-[72px] grid-cols-[34px_minmax(0,1fr)] gap-2 px-3 py-3 sm:grid-cols-[42px_minmax(0,1fr)_150px] sm:items-center sm:px-0 sm:py-0"
			style={{
				borderTop: '1px solid var(--rule-soft)',
			}}
		>
			<div className="flex w-[34px] items-center justify-center sm:w-[42px]">
				<span
					className="font-[family-name:var(--font-plex-mono)] tabular-nums"
					style={{
						fontSize: '13px',
						fontWeight: 500,
						color: isDispatched
							? 'var(--ink)'
							: isAvailable
								? 'var(--ink-soft)'
								: 'var(--ink-ghost)',
					}}
				>
					{numericId}
				</span>
			</div>

			<div className="min-w-0 sm:px-4 sm:py-2">
				<p
					className="break-words font-[family-name:var(--font-archivo)]"
					style={{
						fontSize: '14px',
						fontWeight: 600,
						color: isDispatched
							? 'var(--ink)'
							: isAvailable
								? 'var(--ink-soft)'
								: 'var(--ink-ghost)',
						lineHeight: 1.1,
					}}
				>
					{driver.driverName}
				</p>
				<div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums shrink-0"
						style={{
							fontSize: '10px',
							color: 'var(--ink-mid)',
							letterSpacing: '0.06em',
						}}
					>
						{driver.plateNumber} · {driver.capacityTons}t
					</span>
					{driver.assignedCustomerName && driver.assignedQuoteId && (
						<>
							<span style={{ color: 'var(--ink-ghost)', fontSize: '9px' }}>
								·
							</span>
							<button
								type="button"
								onClick={() => setSelectedQuoteId(driver.assignedQuoteId)}
								className="min-w-0 break-words font-[family-name:var(--font-archivo)] font-semibold"
								style={{ fontSize: '11px', color: 'var(--motion)' }}
							>
								{driver.assignedCustomerName.toLowerCase()}
							</button>
						</>
					)}
				</div>
			</div>

			<div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:flex sm:w-[150px] sm:flex-col sm:items-stretch sm:justify-center sm:pe-4">
				<EmployeeStatusPill
					tone={isDispatched ? 'neutral' : isAvailable ? 'success' : 'warning'}
					leading={<Truck aria-hidden="true" size={14} />}
					className="w-full"
				>
					{driverStatusLabel(driver.status)}
				</EmployeeStatusPill>
				<a
					href={`tel:${driver.driverPhone}`}
					aria-label={`Call ${driver.driverName}`}
					className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-black/[0.1] px-3 font-[family-name:var(--font-archivo)] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition-colors hover:border-[var(--motion)]/40 hover:text-[var(--motion)] dark:border-white/[0.12]"
					style={{ fontSize: '10.5px' }}
				>
					<Phone aria-hidden="true" size={13} />
					Call
				</a>
			</div>
		</motion.div>
	)
}

function driverStatusLabel(status: string): string {
	if (status === 'dispatched') return 'On route'
	if (status === 'available') return 'Available'
	if (status === 'maintenance') return 'Maintenance'
	if (status === 'loading') return 'Loading'
	return 'Unavailable'
}

// ─── Mode toggle (bottom rail) ──────────────────────────

function ModeToggle({
	mode,
	onChange,
	onClose,
}: {
	mode: Mode
	onChange: (m: Mode) => void
	onClose: () => void
}) {
	return (
		<div
			className="flex-shrink-0 grid grid-cols-1 gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-10 lg:py-5"
			style={{ borderTop: '1px solid var(--rule)' }}
		>
			<div className="grid grid-cols-2 gap-2">
				<EmployeeFilterChip
					active={mode === 'orders'}
					tone="primary"
					onClick={() => onChange('orders')}
				>
					Deliveries
				</EmployeeFilterChip>
				<EmployeeFilterChip
					active={mode === 'fleet'}
					tone="primary"
					onClick={() => onChange('fleet')}
				>
					Fleet
				</EmployeeFilterChip>
			</div>
			<EmployeeActionButton
				tone="neutral"
				size="sm"
				leading={<X aria-hidden="true" size={14} />}
				fullWidthOnMobile
				onClick={onClose}
			>
				Close dispatch
			</EmployeeActionButton>
		</div>
	)
}

// ─── Confirm dialog ──────────────────────────────────────

function ConfirmDialog({
	route,
	type,
	onClose,
	onSuccess,
}: {
	route: DispatchRouteView
	type: 'delivered' | 'returned'
	onClose: () => void
	onSuccess: () => void
}) {
	const reduce = useReducedMotion()
	const qc = useQueryClient()
	const isDelivered = type === 'delivered'

	const { data: employeesData } = useQuery({
		queryKey: ['dispatch-employees'],
		queryFn: () => getWarehouseEmployeesForDispatch({ data: {} }),
		staleTime: 60_000,
	})
	const employees = employeesData?.employees ?? []

	const [advisorId, setAdvisorId] = useState<string | null>(null)
	const [reason, setReason] = useState('')
	const [securityMethod, setSecurityMethod] =
		useState<SecurityMethod>('password')
	const [securityToken, setSecurityToken] = useState('')
	const [proofUrl, setProofUrl] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [pressed, setPressed] = useState(false)

	const ready =
		advisorId !== null &&
		(isDelivered || reason.trim().length >= 3) &&
		securityToken.trim().length >= 4 &&
		proofUrl.trim().length > 0

	const invalidateAll = () => {
		for (const k of [
			'dispatch-board',
			'dispatch-route',
			'dispatch-drivers',
			'warehouse-queue',
			'finance-inbox',
			'customer-orders',
			'stock-overview',
			'inventory-overview',
		]) {
			qc.invalidateQueries({ queryKey: [k] })
		}
	}

	const deliveredMut = useMutation({
		mutationFn: () => {
			if (!advisorId) throw new Error('Advisor not selected')
			return markOrderDelivered({
				data: {
					quoteId: route.quoteId,
					advisorId,
					proofUrl: proofUrl.trim(),
					securityMethod,
					securityToken: securityToken.trim(),
				},
			})
		},
		onSuccess: (r) => {
			if (!r.success) {
				setError(r.error ?? 'Error')
				return
			}
			invalidateAll()
			onSuccess()
		},
		onError: (e: Error) => setError(e.message),
	})

	const returnedMut = useMutation({
		mutationFn: () => {
			if (!advisorId) throw new Error('Advisor not selected')
			return markOrderReturned({
				data: {
					quoteId: route.quoteId,
					advisorId,
					reason: reason.trim(),
					proofUrl: proofUrl.trim(),
					securityMethod,
					securityToken: securityToken.trim(),
				},
			})
		},
		onSuccess: (r) => {
			if (!r.success) {
				setError(r.error ?? 'Error')
				return
			}
			invalidateAll()
			onSuccess()
		},
		onError: (e: Error) => setError(e.message),
	})

	const isPending = deliveredMut.isPending || returnedMut.isPending

	const confirm = () => {
		setError(null)
		setPressed(true)
		setTimeout(() => setPressed(false), 280)
		if (isDelivered) deliveredMut.mutate()
		else returnedMut.mutate()
	}

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={reduce ? undefined : { opacity: 0 }}
			className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center"
			style={{
				backgroundColor: 'rgba(20, 18, 15, 0.28)',
				backdropFilter: 'blur(8px)',
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose()
			}}
		>
			<motion.div
				initial={reduce ? false : { scale: 0.96, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={reduce ? undefined : { scale: 0.96, opacity: 0 }}
				transition={{ type: 'spring', stiffness: 320, damping: 30 }}
				className="dispatch-theme dispatch-paper flex h-full w-full flex-col overflow-hidden shadow-[0_40px_90px_-20px_rgba(20,15,10,0.4)] sm:mx-4 sm:h-auto sm:max-h-[92vh] sm:max-w-[520px]"
				style={{ color: 'var(--ink)' }}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="shrink-0 px-5 pt-7 pb-6 sm:px-10 sm:pt-9 sm:pb-7">
					<p
						className="font-[family-name:var(--font-archivo)] font-semibold uppercase"
						style={{
							fontSize: '11px',
							color: isDelivered ? 'var(--motion)' : 'var(--returned)',
							letterSpacing: '0.1em',
						}}
					>
						{isDelivered ? 'Confirm delivery' : 'Return to warehouse'}
					</p>
					<h3
						className="mt-2 break-words font-[family-name:var(--font-literata)]"
						style={{
							fontSize: '26px',
							fontWeight: 500,
							color: 'var(--ink)',
							lineHeight: 1.05,
						}}
					>
						{route.customerName}
					</h3>
					<p
						className="mt-2 font-[family-name:var(--font-plex-mono)] tabular-nums"
						style={{
							fontSize: '11px',
							color: 'var(--ink-mid)',
							letterSpacing: '0.08em',
						}}
					>
						{route.quoteNumber}
					</p>
					<EmployeeStatusPill
						tone={isDelivered ? 'success' : 'danger'}
						leading={
							isDelivered ? (
								<CheckCircle2 aria-hidden="true" size={14} />
							) : (
								<Ban aria-hidden="true" size={14} />
							)
						}
						className="mt-4"
					>
						{isDelivered
							? 'Stock will be consumed and trucks become available.'
							: 'Order returns to warehouse for review.'}
					</EmployeeStatusPill>
				</div>

				<HorizonRule />

				{/* Fields */}
				<div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6 sm:px-10 sm:py-7">
					{!isDelivered && (
						<DialogField label="Reason for return">
							<HairlineInput
								value={reason}
								onChange={setReason}
								placeholder="customer refused, wrong quantities"
							/>
						</DialogField>
					)}

					<DialogField label="Signed off by">
						<div className="grid grid-cols-1 gap-2">
							{employees.map((e) => (
								<button
									key={e.id}
									type="button"
									onClick={() => setAdvisorId(e.id)}
									aria-pressed={advisorId === e.id}
									className={`min-h-10 rounded-md border px-3 text-start font-[family-name:var(--font-archivo)] transition-colors ${
										advisorId === e.id
											? 'border-[var(--motion)] bg-[var(--motion)]/[0.08] text-[var(--ink)]'
											: 'border-black/[0.1] text-[var(--ink-mid)] hover:border-[var(--motion)]/40 dark:border-white/[0.12]'
									}`}
									style={{ fontSize: '14px', fontWeight: 600 }}
								>
									{e.name}
								</button>
							))}
						</div>
					</DialogField>

					<DialogField label="Credential">
						<div className="mb-3 grid grid-cols-2 gap-2">
							{(['password', 'qr'] as const).map((m) => (
								<EmployeeFilterChip
									key={m}
									active={securityMethod === m}
									tone="primary"
									onClick={() => {
										setSecurityMethod(m)
										setSecurityToken('')
									}}
								>
									{m === 'password' ? 'Password' : 'QR scan'}
								</EmployeeFilterChip>
							))}
						</div>
						<HairlineInput
							type={securityMethod === 'password' ? 'password' : 'text'}
							value={securityToken}
							onChange={setSecurityToken}
							placeholder={
								securityMethod === 'password' ? 'your password' : 'scan badge'
							}
							autoComplete="off"
						/>
						<p
							className="mt-2 font-[family-name:var(--font-archivo)]"
							style={{ fontSize: '10px', color: 'var(--ink-ghost)' }}
						>
							dev mock · 1234
						</p>
					</DialogField>

					<DialogField
						label={`Proof of ${isDelivered ? 'delivery' : 'return'}`}
					>
						<HairlineInput
							value={proofUrl}
							onChange={setProofUrl}
							placeholder="pod-photo.jpg"
						/>
					</DialogField>

					{error && (
						<EmployeeStatusPill
							tone="danger"
							leading={<AlertTriangle aria-hidden="true" size={14} />}
						>
							{error}
						</EmployeeStatusPill>
					)}
				</div>

				<HorizonRule />

				{/* Actions */}
				<div className="shrink-0 grid grid-cols-1 gap-2 px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:px-10 sm:py-6">
					<EmployeeActionButton
						tone="neutral"
						leading={<X aria-hidden="true" size={14} />}
						fullWidthOnMobile
						onClick={onClose}
					>
						Cancel
					</EmployeeActionButton>
					<EmployeeActionButton
						tone={isDelivered ? 'success' : 'danger'}
						leading={
							isDelivered ? (
								<CheckCircle2 aria-hidden="true" size={14} />
							) : (
								<Ban aria-hidden="true" size={14} />
							)
						}
						fullWidthOnMobile
						disabled={!ready || isPending}
						onClick={confirm}
						className={`sm:justify-self-end ${pressed ? 'animate-stamp-press' : ''}`}
					>
						{isPending
							? 'Confirming...'
							: isDelivered
								? 'Confirm delivery'
								: 'Confirm return'}
					</EmployeeActionButton>
				</div>
			</motion.div>
		</motion.div>
	)
}

// ─── Primitives ──────────────────────────────────────────

function PanelStateMessage({ title, copy }: { title: string; copy: string }) {
	return (
		<div className="py-2">
			<p
				className="font-[family-name:var(--font-archivo)] font-semibold text-[var(--ink)]"
				style={{ fontSize: '14px' }}
			>
				{title}
			</p>
			<p
				className="mt-1 font-[family-name:var(--font-archivo)] text-[var(--ink-mid)]"
				style={{ fontSize: '12px', lineHeight: 1.45 }}
			>
				{copy}
			</p>
		</div>
	)
}

function HorizonRule() {
	return (
		<div className="px-0 shrink-0" aria-hidden="true">
			<div
				className="h-px w-full animate-horizon-draw"
				style={{ backgroundColor: 'var(--rule)' }}
			/>
		</div>
	)
}

function DetailStratum({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	return (
		<section className="pb-6 last:pb-2">
			<div className="flex items-center gap-3 mb-3">
				<span
					className="font-[family-name:var(--font-archivo)] font-semibold uppercase"
					style={{
						fontSize: '11px',
						color: 'var(--ink-mid)',
						letterSpacing: '0.1em',
					}}
				>
					{label}
				</span>
				<div
					className="flex-1 h-px"
					style={{ backgroundColor: 'var(--rule-soft)' }}
				/>
			</div>
			<div>{children}</div>
		</section>
	)
}

function DataLine({
	label,
	value,
	href,
}: {
	label: string
	value: string
	href?: string
}) {
	return (
		<div className="flex flex-col gap-1 py-2 lg:flex-row lg:items-baseline lg:gap-5">
			<span
				className="w-auto shrink-0 font-[family-name:var(--font-archivo)] italic lg:w-[68px]"
				style={{ fontSize: '11px', color: 'var(--ink-mid)' }}
			>
				{label}
			</span>
			{href ? (
				<a
					href={href}
					className="flex-1 break-words font-[family-name:var(--font-archivo)]"
					style={{ fontSize: '13px', color: 'var(--motion)' }}
				>
					{value}
				</a>
			) : (
				<span
					className="flex-1 break-words font-[family-name:var(--font-archivo)]"
					style={{ fontSize: '13px', color: 'var(--ink)' }}
				>
					{value}
				</span>
			)}
		</div>
	)
}

function HairlineInput({
	value,
	onChange,
	placeholder,
	type = 'text',
	autoComplete,
}: {
	value: string
	onChange: (v: string) => void
	placeholder?: string
	type?: string
	autoComplete?: string
}) {
	return (
		<input
			type={type}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			autoComplete={autoComplete}
			className="min-h-11 w-full rounded-md border border-black/[0.1] bg-[var(--paper)] px-3 font-[family-name:var(--font-archivo)] outline-none transition-colors focus:border-[var(--motion)]/50 focus:ring-2 focus:ring-[var(--motion)]/15 dark:border-white/[0.12]"
			style={{
				fontSize: '15px',
				color: 'var(--ink)',
			}}
		/>
	)
}

function DialogField({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	return (
		<div>
			<span
				className="mb-2 block font-[family-name:var(--font-archivo)] font-semibold uppercase"
				style={{
					fontSize: '11px',
					color: 'var(--ink-mid)',
					letterSpacing: '0.1em',
				}}
			>
				{label}
			</span>
			{children}
		</div>
	)
}

function SovereignSkeleton() {
	return (
		<div className="flex items-baseline gap-5">
			<div
				className="h-[48px] w-[48px] rounded-sm shrink-0"
				style={{ backgroundColor: 'var(--rule-soft)' }}
			/>
			<div className="flex-1">
				<div
					className="h-[13px] w-[160px] rounded-sm"
					style={{ backgroundColor: 'var(--rule-soft)' }}
				/>
				<div
					className="mt-2 h-[10px] w-[120px] rounded-sm"
					style={{ backgroundColor: 'var(--rule-soft)' }}
				/>
			</div>
		</div>
	)
}

function LoadingWhisper() {
	return (
		<div className="flex items-center justify-center py-20">
			<div
				className="h-px w-[80px] animate-horizon-draw"
				style={{ backgroundColor: 'var(--ink-ghost)' }}
			/>
		</div>
	)
}

function EmptyVoid({ text, sub }: { text: string; sub: string }) {
	return (
		<div className="flex flex-col items-center justify-center px-4 py-16 sm:px-10">
			<p
				className="font-[family-name:var(--font-literata)] italic"
				style={{ fontSize: '18px', color: 'var(--ink-ghost)' }}
			>
				{text}
			</p>
			<p
				className="mt-3 text-center font-[family-name:var(--font-archivo)] italic"
				style={{
					fontSize: '11px',
					color: 'var(--ink-ghost)',
					maxWidth: '260px',
					lineHeight: 1.5,
				}}
			>
				{sub}
			</p>
		</div>
	)
}
