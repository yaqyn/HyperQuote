import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
	assignTruckToOrder,
	getAvailableTrucks,
	getWarehouseEmployees,
	getWarehouseOrderDetail,
	logFailedInspection,
	markReadyForSignoff,
	passOrderToDispatch,
	recordWarehouseSignoff,
	removeTruckFromOrder,
	resetWarehouseOrder,
	type SecurityMethod,
	toggleItemLoaded,
	type WarehouseOrderDetailView,
} from '../../lib/server/warehouse'
import { useWarehouseStore } from '../../stores/warehouse'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../shared/DispatchDialog'
import { MobileAdvisorMenu, MobileStepControls } from './WarehouseMobileStepper'

/**
 * 4-stage resumable prep wizard.
 *
 * The stage is derived from what's already persisted on the order report,
 * NOT from React state. If the advisor drops their tablet mid-load and
 * someone else picks it up, they see the same screen the first advisor
 * left on — all truck assignments and loaded item checks are already
 * written to `order_reports.sections.warehouse`.
 */
export function WarehousePrepFlow({ quoteId }: { quoteId: string | null }) {
	const reduce = useReducedMotion()
	return (
		<AnimatePresence mode="wait">
			{quoteId ? (
				<motion.div
					key={quoteId}
					initial={reduce ? false : { x: 40, opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					exit={reduce ? undefined : { x: 40, opacity: 0 }}
					transition={{ type: 'spring', stiffness: 260, damping: 32 }}
					className="flex h-full w-full shrink-0 lg:w-[55%]"
				>
					<PrepFlowInner quoteId={quoteId} />
				</motion.div>
			) : (
				<motion.div
					key="empty"
					initial={reduce ? false : { opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={reduce ? undefined : { opacity: 0 }}
					transition={{ duration: 0.2 }}
					className="hidden h-full w-[55%] shrink-0 lg:flex"
				>
					<EmptyPanel />
				</motion.div>
			)}
		</AnimatePresence>
	)
}

function EmptyPanel() {
	return (
		<aside className="flex h-full w-full flex-col items-center justify-center border-s-[3px] border-[var(--color-text)] bg-[var(--color-surface)]">
			<div className="flex flex-col items-center gap-3 px-10 text-center">
				<span
					aria-hidden="true"
					className="font-[family-name:var(--font-geist-mono)] text-[120px] font-bold leading-none text-black/10"
				>
					←
				</span>
				<p className="font-[family-name:var(--font-geist-mono)] text-[13px] font-bold uppercase tracking-[0.22em] text-black/40">
					Pick an order from the queue
				</p>
				<p className="text-[12px] text-black/40 max-w-[340px]">
					Tap a card on the left to start or resume a prep flow. Everything you
					do is saved as you go — you can walk away and come back.
				</p>
			</div>
		</aside>
	)
}

function PrepFlowInner({ quoteId }: { quoteId: string }) {
	const qc = useQueryClient()
	const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
	const scrollAreaRef = useRef<HTMLDivElement | null>(null)
	const previousStageRef = useRef<WarehouseOrderDetailView['stage'] | null>(
		null,
	)
	const { data: order, isLoading } = useQuery({
		queryKey: ['warehouse-order', quoteId],
		queryFn: () => getWarehouseOrderDetail({ data: { quoteId } }),
		staleTime: 5_000,
	})

	const setSelectedQuoteId = useWarehouseStore((s) => s.setSelectedQuoteId)

	const invalidate = () => {
		qc.invalidateQueries({ queryKey: ['warehouse-order', quoteId] })
		qc.invalidateQueries({ queryKey: ['warehouse-queue'] })
		qc.invalidateQueries({ queryKey: ['warehouse-trucks'] })
	}
	const resetMutation = useMutation({
		mutationFn: () => resetWarehouseOrder({ data: { quoteId } }),
		onSuccess: () => {
			setResetConfirmOpen(false)
			invalidate()
		},
	})

	useLayoutEffect(() => {
		if (!order) return
		if (previousStageRef.current && previousStageRef.current !== order.stage) {
			scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'auto' })
		}
		previousStageRef.current = order.stage
	}, [order])

	if (isLoading || !order) {
		return (
			<aside className="flex h-full w-full flex-col items-center justify-center border-[var(--color-text)] bg-[var(--color-surface)] lg:border-s-[3px]">
				<p className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.22em] text-black/40">
					Loading order…
				</p>
			</aside>
		)
	}

	return (
		<aside className="flex h-full w-full flex-col border-[var(--color-text)] bg-[var(--color-surface)] lg:border-s-[3px]">
			<PrepHeader
				order={order}
				onClose={() => setSelectedQuoteId(null)}
				onResetRequest={() => setResetConfirmOpen(true)}
			/>
			<div
				ref={scrollAreaRef}
				className="flex-1 min-h-0 overflow-y-auto px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:py-6"
			>
				<div key={order.stage} className="min-h-full">
					<StageRouter
						order={order}
						onChange={invalidate}
						onExit={() => setSelectedQuoteId(null)}
						onResetRequest={() => setResetConfirmOpen(true)}
					/>
				</div>
			</div>
			<AnimatePresence>
				{resetConfirmOpen && (
					<ResetConfirmDialog
						onCancel={() => setResetConfirmOpen(false)}
						onConfirm={() => resetMutation.mutate()}
						isPending={resetMutation.isPending}
					/>
				)}
			</AnimatePresence>
		</aside>
	)
}

// ─── Header ──────────────────────────────────────────────

function PrepHeader({
	order,
	onClose,
	onResetRequest,
}: {
	order: WarehouseOrderDetailView
	onClose: () => void
	onResetRequest: () => void
}) {
	return (
		<header className="shrink-0 border-b-2 border-[var(--color-text)] px-4 pt-4 pb-4 sm:px-6 lg:border-b-[3px] lg:px-8 lg:pt-6 lg:pb-5">
			<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 lg:flex lg:justify-between lg:gap-6">
				<div className="min-w-0">
					<p className="truncate font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.18em] text-black/50 lg:text-[10px] lg:tracking-[0.3em]">
						Order in prep · {order.quoteNumber}
						{order.customerPoNumber ? ` · ${order.customerPoNumber}` : ''}
					</p>
					<h2 className="mt-1 truncate text-[22px] font-bold leading-none lg:mt-2 lg:text-[34px]">
						{order.customerName}
					</h2>
					<p className="mt-1 truncate font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.1em] text-black/55 lg:mt-2 lg:text-[11px] lg:tracking-[0.14em]">
						{order.deliveryCity || '—'} · {order.itemCount} items
					</p>
				</div>
				<div className="flex shrink-0 flex-col items-end gap-2">
					<motion.button
						type="button"
						onClick={onClose}
						whileTap={{ scale: 0.96 }}
						aria-label="Close order"
						className="hidden border-2 border-[var(--color-text)] bg-[var(--color-surface)] px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text)] transition-colors hover:bg-[var(--color-text)] hover:text-[#FFFFFF] lg:block lg:border-[3px] lg:px-4 lg:py-2 lg:text-[12px] lg:tracking-[0.18em]"
					>
						Back
					</motion.button>
					<motion.button
						type="button"
						onClick={onResetRequest}
						whileTap={{ scale: 0.96 }}
						className="hidden border-2 border-[#CC3300] bg-[var(--color-surface)] px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.14em] text-[#CC3300] transition-colors hover:bg-[#CC3300] hover:text-[#FFFFFF] lg:block lg:border-[3px] lg:px-4 lg:py-2 lg:text-[12px] lg:tracking-[0.18em]"
					>
						Reset
					</motion.button>
				</div>
			</div>

			{/* Stage rail */}
			<div className="mt-4 hidden grid-cols-4 gap-1.5 lg:mt-5 lg:grid lg:gap-2">
				<StageTick
					label="Truck"
					active={order.stage !== 'unstarted'}
					current={order.stage === 'unstarted'}
				/>
				<StageTick
					label="Load"
					active={
						order.stage === 'awaiting_signoff' || order.stage === 'complete'
					}
					current={order.stage === 'loading'}
				/>
				<StageTick
					label="Signoff"
					active={order.stage === 'complete'}
					current={order.stage === 'awaiting_signoff'}
				/>
				<StageTick
					label="Dispatch"
					active={false}
					current={order.stage === 'complete'}
				/>
			</div>
		</header>
	)
}

function StageTick({
	label,
	active,
	current,
}: {
	label: string
	active: boolean
	current: boolean
}) {
	const bg = current
		? '#E6B400'
		: active
			? 'var(--color-text)'
			: 'rgba(0,0,0,0.04)'
	const textColor = current
		? 'var(--color-text)'
		: active
			? '#FFFFFF'
			: 'var(--color-text)'
	return (
		<motion.div
			layout
			animate={{ backgroundColor: bg, color: textColor }}
			transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
			className="flex h-8 min-w-0 items-center justify-center border-2 border-[var(--color-text)] font-[family-name:var(--font-geist-mono)] text-[8px] font-bold uppercase tracking-[0.08em] lg:h-9 lg:border-[3px] lg:text-[10px] lg:tracking-[0.2em]"
		>
			{label}
		</motion.div>
	)
}

function scrollToMobileTarget(target: HTMLElement | null) {
	if (!target || typeof window === 'undefined') return
	window.requestAnimationFrame(() => {
		target.scrollIntoView({ behavior: 'smooth', block: 'start' })
	})
}

function scrollToMobileTargetAfterPaint(getTarget: () => HTMLElement | null) {
	if (typeof window === 'undefined') return
	window.requestAnimationFrame(() => scrollToMobileTarget(getTarget()))
}

// ─── Reset confirm dialog ────────────────────────────────

function ResetConfirmDialog({
	onCancel,
	onConfirm,
	isPending,
}: {
	onCancel: () => void
	onConfirm: () => void
	isPending: boolean
}) {
	return (
		<DispatchDialog
			isOpen
			onClose={onCancel}
			size="sm"
			eyebrow="Warehouse"
			title="Start this order over?"
			dismissDisabled={isPending}
		>
			<DispatchBody>
				<p className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
					This clears every truck assignment, un-checks every item, and drops
					the signoff if it was pending. Use this only if something went wrong —
					the inventory reservation stays, so you won't lose the order.
				</p>
			</DispatchBody>
			<DispatchFooter>
				<DispatchAction tone="ghost" onPress={onCancel} isDisabled={isPending}>
					Cancel
				</DispatchAction>
				<DispatchAction
					tone="danger"
					onPress={onConfirm}
					isDisabled={isPending}
				>
					{isPending ? 'Resetting…' : 'Reset'}
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}

// ─── Stage router ────────────────────────────────────────

function StageRouter({
	order,
	onChange,
	onExit,
	onResetRequest,
}: {
	order: WarehouseOrderDetailView
	onChange: () => void
	onExit: () => void
	onResetRequest: () => void
}) {
	switch (order.stage) {
		case 'unstarted':
		case 'loading':
			return <LoadStage order={order} onChange={onChange} onExit={onExit} />
		case 'awaiting_signoff':
			return <SignoffStage order={order} onChange={onChange} onExit={onExit} />
		case 'complete':
			return (
				<CompleteStage
					order={order}
					onChange={onChange}
					onResetRequest={onResetRequest}
				/>
			)
	}
}

// ─── STAGE 1 + 2: Pick truck + load items + Next ─────────

function LoadStage({
	order,
	onChange,
	onExit,
}: {
	order: WarehouseOrderDetailView
	onChange: () => void
	onExit: () => void
}) {
	const [showTruckPicker, setShowTruckPicker] = useState(
		order.truckAssignments.length === 0,
	)
	const assignedTrucksRef = useRef<HTMLElement | null>(null)
	const truckPickerRef = useRef<HTMLDivElement | null>(null)
	const loadChecklistRef = useRef<HTMLElement | null>(null)
	const previousTruckCountRef = useRef(order.truckAssignments.length)
	const qc = useQueryClient()

	const loadedSet = new Set(
		order.truckAssignments.flatMap((a) => a.itemsLoaded),
	)
	const allLoaded =
		order.itemCount > 0 &&
		order.items.every((i) => loadedSet.has(i.productSlug))
	const emptyTruck = order.truckAssignments.find(
		(a) => a.itemsLoaded.length === 0,
	)
	const hasEmptyTruck = !!emptyTruck
	const canAdvance = allLoaded && !hasEmptyTruck

	useEffect(() => {
		if (order.truckAssignments.length > previousTruckCountRef.current) {
			scrollToMobileTarget(
				loadChecklistRef.current ?? assignedTrucksRef.current,
			)
		}
		if (order.truckAssignments.length === 0) setShowTruckPicker(true)
		previousTruckCountRef.current = order.truckAssignments.length
	}, [order.truckAssignments.length])

	const nextMutation = useMutation({
		mutationFn: () => markReadyForSignoff({ data: { quoteId: order.quoteId } }),
		onSuccess: (res) => {
			if (res.success) {
				qc.invalidateQueries({ queryKey: ['warehouse-order', order.quoteId] })
				qc.invalidateQueries({ queryKey: ['warehouse-queue'] })
				onChange()
			}
		},
	})

	const removeMutation = useMutation({
		mutationFn: (truckId: string) =>
			removeTruckFromOrder({ data: { quoteId: order.quoteId, truckId } }),
		onSuccess: (res) => {
			if (res.success) {
				qc.invalidateQueries({ queryKey: ['warehouse-order', order.quoteId] })
				qc.invalidateQueries({ queryKey: ['warehouse-queue'] })
				qc.invalidateQueries({ queryKey: ['warehouse-trucks'] })
				onChange()
			}
		},
	})

	return (
		<div className="flex min-h-full flex-col gap-6">
			{/* Assigned trucks strip */}
			{order.truckAssignments.length > 0 && (
				<section ref={assignedTrucksRef}>
					<div className="hidden lg:block">
						<SectionHeading index="01" title="Assigned trucks" />
					</div>
					<div className="flex flex-col gap-2 lg:mt-3 lg:grid lg:grid-cols-2 lg:gap-3">
						{order.truckAssignments.map((a, idx) => {
							const isEmpty = a.itemsLoaded.length === 0
							return (
								<motion.div
									key={a.truckId}
									layout
									initial={{ opacity: 0, y: 8 }}
									animate={{
										opacity: 1,
										y: 0,
										borderColor: isEmpty ? '#CC3300' : 'var(--color-text)',
										backgroundColor: isEmpty ? '#FFF4F0' : '#FFFFFF',
									}}
									exit={{ opacity: 0, y: -8 }}
									transition={{
										duration: 0.28,
										ease: [0.2, 0.8, 0.2, 1],
										delay: idx * 0.04,
									}}
									className="border-y-2 border-x-0 px-4 py-3 sm:px-6 lg:border-[3px] lg:px-5 lg:py-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.16em] text-black/55 lg:text-[10px] lg:tracking-[0.2em]">
												{a.plateNumber}
											</p>
											<p className="mt-0.5 text-[15px] font-bold lg:mt-1 lg:text-[16px]">
												{a.driverName}
											</p>
										</div>
										<div className="text-end">
											<motion.span
												key={a.itemsLoaded.length}
												initial={{ scale: 0.8, opacity: 0.4 }}
												animate={{ scale: 1, opacity: 1 }}
												transition={{
													type: 'spring',
													stiffness: 420,
													damping: 24,
												}}
												className="font-[family-name:var(--font-geist-mono)] text-[18px] font-bold leading-none tabular-nums lg:text-[22px]"
											>
												{a.itemsLoaded.length}
											</motion.span>
											<p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[8px] font-bold uppercase tracking-[0.14em] text-black/50 lg:text-[9px] lg:tracking-[0.18em]">
												items
											</p>
										</div>
									</div>
									<div className="mt-1.5 flex items-center justify-between gap-3 lg:mt-2">
										<p className="font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.12em] text-black/50 lg:text-[10px] lg:tracking-[0.14em]">
											{a.capacityTons}T capacity
										</p>
										{isEmpty && (
											<motion.button
												type="button"
												onClick={() => removeMutation.mutate(a.truckId)}
												disabled={removeMutation.isPending}
												whileTap={{ scale: 0.95 }}
												className="border-2 border-[#CC3300] bg-[var(--color-surface)] px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[8px] font-bold uppercase tracking-[0.14em] text-[#CC3300] transition-colors hover:bg-[#CC3300] hover:text-[#FFFFFF] disabled:opacity-50 lg:border-[3px] lg:px-3 lg:py-1.5 lg:text-[9px] lg:tracking-[0.18em]"
											>
												Remove
											</motion.button>
										)}
									</div>
									{isEmpty && (
										<p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-[#CC3300]">
											Empty — load items or remove
										</p>
									)}
								</motion.div>
							)
						})}
					</div>
					<motion.button
						type="button"
						onClick={() => {
							const next = !showTruckPicker
							setShowTruckPicker(next)
							scrollToMobileTargetAfterPaint(() =>
								next ? truckPickerRef.current : assignedTrucksRef.current,
							)
						}}
						whileTap={{ scale: 0.97 }}
						className="mt-2 border-2 border-[var(--color-text)] bg-[var(--color-surface)] px-3 py-2.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-[var(--color-text)] hover:text-[#FFFFFF] lg:mt-3 lg:border-[3px] lg:px-4 lg:py-3 lg:text-[11px] lg:tracking-[0.18em]"
					>
						<span className="lg:hidden">
							{showTruckPicker ? 'Close trucks' : '+ Truck'}
						</span>
						<span className="hidden lg:inline">
							{showTruckPicker
								? '− Close truck picker'
								: '+ Need another truck'}
						</span>
					</motion.button>
				</section>
			)}

			<AnimatePresence>
				{showTruckPicker && (
					<motion.div
						ref={truckPickerRef}
						key="truck-picker"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.24 }}
					>
						<TruckPicker
							order={order}
							onAssigned={() => {
								setShowTruckPicker(false)
								onChange()
							}}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Checklist */}
			{order.truckAssignments.length > 0 && (
				<section>
					<span ref={loadChecklistRef} className="block scroll-mt-4" />
					<div className="hidden lg:block">
						<SectionHeading
							index={order.truckAssignments.length > 0 ? '02' : '01'}
							title="Load checklist"
						/>
						<p className="mt-2 text-[12px] leading-relaxed text-black/55 max-w-[480px]">
							Tap an item to assign it to a truck. Tap again to unload. Every
							item must be on a truck before you can move to signoff.
						</p>
					</div>
					<ItemChecklist order={order} onChange={onChange} />

					{/* Next → Signoff gate — ONLY enabled when every item is loaded
              AND no assigned truck is empty. Pressing it is explicit;
              the stage never auto-advances. */}
					<motion.button
						type="button"
						onClick={() => nextMutation.mutate()}
						disabled={!canAdvance || nextMutation.isPending}
						whileTap={canAdvance ? { scale: 0.98 } : undefined}
						animate={{
							backgroundColor: canAdvance ? '#E6B400' : 'rgba(0,0,0,0.05)',
							color: canAdvance ? 'var(--color-text)' : 'rgba(0,0,0,0.3)',
						}}
						transition={{ duration: 0.25 }}
						className="mt-5 hidden w-full border-[3px] border-[var(--color-text)] py-5 font-[family-name:var(--font-geist-mono)] text-[13px] font-bold uppercase tracking-[0.22em] transition-all enabled:hover:shadow-[6px_6px_0_0_var(--color-text)] disabled:cursor-not-allowed lg:block"
					>
						{nextMutation.isPending
							? 'Advancing…'
							: canAdvance
								? 'Next → Signoff'
								: hasEmptyTruck
									? `Truck ${emptyTruck?.plateNumber} is empty — load or remove it`
									: `${loadedSet.size}/${order.itemCount} loaded — load every item first`}
					</motion.button>
				</section>
			)}

			<MobileStepControls
				backLabel="Exit"
				secondaryKind="exit"
				onBack={onExit}
				primaryLabel="Next"
				onPrimary={() => nextMutation.mutate()}
				primaryDisabled={!canAdvance || nextMutation.isPending}
				isPending={nextMutation.isPending}
				tone="yellow"
			>
				<p className="mb-2 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-black/45">
					{order.truckAssignments.length === 0
						? 'Choose at least one truck'
						: hasEmptyTruck
							? `Truck ${emptyTruck?.plateNumber} is empty`
							: `${loadedSet.size}/${order.itemCount} items loaded`}
				</p>
			</MobileStepControls>
		</div>
	)
}

function SectionHeading({ index, title }: { index: string; title: string }) {
	return (
		<div className="flex items-baseline gap-4">
			<span className="font-[family-name:var(--font-geist-mono)] text-[26px] font-bold leading-none tabular-nums text-black/20">
				{index}
			</span>
			<h3 className="font-[family-name:var(--font-geist-mono)] text-[14px] font-bold uppercase tracking-[0.2em]">
				{title}
			</h3>
		</div>
	)
}

function TruckPicker({
	order,
	onAssigned,
}: {
	order: WarehouseOrderDetailView
	onAssigned: () => void
}) {
	const qc = useQueryClient()
	const { data } = useQuery({
		queryKey: ['warehouse-trucks'],
		queryFn: () => getAvailableTrucks({ data: {} }),
		staleTime: 10_000,
	})

	const mutation = useMutation({
		mutationFn: (truckId: string) =>
			assignTruckToOrder({ data: { quoteId: order.quoteId, truckId } }),
		onSuccess: (res) => {
			if (res.success) {
				qc.invalidateQueries({ queryKey: ['warehouse-trucks'] })
				onAssigned()
			}
		},
	})

	const assignedIds = new Set(order.truckAssignments.map((a) => a.truckId))
	const trucks = (data?.trucks ?? [])
		.filter((t) => !assignedIds.has(t.id))
		.filter((t) => t.status === 'available' || t.status === 'loading')

	return (
		<section>
			<div className="hidden lg:block">
				<SectionHeading index="01" title="Choose truck" />
				<p className="mt-2 text-[12px] leading-relaxed text-black/55 max-w-[480px]">
					Only available trucks show up here. The admin panel (coming soon) is
					where new trucks land.
				</p>
			</div>
			<motion.div
				className="-mx-4 flex flex-col sm:-mx-6 md:mx-0 md:grid md:grid-cols-2 md:gap-3 lg:mt-4"
				initial="hidden"
				animate="visible"
				variants={{
					hidden: {},
					visible: { transition: { staggerChildren: 0.04 } },
				}}
			>
				{trucks.length === 0 && (
					<div className="col-span-full border-y-2 border-x-0 border-dashed border-black/20 px-4 py-4 text-center font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-black/45 lg:border-[3px] lg:px-5 lg:py-6 lg:text-[11px] lg:tracking-[0.18em]">
						No trucks available right now
					</div>
				)}
				{trucks.map((t) => (
					<motion.button
						key={t.id}
						type="button"
						onClick={() => mutation.mutate(t.id)}
						disabled={mutation.isPending}
						variants={{
							hidden: { opacity: 0, y: 10 },
							visible: { opacity: 1, y: 0 },
						}}
						transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
						whileHover={{ y: -2 }}
						whileTap={{ scale: 0.98 }}
						className="group min-h-[74px] border-y-2 border-x-0 border-[var(--color-text)] bg-[var(--color-surface)] px-4 py-3 text-start transition-shadow disabled:opacity-40 md:min-h-[100px] md:border-[3px] md:px-5 md:py-4 md:hover:shadow-[4px_4px_0_0_var(--color-text)]"
					>
						<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
							<div className="min-w-0">
								<p className="font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.16em] text-black/55 md:text-[11px] md:tracking-[0.22em]">
									{t.plateNumber}
								</p>
								<p className="mt-0.5 truncate text-[16px] font-bold leading-tight md:mt-1 md:text-[18px]">
									{t.driverName}
								</p>
								<p className="mt-0.5 truncate font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.1em] text-black/50 md:mt-1 md:text-[10px] md:tracking-[0.14em]">
									{t.bodyType} · {t.capacityTons}T
								</p>
							</div>
							<span className="hidden shrink-0 bg-[#E6B400] px-2 py-1 font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.2em] md:inline-flex">
								Tap to pick
							</span>
						</div>
					</motion.button>
				))}
			</motion.div>
		</section>
	)
}

// ─── Checklist (one row per line item) ───────────────────

function ItemChecklist({
	order,
	onChange,
}: {
	order: WarehouseOrderDetailView
	onChange: () => void
}) {
	const qc = useQueryClient()
	const mutation = useMutation({
		mutationFn: (input: { truckId: string; productSlug: string }) =>
			toggleItemLoaded({
				data: {
					quoteId: order.quoteId,
					truckId: input.truckId,
					productSlug: input.productSlug,
				},
			}),
		onSuccess: (res) => {
			if (res.success) {
				qc.invalidateQueries({ queryKey: ['warehouse-order', order.quoteId] })
				qc.invalidateQueries({ queryKey: ['warehouse-queue'] })
				onChange()
			}
		},
	})

	return (
		<motion.div
			className="-mx-4 mt-2 flex flex-col sm:-mx-6 lg:mx-0 lg:mt-4 lg:gap-3"
			initial="hidden"
			animate="visible"
			variants={{
				hidden: {},
				visible: { transition: { staggerChildren: 0.03 } },
			}}
		>
			{order.items.map((item) => (
				<motion.div
					key={item.productSlug}
					variants={{
						hidden: { opacity: 0, x: -8 },
						visible: { opacity: 1, x: 0 },
					}}
					transition={{ duration: 0.22 }}
					animate={{
						borderColor: item.loadedOnTruckId
							? '#0A5C2E'
							: 'rgba(10,10,10,0.2)',
						backgroundColor: item.loadedOnTruckId ? '#F0F7F0' : '#FFFFFF',
					}}
					className="flex flex-col items-start gap-3 border-y-2 border-x-0 px-4 py-4 sm:px-6 lg:flex-row lg:flex-wrap lg:items-center lg:border-[3px] lg:px-5"
					style={{ minHeight: '72px' }}
				>
					<div className="min-w-0 flex-1">
						<p className="text-[16px] font-bold leading-tight">
							{item.productName}
						</p>
						<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-black/55">
							{item.sku} · {item.quantity} {item.unit}
						</p>
					</div>

					{/* Truck buttons — one per assigned truck */}
					<div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:flex-wrap">
						{order.truckAssignments.map((a) => {
							const isHere = item.loadedOnTruckId === a.truckId
							return (
								<motion.button
									key={a.truckId}
									type="button"
									onClick={() =>
										mutation.mutate({
											truckId: a.truckId,
											productSlug: item.productSlug,
										})
									}
									disabled={mutation.isPending}
									whileTap={{ scale: 0.95 }}
									animate={{
										backgroundColor: isHere ? '#0A5C2E' : '#FFFFFF',
										color: isHere ? '#FFFFFF' : 'var(--color-text)',
									}}
									transition={{ duration: 0.2 }}
									className="border-2 border-[var(--color-text)] px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-40 lg:border-[3px]"
									style={{ minHeight: '44px', minWidth: '88px' }}
								>
									{isHere ? '✓ ' : ''}
									{a.plateNumber.split('-').pop()}
								</motion.button>
							)
						})}
					</div>
				</motion.div>
			))}
		</motion.div>
	)
}

// ─── STAGE 3: Signoff ────────────────────────────────────

function SignoffStage({
	order,
	onChange,
	onExit,
}: {
	order: WarehouseOrderDetailView
	onChange: () => void
	onExit: () => void
}) {
	const [advisorId, setAdvisorId] = useState<string | null>(null)
	const [qualityPass, setQualityPass] = useState<boolean | null>(null)
	const [proofUrl, setProofUrl] = useState('')
	const [failReason, setFailReason] = useState('')
	const [securityMethod, setSecurityMethod] =
		useState<SecurityMethod>('password')
	const [securityToken, setSecurityToken] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [mobileAdvisorOpen, setMobileAdvisorOpen] = useState(false)

	const qc = useQueryClient()

	const { data: employeesData } = useQuery({
		queryKey: ['warehouse-employees'],
		queryFn: () => getWarehouseEmployees({ data: {} }),
		staleTime: 60_000,
	})
	const employees = employeesData?.employees ?? []
	const selectedAdvisor = employees.find((e) => e.id === advisorId) ?? null

	const passMutation = useMutation({
		mutationFn: () => {
			if (!advisorId) throw new Error('Pick an advisor')
			return recordWarehouseSignoff({
				data: {
					quoteId: order.quoteId,
					advisorId,
					proofUrl: proofUrl.trim(),
					securityMethod,
					securityToken: securityToken.trim(),
				},
			})
		},
		onSuccess: (res) => {
			if (!res.success) {
				setError(res.error)
				return
			}
			qc.invalidateQueries({ queryKey: ['warehouse-order', order.quoteId] })
			qc.invalidateQueries({ queryKey: ['warehouse-queue'] })
			onChange()
		},
		onError: (e: Error) => setError(e.message),
	})

	const failMutation = useMutation({
		mutationFn: () => {
			if (!advisorId) throw new Error('Pick an advisor')
			return logFailedInspection({
				data: {
					quoteId: order.quoteId,
					advisorId,
					reason: failReason.trim() || 'Warehouse inspection failed',
					proofUrl: proofUrl.trim(),
					securityMethod,
					securityToken: securityToken.trim(),
				},
			})
		},
		onSuccess: (res) => {
			if (!res.success) {
				setError(res.error)
				return
			}
			qc.invalidateQueries({ queryKey: ['warehouse-order', order.quoteId] })
			qc.invalidateQueries({ queryKey: ['warehouse-queue'] })
			onChange()
		},
		onError: (e: Error) => setError(e.message),
	})

	const nameOk = advisorId !== null
	const tokenOk = securityToken.trim().length >= 4
	const proofOk = proofUrl.trim().length > 0
	const reasonOk = failReason.trim().length >= 3

	const readyPass = qualityPass === true && nameOk && tokenOk && proofOk
	const readyFail =
		qualityPass === false && nameOk && tokenOk && proofOk && reasonOk
	const mobileReadyPass = qualityPass === true && nameOk && tokenOk && proofOk
	const mobileReadyFail = qualityPass === false && nameOk && tokenOk && proofOk
	const pending = passMutation.isPending || failMutation.isPending

	const submit = () => {
		setError(null)
		if (qualityPass === true) passMutation.mutate()
		else if (qualityPass === false) failMutation.mutate()
	}

	return (
		<div className="flex min-h-full flex-col gap-8">
			<div className="hidden lg:block">
				<SectionHeading index="03" title="Advisor + quality signoff" />
				<p className="mt-2 text-[12px] leading-relaxed text-black/55 max-w-[480px]">
					Every item is on a truck. Confirm who you are, inspect the load, and
					lock it before it leaves the dock. A fail bounces the order back to
					loading so you can fix and retry.
				</p>
			</div>

			<div className="flex flex-col gap-4 lg:hidden">
				<MobileAdvisorMenu
					employees={employees}
					selectedAdvisor={selectedAdvisor}
					isOpen={mobileAdvisorOpen}
					onToggle={() => setMobileAdvisorOpen((open) => !open)}
					onSelect={(employeeId) => {
						setAdvisorId(employeeId)
						setMobileAdvisorOpen(false)
					}}
				/>

				<AnimatePresence initial={false}>
					{advisorId && (
						<motion.div
							key="mobile-password"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -6 }}
							transition={{ duration: 0.2 }}
							className="flex flex-col gap-2"
						>
							<label className="flex flex-col gap-2">
								<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
									Password
								</span>
								<input
									type="password"
									value={securityToken}
									onChange={(event) => {
										setSecurityMethod('password')
										setSecurityToken(event.target.value)
									}}
									placeholder="Employee password"
									autoComplete="off"
									className="h-12 w-full border-2 border-[var(--color-text)] bg-[var(--color-surface)] px-3 text-[16px] outline-none placeholder:text-black/30"
								/>
							</label>
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence initial={false}>
					{tokenOk && (
						<motion.div
							key="mobile-quality"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -6 }}
							transition={{ duration: 0.2 }}
						>
							<p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
								Pass / Fail
							</p>
							<div className="mt-2 grid grid-cols-2 gap-2">
								<MobileQualityButton
									active={qualityPass === true}
									tone="#0A5C2E"
									label="Pass"
									onPress={() => setQualityPass(true)}
								/>
								<MobileQualityButton
									active={qualityPass === false}
									tone="#CC3300"
									label="Fail"
									onPress={() => setQualityPass(false)}
								/>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence initial={false}>
					{qualityPass !== null && (
						<motion.div
							key="mobile-proof"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -6 }}
							transition={{ duration: 0.2 }}
						>
							<label className="flex flex-col gap-2">
								<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
									Proof
								</span>
								<input
									type="text"
									value={proofUrl}
									onChange={(event) => setProofUrl(event.target.value)}
									placeholder="Photo, manifest, or note reference"
									className="h-12 w-full border-2 border-[var(--color-text)] bg-[var(--color-surface)] px-3 text-[16px] outline-none placeholder:text-black/30"
								/>
							</label>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{order.failedInspections.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					className="hidden border-[3px] border-[#CC3300] bg-[#FFF4F0] px-5 py-3 lg:block"
				>
					<p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.22em] text-[#CC3300]">
						Previous failed inspections · {order.failedInspections.length}
					</p>
					<p className="mt-1 text-[11px] text-black/60">
						Most recent:{' '}
						<span className="font-semibold">
							{
								order.failedInspections[order.failedInspections.length - 1]
									.reason
							}
						</span>
					</p>
				</motion.div>
			)}

			{/* Advisor picker — employees.md seed, HR panel will add role
          filtering later. For now the full payroll is selectable. */}
			<div className="hidden lg:block">
				<p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
					Advisor
				</p>
				<p className="mt-1 text-[11px] text-black/55 max-w-[480px]">
					Pick whoever is actually doing the signoff. Name comes from the
					employee directory — the admin panel will manage who's on the list.
				</p>
				<div className="mt-3 flex flex-col gap-2 md:grid md:grid-cols-2">
					{employees.length === 0 && (
						<div className="col-span-full border-[3px] border-dashed border-black/20 px-5 py-6 text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-black/45">
							Loading employees…
						</div>
					)}
					{employees.map((e) => {
						const active = advisorId === e.id
						return (
							<motion.button
								key={e.id}
								type="button"
								onClick={() => setAdvisorId(e.id)}
								whileTap={{ scale: 0.97 }}
								animate={{
									backgroundColor: active ? 'var(--color-text)' : '#FFFFFF',
									color: active ? '#FFFFFF' : 'var(--color-text)',
								}}
								transition={{ duration: 0.18 }}
								className="border-[3px] border-[var(--color-text)] px-4 py-3 text-start"
								style={{ minHeight: '56px' }}
							>
								<p className="text-[14px] font-bold leading-tight">{e.name}</p>
								<p
									className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em]"
									style={{ opacity: active ? 0.7 : 0.45 }}
								>
									{e.id}
								</p>
							</motion.button>
						)
					})}
				</div>
				{selectedAdvisor && (
					<p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-[#0A5C2E]">
						✓ Signing as {selectedAdvisor.name}
					</p>
				)}
			</div>

			{/* Your credential — advisor's personal password or QR badge. The
          point is to stop a co-worker from pressing Pass while the
          tablet is unattended. Don't share it. */}
			<div className="hidden lg:block">
				<p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
					Your credential
				</p>
				<p className="mt-1 text-[11px] text-black/55 max-w-[480px]">
					Type <strong>your own</strong> password or scan{' '}
					<strong>your badge</strong>. The signoff is locked to whoever
					authenticates here — don't let anyone press pass behind your back.
				</p>
				<div className="mt-3 flex flex-col gap-2 sm:grid sm:grid-cols-2">
					<SecurityMethodTab
						active={securityMethod === 'password'}
						onPress={() => {
							setSecurityMethod('password')
							setSecurityToken('')
						}}
						label="Password"
					/>
					<SecurityMethodTab
						active={securityMethod === 'qr'}
						onPress={() => {
							setSecurityMethod('qr')
							setSecurityToken('')
						}}
						label="QR Scan"
					/>
				</div>
				<input
					type={securityMethod === 'password' ? 'password' : 'text'}
					value={securityToken}
					onChange={(e) => setSecurityToken(e.target.value)}
					placeholder={
						securityMethod === 'password' ? 'Your password' : 'Scan your badge'
					}
					autoComplete="off"
					className="mt-3 w-full border-[3px] border-[var(--color-text)] bg-[var(--color-surface)] px-4 py-3 text-[16px] outline-none transition-colors placeholder:text-black/30"
					style={{ minHeight: '56px' }}
				/>
				{securityMethod === 'qr' && (
					<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-black/45">
						Point your personal badge at the reader.
					</p>
				)}
			</div>

			<div className="hidden lg:block">
				<p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
					Quality check
				</p>
				<div className="mt-3 flex flex-col gap-3 sm:grid sm:grid-cols-2">
					<ToggleButton
						active={qualityPass === true}
						accent="#0A5C2E"
						onPress={() => setQualityPass(true)}
						label="Pass"
						sub="All items inspected"
					/>
					<ToggleButton
						active={qualityPass === false}
						accent="#CC3300"
						onPress={() => setQualityPass(false)}
						label="Fail"
						sub="Something is off"
					/>
				</div>
			</div>

			<AnimatePresence>
				{qualityPass === false && (
					<motion.div
						key="fail-reason"
						initial={{ opacity: 0, y: -6, height: 0 }}
						animate={{ opacity: 1, y: 0, height: 'auto' }}
						exit={{ opacity: 0, y: -6, height: 0 }}
						transition={{ duration: 0.24 }}
						className="hidden overflow-hidden lg:block"
					>
						<Field
							label="What failed?"
							hint="Brief note for the audit trail — min 3 characters"
							value={failReason}
							onChange={setFailReason}
							placeholder="e.g. 3 bags of cement damaged in transit to dock"
						/>
					</motion.div>
				)}
			</AnimatePresence>

			<div className="hidden lg:block">
				<Field
					label="Proof of load"
					hint="Filename of the photo / signed manifest"
					value={proofUrl}
					onChange={setProofUrl}
					placeholder="e.g. load-photo-bay01.jpg"
				/>
			</div>

			<AnimatePresence>
				{error && (
					<motion.div
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						className="border-[3px] border-[#CC3300] bg-[#FFF0ED] px-4 py-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-[#CC3300]"
					>
						{error}
					</motion.div>
				)}
			</AnimatePresence>

			<motion.button
				type="button"
				onClick={submit}
				disabled={(!readyPass && !readyFail) || pending}
				whileTap={readyPass || readyFail ? { scale: 0.98 } : undefined}
				animate={{
					backgroundColor: readyPass
						? '#E6B400'
						: readyFail
							? '#CC3300'
							: 'rgba(0,0,0,0.05)',
					color: readyPass
						? 'var(--color-text)'
						: readyFail
							? '#FFFFFF'
							: 'rgba(0,0,0,0.3)',
				}}
				transition={{ duration: 0.25 }}
				className="hidden w-full border-[3px] border-[var(--color-text)] py-5 font-[family-name:var(--font-geist-mono)] text-[14px] font-bold uppercase tracking-[0.22em] enabled:hover:shadow-[6px_6px_0_0_var(--color-text)] disabled:cursor-not-allowed lg:block"
			>
				{pending
					? qualityPass === false
						? 'Logging fail…'
						: 'Recording…'
					: readyFail
						? 'Log fail + retry'
						: readyPass
							? 'Lock signoff'
							: qualityPass === null
								? 'Pick pass or fail'
								: qualityPass === false
									? 'Fill reason + security to log'
									: 'Fill security to lock'}
			</motion.button>

			<MobileStepControls
				backLabel="Exit"
				secondaryKind="exit"
				onBack={onExit}
				primaryLabel={mobileReadyFail ? 'Finish retry' : 'Finish signoff'}
				onPrimary={submit}
				primaryDisabled={(!mobileReadyPass && !mobileReadyFail) || pending}
				isPending={pending}
				tone={mobileReadyFail ? 'red' : 'yellow'}
			/>
		</div>
	)
}

function MobileQualityButton({
	active,
	tone,
	label,
	onPress,
}: {
	active: boolean
	tone: string
	label: string
	onPress: () => void
}) {
	return (
		<motion.button
			type="button"
			onClick={onPress}
			whileTap={{ scale: 0.97 }}
			animate={{
				backgroundColor: active ? tone : '#FFFFFF',
				color: active ? '#FFFFFF' : 'var(--color-text)',
			}}
			transition={{ duration: 0.18 }}
			className="h-12 border-2 border-[var(--color-text)] font-[family-name:var(--font-geist-mono)] text-[11px] font-bold uppercase tracking-[0.18em]"
		>
			{label}
		</motion.button>
	)
}

function SecurityMethodTab({
	active,
	onPress,
	label,
}: {
	active: boolean
	onPress: () => void
	label: string
}) {
	return (
		<motion.button
			type="button"
			onClick={onPress}
			whileTap={{ scale: 0.97 }}
			animate={{
				backgroundColor: active ? 'var(--color-text)' : '#FFFFFF',
				color: active ? '#FFFFFF' : 'var(--color-text)',
			}}
			transition={{ duration: 0.2 }}
			className="border-[3px] border-[var(--color-text)] py-3 font-[family-name:var(--font-geist-mono)] text-[11px] font-bold uppercase tracking-[0.2em]"
		>
			{label}
		</motion.button>
	)
}

function Field({
	label,
	hint,
	value,
	onChange,
	placeholder,
}: {
	label: string
	hint?: string
	value: string
	onChange: (v: string) => void
	placeholder?: string
}) {
	return (
		<label className="flex flex-col gap-2">
			<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
				{label}
			</span>
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="border-[3px] border-[var(--color-text)] bg-[var(--color-surface)] px-4 py-3 text-[16px] outline-none transition-colors placeholder:text-black/30 focus:bg-[var(--color-surface)]"
				style={{ minHeight: '56px' }}
			/>
			{hint && (
				<span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-black/45">
					{hint}
				</span>
			)}
		</label>
	)
}

function ToggleButton({
	active,
	accent,
	onPress,
	label,
	sub,
}: {
	active: boolean
	accent: string
	onPress: () => void
	label: string
	sub: string
}) {
	return (
		<motion.button
			type="button"
			onClick={onPress}
			whileTap={{ scale: 0.97 }}
			animate={{
				backgroundColor: active ? accent : '#FFFFFF',
				color: active ? '#FFFFFF' : 'var(--color-text)',
			}}
			transition={{ duration: 0.22 }}
			className="border-[3px] border-[var(--color-text)] px-4 py-5 text-start sm:px-5"
			style={{ minHeight: '88px' }}
		>
			<p className="font-[family-name:var(--font-geist-mono)] text-[22px] font-bold uppercase tracking-[0.08em]">
				{label}
			</p>
			<p
				className="mt-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em]"
				style={{ opacity: active ? 0.75 : 0.5 }}
			>
				{sub}
			</p>
		</motion.button>
	)
}

// ─── STAGE 4: Complete — pass to dispatch ────────────────

function CompleteStage({
	order,
	onChange,
	onResetRequest,
}: {
	order: WarehouseOrderDetailView
	onChange: () => void
	onResetRequest: () => void
}) {
	const qc = useQueryClient()
	const setSelectedQuoteId = useWarehouseStore((s) => s.setSelectedQuoteId)
	const mutation = useMutation({
		mutationFn: () => passOrderToDispatch({ data: { quoteId: order.quoteId } }),
		onSuccess: (res) => {
			if (!res.success) return
			qc.invalidateQueries({ queryKey: ['warehouse-queue'] })
			qc.invalidateQueries({ queryKey: ['warehouse-order', order.quoteId] })
			setSelectedQuoteId(null)
			onChange()
		},
	})

	return (
		<div className="flex min-h-full flex-col gap-6">
			<SectionHeading index="04" title="Ready for dispatch" />

			<motion.div
				initial={{ opacity: 0, y: 6 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.28 }}
				className="border-[3px] border-[#0A5C2E] bg-[#F0F7F0] px-6 py-5"
			>
				<p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A5C2E]">
					Signed off
				</p>
				<p className="mt-2 text-[18px] font-bold leading-tight">
					{order.signoff?.advisorName}
				</p>
				<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-black/60">
					{order.signoff?.qualityPass ? 'Quality · Pass' : 'Quality · Fail'} ·{' '}
					{order.signoff?.signedAt
						? new Date(order.signoff.signedAt).toLocaleString('en-EG')
						: ''}
				</p>
				<p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/50 truncate">
					Proof: {order.signoff?.proofUrl}
				</p>
			</motion.div>

			<div className="flex flex-col gap-3">
				{order.truckAssignments.map((a) => (
					<div
						key={a.truckId}
						className="flex flex-col items-start gap-2 border-[3px] border-[var(--color-text)] bg-[var(--color-surface)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<div>
							<p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
								{a.plateNumber}
							</p>
							<p className="mt-0.5 text-[14px] font-bold">{a.driverName}</p>
						</div>
						<span className="font-[family-name:var(--font-geist-mono)] text-[18px] font-bold tabular-nums">
							{a.itemsLoaded.length}
							<span className="ms-1 text-[10px] text-black/50">ITEMS</span>
						</span>
					</div>
				))}
			</div>

			<motion.button
				type="button"
				onClick={() => mutation.mutate()}
				disabled={mutation.isPending}
				whileTap={{ scale: 0.98 }}
				className="hidden w-full border-[3px] border-[var(--color-text)] bg-[var(--color-text)] py-6 font-[family-name:var(--font-geist-mono)] text-[16px] font-bold uppercase tracking-[0.22em] text-[#FFFFFF] transition-all hover:bg-[#E6B400] hover:text-[var(--color-text)] hover:shadow-[6px_6px_0_0_var(--color-text)] disabled:opacity-40 lg:block"
			>
				{mutation.isPending ? 'Passing…' : 'Pass to dispatch →'}
			</motion.button>

			<MobileStepControls
				backLabel="Reset"
				secondaryKind="reset"
				onBack={onResetRequest}
				primaryLabel="Pass to dispatch"
				onPrimary={() => mutation.mutate()}
				primaryDisabled={mutation.isPending}
				isPending={mutation.isPending}
				tone="green"
			/>
		</div>
	)
}
