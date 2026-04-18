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
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
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
						initial={reduce ? false : { x: 440 }}
						animate={{ x: 0 }}
						exit={reduce ? undefined : { x: 440 }}
						transition={{ type: 'spring', stiffness: 280, damping: 34 }}
						className="dispatch-theme dispatch-paper absolute inset-y-0 end-0 z-10 flex w-[440px] flex-col shadow-[-24px_0_60px_-20px_rgba(20,15,10,0.28)]"
						style={{
							color: 'var(--ink)',
							borderInlineStart: '1px solid var(--rule-soft)',
						}}
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
		<button
			type="button"
			onClick={onToggle}
			aria-label="Open dispatch panel"
			className="dispatch-theme absolute end-0 top-1/2 z-20 -translate-y-1/2 flex h-32 w-[26px] items-center justify-center dispatch-paper shadow-[-8px_0_20px_-6px_rgba(20,15,10,0.2)]"
			style={{
				color: 'var(--ink)',
				borderInlineStart: '1px solid var(--rule)',
			}}
		>
			<span
				className="font-[family-name:var(--font-literata)] italic"
				style={{
					fontSize: '11px',
					color: 'var(--ink-soft)',
					writingMode: 'vertical-rl',
					transform: 'rotate(180deg)',
					letterSpacing: '0.06em',
				}}
			>
				dispatch
			</span>
		</button>
	)
}

// ─── Orders view ─────────────────────────────────────────

function OrdersView({ reduce }: { reduce: boolean | null }) {
	const { data, isLoading } = useQuery({
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
			<div className="shrink-0 px-8 pt-6 pb-5">
				{isLoading ? (
					<SovereignSkeleton />
				) : (
					<SovereignOrders totals={totals} />
				)}
			</div>

			<HorizonRule />

			{/* Strata */}
			<div className="flex-1 min-h-0 overflow-y-auto">
				{isLoading ? (
					<LoadingWhisper />
				) : routes.length === 0 ? (
					<EmptyVoid
						text="nothing in motion"
						sub="routes surface here the moment the warehouse hands them off."
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
				? `${overdue === 1 ? 'truck' : 'trucks'} overdue`
				: `overdue · ${inTransit} in transit`
	} else if (inTransit > 0) {
		value = String(inTransit)
		color = 'var(--ink)'
		annotation = inTransit === 1 ? 'truck in transit' : 'trucks in transit'
	} else {
		value = '—'
		color = 'var(--ink-ghost)'
		annotation = 'nothing in motion'
	}

	const aside =
		deliveredToday > 0 || returnedToday > 0
			? `${deliveredToday} delivered${returnedToday > 0 ? ` · ${returnedToday} returned` : ''} today`
			: null

	return (
		<div className="flex items-baseline gap-5">
			<p
				className="font-[family-name:var(--font-literata)] leading-none tabular-nums animate-sovereign-rise shrink-0"
				style={{
					fontSize: '56px',
					fontWeight: 400,
					color,
					letterSpacing: '-0.04em',
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
			? 'today'
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
		<motion.button
			type="button"
			onClick={onSelect}
			initial={reduce ? false : { opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				delay: 0.08 + index * 0.035,
				duration: 0.26,
				ease: [0.16, 1, 0.3, 1],
			}}
			className="group relative flex w-full items-stretch text-start transition-colors hover:bg-[var(--rule-soft)]"
			style={{
				minHeight: '84px',
				borderBottom: '1px solid var(--rule-soft)',
			}}
		>
			{/* Left gutter — quote number rotated, plus an index dot so
			    the eye can anchor scanning count. */}
			<div
				className="flex w-[42px] flex-col items-center justify-between py-3"
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
			<div className="flex-1 min-w-0 px-4 py-3">
				<p
					className="font-[family-name:var(--font-archivo)] truncate"
					style={{
						fontSize: '15px',
						fontWeight: 500,
						color: 'var(--ink)',
						letterSpacing: '-0.005em',
						lineHeight: 1.1,
					}}
				>
					{route.customerName}
				</p>
				<p
					className="mt-0.5 truncate font-[family-name:var(--font-archivo)] italic"
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
				<div className="mt-1.5 flex items-baseline gap-1.5">
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
								className="font-[family-name:var(--font-archivo)] italic truncate"
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
			<div className="flex w-[56px] flex-col items-center justify-between py-3">
				<StatusGlyph isOverdue={route.isOverdue} />
				{leadTruck?.plateNumber && (
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums text-center"
						style={{
							fontSize: '8.5px',
							color: 'var(--ink-ghost)',
							letterSpacing: '0.12em',
							lineHeight: 1.1,
						}}
					>
						{leadTruck.plateNumber}
					</span>
				)}
			</div>
		</motion.button>
	)
}

function StatusGlyph({ isOverdue }: { isOverdue: boolean }) {
	if (isOverdue) {
		return (
			<svg
				width="12"
				height="12"
				viewBox="0 0 12 12"
				aria-hidden="true"
				className="animate-glyph-draw"
			>
				<rect
					x="3"
					y="3"
					width="6"
					height="6"
					transform="rotate(45 6 6)"
					fill="var(--overdue)"
				/>
			</svg>
		)
	}
	return (
		<svg
			width="26"
			height="8"
			viewBox="0 0 26 8"
			aria-hidden="true"
			className="animate-glyph-draw"
		>
			<path
				d="M0 4 L20 4"
				stroke="var(--motion)"
				strokeWidth="1.3"
				strokeLinecap="square"
			/>
			<path
				d="M16 1 L20 4 L16 7"
				stroke="var(--motion)"
				strokeWidth="1.3"
				strokeLinecap="square"
				strokeLinejoin="miter"
				fill="none"
			/>
		</svg>
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
			<button
				type="button"
				onClick={onBack}
				className="flex items-center gap-2 px-8 pt-5 self-start font-[family-name:var(--font-archivo)] italic"
				style={{ fontSize: '12px', color: 'var(--ink-mid)' }}
			>
				<svg
					width="18"
					height="8"
					viewBox="0 0 18 8"
					aria-hidden="true"
					style={{ opacity: 0.7 }}
				>
					<path
						d="M18 4 L2 4"
						stroke="currentColor"
						strokeWidth="1"
						strokeLinecap="square"
					/>
					<path
						d="M6 1 L2 4 L6 7"
						stroke="currentColor"
						strokeWidth="1"
						strokeLinecap="square"
						fill="none"
					/>
				</svg>
				back
			</button>

			{/* Hero — customer heading */}
			<div className="px-8 pt-3 pb-5">
				<h2
					className="font-[family-name:var(--font-literata)] animate-sovereign-rise"
					style={{
						fontSize: '24px',
						fontWeight: 500,
						color: 'var(--ink)',
						letterSpacing: '-0.018em',
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
			</div>

			<HorizonRule />

			{/* Content strata */}
			<div className="flex-1 min-h-0 overflow-y-auto px-8 py-4">
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
							className="flex items-center justify-between py-3"
							style={{ borderBottom: '1px solid var(--rule-soft)' }}
						>
							<div className="min-w-0 flex-1">
								<p
									className="font-[family-name:var(--font-archivo)] truncate"
									style={{
										fontSize: '14px',
										fontWeight: 500,
										color: 'var(--ink)',
										letterSpacing: '-0.005em',
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
								className="font-[family-name:var(--font-archivo)] italic shrink-0 ms-4"
								style={{ fontSize: '12px', color: 'var(--motion)' }}
							>
								call →
							</a>
						</div>
					))}
				</DetailStratum>

				<DetailStratum label={`cargo · ${route.items.length} items`}>
					{route.items.map((item) => (
						<div
							key={item.productSlug}
							className="flex items-baseline justify-between gap-4 py-2"
							style={{ borderBottom: '1px solid var(--rule-soft)' }}
						>
							<span
								className="font-[family-name:var(--font-archivo)] truncate min-w-0"
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

			{/* Actions — two stamp-words side by side */}
			<div
				className="flex-shrink-0 grid grid-cols-2"
				style={{ borderTop: '1px solid var(--rule)' }}
			>
				<StampWord
					label="Deliver"
					onClick={() => setShowDelivered(true)}
					tone="ink"
				/>
				<StampWord
					label="Return"
					onClick={() => setShowReturned(true)}
					tone="returned"
					divider
				/>
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
	const { data, isLoading } = useQuery({
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
				) : drivers.length === 0 ? (
					<EmptyVoid
						text="no fleet registered"
						sub="trucks show up once the motor pool is provisioned."
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
			<div className="shrink-0 px-8 pt-5 pb-6">
				{isLoading ? (
					<SovereignSkeleton />
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
			<div className="flex items-baseline gap-5">
				<p
					className="font-[family-name:var(--font-literata)] leading-none tabular-nums animate-sovereign-rise shrink-0"
					style={{
						fontSize: '56px',
						fontWeight: 400,
						color: 'var(--ink)',
						letterSpacing: '-0.04em',
					}}
				>
					{dispatched}
					<span
						className="font-[family-name:var(--font-plex-mono)]"
						style={{
							fontSize: '22px',
							color: 'var(--ink-ghost)',
							fontWeight: 400,
							letterSpacing: '-0.02em',
							marginInlineStart: '2px',
						}}
					>
						/{total}
					</span>
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
						{dispatched === 1 ? 'truck' : 'trucks'} on route
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
						{available} available{offline > 0 ? ` · ${offline} offline` : ''}
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
			<div className="flex items-center gap-3 px-10 pt-5 pb-2">
				<span
					className="font-[family-name:var(--font-archivo)] italic"
					style={{ fontSize: '11px', color: 'var(--ink-mid)' }}
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
			className="flex items-center"
			style={{
				height: '56px',
				borderTop: '1px solid var(--rule-soft)',
			}}
		>
			<div className="flex h-full w-[42px] items-center justify-center">
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

			<div className="flex-1 min-w-0 px-4">
				<p
					className="font-[family-name:var(--font-archivo)] truncate"
					style={{
						fontSize: '14px',
						fontWeight: 500,
						color: isDispatched
							? 'var(--ink)'
							: isAvailable
								? 'var(--ink-soft)'
								: 'var(--ink-ghost)',
						letterSpacing: '-0.005em',
						lineHeight: 1.1,
					}}
				>
					{driver.driverName}
				</p>
				<div className="mt-0.5 flex items-baseline gap-1.5">
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
								className="font-[family-name:var(--font-archivo)] italic truncate min-w-0"
								style={{ fontSize: '11px', color: 'var(--motion)' }}
							>
								{driver.assignedCustomerName.toLowerCase()} →
							</button>
						</>
					)}
				</div>
			</div>

			<div className="flex h-full w-[56px] items-center justify-center gap-2">
				<DriverGlyph status={driver.status} />
				<a
					href={`tel:${driver.driverPhone}`}
					aria-label={`Call ${driver.driverName}`}
					className="font-[family-name:var(--font-archivo)] italic"
					style={{ fontSize: '11px', color: 'var(--ink-mid)' }}
				>
					call
				</a>
			</div>
		</motion.div>
	)
}

function DriverGlyph({ status }: { status: string }) {
	if (status === 'dispatched') {
		return (
			<svg
				width="10"
				height="10"
				viewBox="0 0 10 10"
				aria-hidden="true"
				className="animate-glyph-draw"
			>
				<circle cx="5" cy="5" r="3.5" fill="var(--motion)" />
			</svg>
		)
	}
	if (status === 'available') {
		return (
			<svg
				width="10"
				height="10"
				viewBox="0 0 10 10"
				aria-hidden="true"
				className="animate-glyph-draw"
			>
				<circle
					cx="5"
					cy="5"
					r="3.2"
					fill="none"
					stroke="var(--ink-soft)"
					strokeWidth="1"
				/>
			</svg>
		)
	}
	return (
		<svg
			width="12"
			height="2"
			viewBox="0 0 12 2"
			aria-hidden="true"
			className="animate-glyph-draw"
		>
			<line
				x1="0"
				y1="1"
				x2="12"
				y2="1"
				stroke="var(--ink-ghost)"
				strokeWidth="1"
			/>
		</svg>
	)
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
			className="flex-shrink-0 flex items-center justify-between px-10 py-5"
			style={{ borderTop: '1px solid var(--rule)' }}
		>
			<div className="flex items-baseline gap-4">
				<ToggleWord
					label="orders"
					active={mode === 'orders'}
					onClick={() => onChange('orders')}
				/>
				<span
					style={{
						color: 'var(--ink-ghost)',
						fontSize: '11px',
					}}
				>
					·
				</span>
				<ToggleWord
					label="fleet"
					active={mode === 'fleet'}
					onClick={() => onChange('fleet')}
				/>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="font-[family-name:var(--font-archivo)] italic"
				style={{ fontSize: '11px', color: 'var(--ink-mid)' }}
			>
				close →
			</button>
		</div>
	)
}

function ToggleWord({
	label,
	active,
	onClick,
}: {
	label: string
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="font-[family-name:var(--font-literata)]"
			style={{
				fontSize: '16px',
				fontStyle: active ? 'normal' : 'italic',
				fontWeight: active ? 500 : 400,
				color: active ? 'var(--ink)' : 'var(--ink-ghost)',
				letterSpacing: active ? '-0.01em' : '0',
			}}
		>
			{label}
		</button>
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
			className="fixed inset-0 z-50 flex items-center justify-center"
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
				className="dispatch-theme dispatch-paper mx-4 w-full max-w-[480px] shadow-[0_40px_90px_-20px_rgba(20,15,10,0.4)]"
				style={{ color: 'var(--ink)' }}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="px-10 pt-9 pb-7">
					<p
						className="font-[family-name:var(--font-archivo)] italic"
						style={{ fontSize: '11px', color: 'var(--ink-mid)' }}
					>
						confirm {isDelivered ? 'delivery of' : 'return of'}
					</p>
					<h3
						className="mt-2 font-[family-name:var(--font-literata)]"
						style={{
							fontSize: '26px',
							fontWeight: 500,
							color: 'var(--ink)',
							letterSpacing: '-0.02em',
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
				</div>

				<HorizonRule />

				{/* Fields */}
				<div className="px-10 py-7 flex flex-col gap-6">
					{!isDelivered && (
						<DialogField label="reason for return">
							<HairlineInput
								value={reason}
								onChange={setReason}
								placeholder="customer refused — wrong quantities"
							/>
						</DialogField>
					)}

					<DialogField label="signed off by">
						<div className="grid grid-cols-2 gap-x-6 gap-y-0">
							{employees.map((e) => (
								<button
									key={e.id}
									type="button"
									onClick={() => setAdvisorId(e.id)}
									className="font-[family-name:var(--font-archivo)] text-start py-2"
									style={{
										fontSize: '14px',
										color: advisorId === e.id ? 'var(--ink)' : 'var(--ink-mid)',
										fontStyle: advisorId === e.id ? 'normal' : 'italic',
										fontWeight: advisorId === e.id ? 500 : 400,
										letterSpacing: '-0.005em',
										borderBottom:
											advisorId === e.id
												? '1px solid var(--ink)'
												: '1px solid var(--rule-soft)',
									}}
								>
									{e.name}
								</button>
							))}
						</div>
					</DialogField>

					<DialogField label="credential">
						<div className="flex items-baseline gap-5 mb-3">
							{(['password', 'qr'] as const).map((m) => (
								<button
									key={m}
									type="button"
									onClick={() => {
										setSecurityMethod(m)
										setSecurityToken('')
									}}
									className="font-[family-name:var(--font-archivo)]"
									style={{
										fontSize: '12px',
										fontStyle: securityMethod === m ? 'normal' : 'italic',
										color:
											securityMethod === m ? 'var(--ink)' : 'var(--ink-ghost)',
										borderBottom:
											securityMethod === m
												? '1px solid var(--ink)'
												: '1px solid transparent',
										paddingBottom: '2px',
									}}
								>
									{m === 'password' ? 'password' : 'qr scan'}
								</button>
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
							className="mt-2 font-[family-name:var(--font-archivo)] italic"
							style={{ fontSize: '10px', color: 'var(--ink-ghost)' }}
						>
							dev mock · 1234
						</p>
					</DialogField>

					<DialogField
						label={`proof of ${isDelivered ? 'delivery' : 'return'}`}
					>
						<HairlineInput
							value={proofUrl}
							onChange={setProofUrl}
							placeholder="pod-photo.jpg"
						/>
					</DialogField>

					{error && (
						<p
							className="font-[family-name:var(--font-archivo)] italic"
							style={{ fontSize: '12px', color: 'var(--returned)' }}
						>
							{error}
						</p>
					)}
				</div>

				<HorizonRule />

				{/* Actions */}
				<div className="px-10 py-6 flex items-center justify-between">
					<button
						type="button"
						onClick={onClose}
						className="font-[family-name:var(--font-archivo)] italic"
						style={{ fontSize: '12px', color: 'var(--ink-mid)' }}
					>
						cancel
					</button>
					<button
						type="button"
						disabled={!ready || isPending}
						onClick={confirm}
						className={`font-[family-name:var(--font-literata)] ${pressed ? 'animate-stamp-press' : ''}`}
						style={{
							fontSize: '22px',
							fontWeight: 500,
							color: ready ? 'var(--ink)' : 'var(--ink-ghost)',
							letterSpacing: '-0.022em',
							cursor: ready && !isPending ? 'pointer' : 'not-allowed',
							transition: 'color 200ms',
						}}
					>
						{isPending
							? 'confirming…'
							: isDelivered
								? 'Confirm delivery'
								: 'Confirm return'}
					</button>
				</div>
			</motion.div>
		</motion.div>
	)
}

// ─── Primitives ──────────────────────────────────────────

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
	children: React.ReactNode
}) {
	return (
		<section className="pb-6 last:pb-2">
			<div className="flex items-center gap-3 mb-3">
				<span
					className="font-[family-name:var(--font-archivo)] italic"
					style={{ fontSize: '11px', color: 'var(--ink-mid)' }}
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
		<div className="flex items-baseline gap-5 py-2">
			<span
				className="w-[68px] shrink-0 font-[family-name:var(--font-archivo)] italic"
				style={{ fontSize: '11px', color: 'var(--ink-mid)' }}
			>
				{label}
			</span>
			{href ? (
				<a
					href={href}
					className="font-[family-name:var(--font-archivo)] flex-1 truncate"
					style={{ fontSize: '13px', color: 'var(--motion)' }}
				>
					{value}
				</a>
			) : (
				<span
					className="font-[family-name:var(--font-archivo)] flex-1 truncate"
					style={{ fontSize: '13px', color: 'var(--ink)' }}
				>
					{value}
				</span>
			)}
		</div>
	)
}

function StampWord({
	label,
	onClick,
	tone = 'ink',
	divider,
}: {
	label: string
	onClick: () => void
	tone?: 'ink' | 'returned'
	divider?: boolean
}) {
	const [pressed, setPressed] = useState(false)
	return (
		<button
			type="button"
			onClick={() => {
				setPressed(true)
				setTimeout(() => setPressed(false), 280)
				onClick()
			}}
			className={`flex items-center justify-center py-5 font-[family-name:var(--font-literata)] ${pressed ? 'animate-stamp-press' : ''}`}
			style={{
				fontSize: '22px',
				fontWeight: 500,
				color: tone === 'returned' ? 'var(--returned)' : 'var(--ink)',
				letterSpacing: '-0.02em',
				borderInlineStart: divider ? '1px solid var(--rule)' : undefined,
				transition: 'color 200ms',
			}}
		>
			{label}
		</button>
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
			className="w-full bg-transparent outline-none font-[family-name:var(--font-archivo)]"
			style={{
				fontSize: '15px',
				color: 'var(--ink)',
				borderBottom: '1px solid var(--rule)',
				paddingBottom: '8px',
			}}
		/>
	)
}

function DialogField({
	label,
	children,
}: {
	label: string
	children: React.ReactNode
}) {
	return (
		<div>
			<span
				className="mb-2 block font-[family-name:var(--font-archivo)] italic"
				style={{ fontSize: '11px', color: 'var(--ink-mid)' }}
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
		<div className="flex flex-col items-center justify-center py-16 px-10">
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
