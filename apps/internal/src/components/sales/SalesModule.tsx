import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { getCustomerList } from '../../lib/server/sales-customers'
import { getRFQQueue, saveRFQForLater } from '../../lib/server/sales-rfq'
import { useSalesStore } from '../../stores/sales'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../shared/DispatchDialog'
import { ReportViewerModal } from '../shared/ReportViewer'
import { NegotiationView } from './negotiation/NegotiationView'
import { QuoteBuilderView } from './quote-builder/QuoteBuilderView'
import { SearchMenu } from './quote-builder/SearchMenu'

const QUOTE_ENTER = { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const }

const SAVE_DURATIONS = [
	{ label: '30 min', minutes: 30 },
	{ label: '1 hour', minutes: 60 },
	{ label: '2 hours', minutes: 120 },
	{ label: '4 hours', minutes: 240 },
	{ label: 'Tomorrow', minutes: 960 },
]

export function SalesModule() {
	const qc = useQueryClient()
	const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
	const leaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
	const editingRfqId = useSalesStore((s) => s.editingRfqId)
	const setEditingRfqId = useSalesStore((s) => s.setEditingRfqId)
	const newQuoteCustomer = useSalesStore((s) => s.newQuoteCustomer)
	const setNewQuoteCustomer = useSalesStore((s) => s.setNewQuoteCustomer)
	const setActiveTab = useSalesStore((s) => s.setActiveTab)
	const [negotiatingQuoteId, setNegotiatingQuoteId] = useState<string | null>(
		null,
	)
	const [customerSelectOpen, setCustomerSelectOpen] = useState(false)

	// Floating windows
	const [openPopover, setOpenPopover] = useState<
		'submitted' | 'saved' | 'evaluated' | 'rejected' | null
	>(null)
	const [reportRfqId, setReportRfqId] = useState<string | null>(null)

	// Save timer
	const [saveTimerOpen, setSaveTimerOpen] = useState(false)
	const [savingRfqId, setSavingRfqId] = useState<string | null>(null)

	// Working on a saved order (not from main pipeline)
	const [workingSavedOrder, setWorkingSavedOrder] = useState(false)

	// Fetch pipeline
	const { data: rfqData } = useQuery({
		queryKey: ['sales-rfq-list'],
		queryFn: () => getRFQQueue({ data: {} }),
		staleTime: 10_000,
	})

	const rfqs = rfqData?.rfqs ?? []

	// Pipeline: ONLY submitted, oldest first
	const pipeline = useMemo(() => {
		return rfqs
			.filter((r) => r.status === 'submitted')
			.sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
			)
	}, [rfqs])

	const saved = useMemo(() => rfqs.filter((r) => r.status === 'saved'), [rfqs])
	const evaluated = useMemo(
		() => rfqs.filter((r) => r.status === 'quoted'),
		[rfqs],
	)
	const rejected = useMemo(
		() => rfqs.filter((r) => r.status === 'declined' || r.status === 'expired'),
		[rfqs],
	)

	// Auto-load first pipeline item if nothing selected and not working on a saved order
	useEffect(() => {
		const head = pipeline[0]
		if (!editingRfqId && !newQuoteCustomer && !workingSavedOrder && head) {
			setEditingRfqId(head.id)
		}
	}, [
		pipeline,
		editingRfqId,
		newQuoteCustomer,
		workingSavedOrder,
		setEditingRfqId,
	])

	// After an action (reject/evaluate), clear editingRfqId.
	// The auto-load effect will pick the next submitted order from the refetched pipeline.
	const handleActionComplete = useCallback(async () => {
		if (workingSavedOrder) {
			setWorkingSavedOrder(false)
		}
		await qc.invalidateQueries({ queryKey: ['sales-rfq-list'] })
		setEditingRfqId(null)
	}, [workingSavedOrder, setEditingRfqId, qc])

	// Save: open timer dialog (does NOT advance — status change removes it from pipeline)
	const handleSaveRequest = useCallback(() => {
		setSavingRfqId(editingRfqId)
		setSaveTimerOpen(true)
	}, [editingRfqId])

	const handleSaveConfirm = useCallback(
		async (minutes: number) => {
			if (!savingRfqId) return
			// 1. Change status in DB
			await saveRFQForLater({
				data: { rfqId: savingRfqId, returnInMinutes: minutes },
			})
			// 2. Close dialog
			setSaveTimerOpen(false)
			setSavingRfqId(null)
			if (workingSavedOrder) setWorkingSavedOrder(false)
			// 3. Refetch pipeline FIRST — so the saved order is gone from the list
			await qc.invalidateQueries({ queryKey: ['sales-rfq-list'] })
			// 4. THEN clear editing — auto-load will pick from the already-updated pipeline
			setEditingRfqId(null)
		},
		[savingRfqId, workingSavedOrder, setEditingRfqId, qc],
	)

	// Open saved order in builder
	const handleOpenSavedOrder = useCallback(
		(rfqId: string) => {
			setOpenPopover(null)
			setWorkingSavedOrder(true)
			setEditingRfqId(rfqId)
		},
		[setEditingRfqId],
	)

	// Return to main pipeline from saved order
	const handleReturnToPipeline = useCallback(() => {
		setWorkingSavedOrder(false)
		setEditingRfqId(null)
	}, [setEditingRfqId])

	// Customer list
	const { data: customerData } = useQuery({
		queryKey: ['sales-customer-list'],
		queryFn: () => getCustomerList({ data: { page: 1, limit: 100 } }),
		staleTime: 5 * 60_000,
	})
	const customers = useMemo(
		() =>
			(customerData?.customers ?? []).map((c) => ({
				id: c.id,
				name: c.companyName,
				tier: c.tier,
				address: c.address ?? '',
			})),
		[customerData],
	)

	// Negotiate events
	useEffect(() => {
		const handler = (e: Event) => {
			const quoteId = (e as CustomEvent).detail?.quoteId
			if (quoteId) setNegotiatingQuoteId(quoteId)
		}
		window.addEventListener('sales:negotiate', handler)
		return () => window.removeEventListener('sales:negotiate', handler)
	}, [])

	if (negotiatingQuoteId) {
		return (
			<div className="sales-theme sales-paper flex h-full flex-col">
				<NegotiationView
					quoteId={negotiatingQuoteId}
					onBack={() => setNegotiatingQuoteId(null)}
					onReviseQuote={() => {
						setNegotiatingQuoteId(null)
						setActiveTab('rfq-inbox')
					}}
					onMarkAsWon={() => {
						setNegotiatingQuoteId(null)
						setActiveTab('rfq-inbox')
					}}
				/>
			</div>
		)
	}

	const isNew = !!newQuoteCustomer?.id.startsWith('new-')

	return (
		<div className="sales-theme sales-paper flex h-full flex-col">
			{/* ── Top bar ──────────────────────────────────────────── */}
			<div
				className="shrink-0 flex items-center gap-6 px-6 py-3"
				style={{ borderBottom: '1px solid var(--color-border)' }}
			>
				{/* New quote — italic Literata word-action with a + mark */}
				<Button
					onPress={() => setCustomerSelectOpen(true)}
					aria-label="Start a new quote"
					className="group relative inline-flex shrink-0 items-baseline gap-1.5 font-[family-name:var(--font-literata)] italic outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 cursor-pointer rounded-sm"
					style={{
						fontSize: '17px',
						fontWeight: 500,
						color: 'var(--color-text)',
						letterSpacing: '-0.018em',
					}}
				>
					<span className="relative">
						new quote
						<span
							aria-hidden="true"
							className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[var(--color-primary)] transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
						/>
					</span>
					<span
						aria-hidden="true"
						className="transition-transform group-hover:translate-x-[3px]"
						style={{
							fontFamily: 'var(--font-literata)',
							fontStyle: 'italic',
							fontSize: '18px',
							color: 'var(--color-primary)',
							lineHeight: 1,
						}}
					>
						→
					</span>
				</Button>

				<span
					aria-hidden="true"
					className="h-5 w-px shrink-0"
					style={{ backgroundColor: 'var(--color-border)' }}
				/>

				{/* Stage filter tabs — typographic with hover-popover rosters */}
				<nav aria-label="Quote stage filters" className="shrink-0">
					<ol className="flex items-baseline gap-5">
						{[
							{
								key: 'submitted' as const,
								label: 'submitted',
								count: pipeline.length,
								items: pipeline,
								clickable: false,
								action: null,
							},
							{
								key: 'saved' as const,
								label: 'saved',
								count: saved.length,
								items: saved,
								clickable: true,
								action: 'resume →',
							},
							{
								key: 'evaluated' as const,
								label: 'evaluated',
								count: evaluated.length,
								items: evaluated,
								clickable: true,
								action: 'report →',
							},
							{
								key: 'rejected' as const,
								label: 'rejected',
								count: rejected.length,
								items: rejected,
								clickable: true,
								action: 'report →',
							},
						].map(({ key, label, count, items, clickable, action }) => {
							const isOpen = openPopover === key
							return (
								<li
									key={key}
									className="relative"
									onMouseEnter={() => {
										clearTimeout(leaveTimerRef.current)
										hoverTimerRef.current = setTimeout(
											() => setOpenPopover(key),
											120,
										)
									}}
									onMouseLeave={() => {
										clearTimeout(hoverTimerRef.current)
										leaveTimerRef.current = setTimeout(
											() => setOpenPopover((cur) => (cur === key ? null : cur)),
											200,
										)
									}}
								>
									<button
										type="button"
										aria-expanded={isOpen}
										aria-haspopup="true"
										onFocus={() => setOpenPopover(key)}
										className="group relative inline-flex items-baseline gap-1.5 font-[family-name:var(--font-archivo)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
									>
										<span
											style={{
												fontSize: '13px',
												fontStyle: isOpen || count > 0 ? 'normal' : 'italic',
												fontWeight: isOpen || count > 0 ? 500 : 400,
												color: isOpen
													? 'var(--color-text)'
													: count > 0
														? 'var(--color-text-muted)'
														: 'var(--color-text-subtle)',
												letterSpacing: '-0.005em',
											}}
										>
											{label}
										</span>
										{count > 0 && (
											<span
												className="font-[family-name:var(--font-plex-mono)] tabular-nums"
												style={{
													fontSize: '11px',
													color: isOpen
														? 'var(--color-primary)'
														: 'var(--color-text-subtle)',
													letterSpacing: '0.04em',
												}}
											>
												{count}
											</span>
										)}
										<span
											aria-hidden="true"
											className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-[var(--color-primary)] transition-transform duration-200 ${
												isOpen
													? 'scale-x-100'
													: 'scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100'
											}`}
										/>
									</button>

									<AnimatePresence>
										{isOpen && items.length > 0 && (
											<motion.div
												initial={{ opacity: 0, y: -4 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -4 }}
												transition={{ duration: 0.14 }}
												className="absolute top-full start-0 mt-2 z-50 w-[280px]"
												style={{
													backgroundColor: 'var(--color-surface)',
													border: '1px solid var(--color-border)',
													boxShadow:
														'0 4px 12px -4px rgba(0,0,0,0.1), 0 20px 40px -12px rgba(0,0,0,0.16)',
												}}
											>
												<div
													className="flex items-baseline justify-between px-4 py-2.5"
													style={{
														borderBottom: '1px solid var(--color-border)',
													}}
												>
													<span
														className="font-[family-name:var(--font-archivo)] italic"
														style={{
															fontSize: '11px',
															color: 'var(--color-text-muted)',
														}}
													>
														{label}
													</span>
													<span
														className="font-[family-name:var(--font-plex-mono)] tabular-nums"
														style={{
															fontSize: '10px',
															color: 'var(--color-text-subtle)',
															letterSpacing: '0.06em',
														}}
													>
														{count}
													</span>
												</div>
												<div className="max-h-[280px] overflow-y-auto">
													{items.map((rfq) => {
														const age = Math.floor(
															(Date.now() - new Date(rfq.createdAt).getTime()) /
																3_600_000,
														)
														const timeLabel =
															age < 24 ? `${age}h` : `${Math.floor(age / 24)}d`
														const handleClick = clickable
															? () => {
																	if (key === 'saved') {
																		handleOpenSavedOrder(rfq.id)
																	} else {
																		setOpenPopover(null)
																		setReportRfqId(rfq.id)
																	}
																}
															: undefined
														const Row = clickable ? 'button' : 'div'
														return (
															<Row
																key={rfq.id}
																{...(clickable
																	? {
																			type: 'button' as const,
																			onClick: handleClick,
																		}
																	: {})}
																className={`grid w-full grid-cols-[1fr_auto] items-baseline gap-3 px-4 py-2.5 text-start outline-none transition-colors ${
																	clickable
																		? 'cursor-pointer hover:bg-[var(--color-primary)]/[0.04] focus-visible:bg-[var(--color-primary)]/[0.06]'
																		: ''
																}`}
																style={{
																	borderBottom: '1px solid var(--color-border)',
																	borderBottomStyle: 'solid',
																}}
															>
																<div className="min-w-0">
																	<p
																		className="truncate font-[family-name:var(--font-archivo)]"
																		style={{
																			fontSize: '13px',
																			fontWeight: 500,
																			color: 'var(--color-text)',
																			letterSpacing: '-0.005em',
																		}}
																	>
																		{rfq.customerName}
																	</p>
																	<p
																		className="mt-0.5 flex items-baseline gap-1.5 font-[family-name:var(--font-archivo)] italic"
																		style={{
																			fontSize: '10px',
																			color: 'var(--color-text-subtle)',
																		}}
																	>
																		<span className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums">
																			{rfq.lineItemCount}{' '}
																			{rfq.lineItemCount === 1
																				? 'item'
																				: 'items'}
																		</span>
																		<span aria-hidden="true">·</span>
																		<span className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums">
																			{timeLabel}
																		</span>
																	</p>
																</div>
																{action && (
																	<span
																		className="shrink-0 font-[family-name:var(--font-archivo)] italic"
																		style={{
																			fontSize: '11px',
																			color:
																				key === 'saved'
																					? 'var(--color-primary)'
																					: 'var(--color-text-muted)',
																		}}
																	>
																		{action}
																	</span>
																)}
															</Row>
														)
													})}
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</li>
							)
						})}
					</ol>
				</nav>

				<div className="flex-1" />

				{/* Pipeline strip — active quotes inline; becomes a return-action
				    when working on a saved order, italic empty-state when idle. */}
				{workingSavedOrder ? (
					<button
						type="button"
						onClick={handleReturnToPipeline}
						className="group relative inline-flex shrink-0 items-baseline gap-1.5 font-[family-name:var(--font-archivo)] italic outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-signal-red)]/40 rounded-sm"
						style={{
							fontSize: '12px',
							color: 'var(--color-signal-red)',
						}}
					>
						<span
							aria-hidden="true"
							className="transition-transform group-hover:-translate-x-[3px]"
							style={{
								fontFamily: 'var(--font-literata)',
								fontStyle: 'italic',
								fontSize: '14px',
								lineHeight: 1,
							}}
						>
							←
						</span>
						<span className="relative">
							return to queue
							<span
								aria-hidden="true"
								className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
							/>
						</span>
					</button>
				) : pipeline.length === 0 ? (
					<span
						className="shrink-0 font-[family-name:var(--font-archivo)] italic"
						style={{
							fontSize: '11px',
							color: 'var(--color-text-subtle)',
						}}
					>
						queue is empty
					</span>
				) : (
					<div
						className="relative shrink-0 overflow-hidden"
						style={{ width: '320px' }}
					>
						{/* Leading gradient — quiet start to the running log */}
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-y-0 start-0 z-10 w-6"
							style={{
								background:
									'linear-gradient(to left, transparent, var(--color-surface) 80%)',
							}}
						/>
						{/* Trailing gradient — fades entries past the viewport */}
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16"
							style={{
								background:
									'linear-gradient(to right, transparent, var(--color-surface) 80%)',
							}}
						/>
						<ol className="flex items-stretch">
							{[...pipeline]
								.sort((a, b) =>
									a.id === editingRfqId ? -1 : b.id === editingRfqId ? 1 : 0,
								)
								.map((rfq) => {
									const isActive = rfq.id === editingRfqId
									const age = Math.floor(
										(Date.now() - new Date(rfq.createdAt).getTime()) /
											3_600_000,
									)
									const timeLabel =
										age < 1
											? 'now'
											: age < 24
												? `${age}h`
												: `${Math.floor(age / 24)}d`
									return (
										<li
											key={rfq.id}
											className="relative shrink-0 px-4 py-1 text-start"
											style={{ width: '160px' }}
										>
											{/* Ledger tick — a brand-blue dot on the leading
											    edge of today's current entry. Only one ever lit. */}
											{isActive && (
												<span
													aria-hidden="true"
													className="absolute start-1 top-[11px] h-[5px] w-[5px] rounded-full"
													style={{ background: 'var(--color-primary)' }}
												/>
											)}
											<div
												className="truncate font-[family-name:var(--font-archivo)] transition-colors"
												style={{
													fontSize: '12.5px',
													fontWeight: isActive ? 600 : 400,
													fontStyle: isActive ? 'normal' : 'italic',
													color: isActive
														? 'var(--color-text)'
														: 'var(--color-text-muted)',
													letterSpacing: '-0.005em',
												}}
											>
												{rfq.customerName}
											</div>
											<div className="mt-0.5 flex items-baseline gap-1.5">
												<span
													className="font-[family-name:var(--font-plex-mono)] tabular-nums"
													style={{
														fontSize: '10px',
														color: 'var(--color-text-subtle)',
														letterSpacing: '0.04em',
													}}
												>
													{timeLabel}
												</span>
												<span
													aria-hidden="true"
													style={{
														fontSize: '8px',
														color: 'var(--color-text-subtle)',
													}}
												>
													·
												</span>
												<span
													className="font-[family-name:var(--font-archivo)] italic"
													style={{
														fontSize: '10.5px',
														color: rfq.hasOutdatedPrices
															? 'var(--color-signal-amber)'
															: 'var(--color-text-subtle)',
													}}
												>
													{rfq.hasOutdatedPrices ? 'outdated' : 'updated'}
												</span>
											</div>
											{/* Active underline — a ledger stroke beneath
											    today's row. */}
											{isActive && (
												<span
													aria-hidden="true"
													className="absolute inset-x-4 -bottom-[11px] h-[2px] rounded-[1px]"
													style={{ background: 'var(--color-primary)' }}
												/>
											)}
										</li>
									)
								})}
						</ol>
					</div>
				)}
			</div>

			{/* ── Quote builder ────────────────────────────────────── */}
			<div
				className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
				data-module-content
			>
				<AnimatePresence mode="wait">
					{newQuoteCustomer ? (
						<motion.div
							key={`new-${newQuoteCustomer.id}`}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1, transition: QUOTE_ENTER }}
							exit={{ opacity: 0 }}
							className="h-full"
						>
							<QuoteBuilderView
								rfqId={`new-${newQuoteCustomer.id}`}
								isNewCustomer={isNew}
								initialCustomerName={newQuoteCustomer.name}
								onBack={() => setNewQuoteCustomer(null)}
								onSave={handleSaveRequest}
							/>
						</motion.div>
					) : editingRfqId ? (
						<motion.div
							key={editingRfqId}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1, transition: QUOTE_ENTER }}
							exit={{ opacity: 0 }}
							className="h-full"
						>
							<QuoteBuilderView
								rfqId={editingRfqId}
								onBack={handleActionComplete}
								onSave={handleSaveRequest}
							/>
						</motion.div>
					) : (
						<div className="flex items-center justify-center h-full">
							<div className="flex max-w-[380px] flex-col items-center text-center">
								<span
									className="font-[family-name:var(--font-plex-mono)] font-semibold uppercase"
									style={{
										fontSize: '10px',
										letterSpacing: '0.22em',
										color: 'var(--color-text-subtle)',
									}}
								>
									The daybook
								</span>
								<p
									className="mt-4 font-[family-name:var(--font-literata)] italic"
									style={{
										fontSize: '26px',
										fontWeight: 500,
										letterSpacing: '-0.018em',
										color: 'var(--color-text)',
									}}
								>
									the queue is quiet today.
								</p>
								<p
									className="mt-3 font-[family-name:var(--font-archivo)] italic"
									style={{
										fontSize: '12.5px',
										lineHeight: 1.5,
										color: 'var(--color-text-subtle)',
									}}
								>
									every submitted quote is already in hand. try the saved or
									evaluated columns above for what's pending your return.
								</p>
							</div>
						</div>
					)}
				</AnimatePresence>
			</div>

			{/* ── Save timer dialog ────────────────────────────────── */}
			<DispatchDialog
				isOpen={saveTimerOpen}
				onClose={() => {
					setSaveTimerOpen(false)
					setSavingRfqId(null)
				}}
				size="sm"
				eyebrow="Daybook · Save this entry"
				title="Come back when?"
				caption="This quote returns to the running queue when time is up."
			>
				<DispatchBody>
					<ul className="divide-y divide-black/[0.08] dark:divide-white/[0.1]">
						{SAVE_DURATIONS.map(({ label, minutes }) => (
							<li key={minutes}>
								<button
									type="button"
									onClick={() => handleSaveConfirm(minutes)}
									className="group flex w-full items-baseline justify-between px-1 py-3 text-start transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
								>
									<span className="flex items-baseline gap-2">
										<span
											className="font-[family-name:var(--font-literata)] italic"
											style={{
												fontSize: '15px',
												fontWeight: 500,
												color: 'var(--color-text)',
												letterSpacing: '-0.012em',
											}}
										>
											in {label.toLowerCase()}
										</span>
									</span>
									<span
										className="inline-flex items-baseline gap-1.5 font-[family-name:var(--font-archivo)] italic transition-colors group-hover:text-[var(--color-primary)]"
										style={{
											fontSize: '11.5px',
											color: 'var(--color-text-subtle)',
										}}
									>
										<span>save</span>
										<span
											aria-hidden="true"
											className="transition-transform group-hover:translate-x-[3px]"
											style={{
												fontStyle: 'italic',
												color: 'var(--color-primary)',
											}}
										>
											→
										</span>
									</span>
								</button>
							</li>
						))}
					</ul>
				</DispatchBody>
				<DispatchFooter>
					<DispatchAction
						tone="ghost"
						onPress={() => {
							setSaveTimerOpen(false)
							setSavingRfqId(null)
						}}
					>
						Cancel
					</DispatchAction>
				</DispatchFooter>
			</DispatchDialog>

			{/* ── Report viewer for evaluated/rejected ─────────────── */}
			<ReportViewerModal
				rfqId={reportRfqId}
				onClose={() => setReportRfqId(null)}
			/>

			{/* ── Customer select modal ────────────────────────────── */}
			<SearchMenu
				isOpen={customerSelectOpen}
				onClose={() => setCustomerSelectOpen(false)}
				placeholder="Search customers or enter new..."
				onEnter={(search) => {
					const q = search.toLowerCase().trim()
					if (!q) return
					const match =
						customers.find((c) => c.name.toLowerCase() === q) ??
						customers.find((c) => c.name.toLowerCase().includes(q))
					if (match) {
						setCustomerSelectOpen(false)
						setNewQuoteCustomer(match)
					} else {
						setCustomerSelectOpen(false)
						setNewQuoteCustomer({
							id: `new-${Date.now()}`,
							name: search.trim(),
						})
					}
				}}
			>
				{(search) => {
					const q = search.toLowerCase()
					const filtered = q
						? customers.filter((c) => c.name.toLowerCase().includes(q))
						: customers
					return (
						<div className="flex flex-col py-1">
							{filtered.map((customer) => (
								<button
									key={customer.id}
									type="button"
									onClick={() => {
										setCustomerSelectOpen(false)
										setNewQuoteCustomer(customer)
									}}
									className="group flex w-full items-baseline gap-3 px-4 py-2.5 text-left outline-none transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
								>
									<div className="min-w-0 flex-1">
										<div
											className="truncate font-[family-name:var(--font-literata)] italic transition-colors group-hover:text-[var(--color-primary)]"
											style={{
												fontSize: '14.5px',
												fontWeight: 500,
												color: 'var(--color-text)',
												letterSpacing: '-0.01em',
											}}
										>
											{customer.name}
										</div>
										{customer.address && (
											<p
												className="mt-0.5 truncate font-[family-name:var(--font-archivo)] italic"
												style={{
													fontSize: '10.5px',
													color: 'var(--color-text-subtle)',
												}}
											>
												{customer.address}
											</p>
										)}
									</div>
									<span
										className="shrink-0 font-[family-name:var(--font-plex-mono)] uppercase tabular-nums"
										style={{
											fontSize: '10px',
											letterSpacing: '0.14em',
											color: 'var(--color-text-subtle)',
										}}
									>
										tier {customer.tier}
									</span>
								</button>
							))}
							{search.trim() &&
								!filtered.some((c) => c.name.toLowerCase() === q) && (
									<>
										<div className="mx-4 my-1 border-t border-black/[0.04] dark:border-white/[0.04]" />
										<button
											type="button"
											onClick={() => {
												setCustomerSelectOpen(false)
												setNewQuoteCustomer({
													id: `new-${Date.now()}`,
													name: search.trim(),
												})
											}}
											className="group flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left outline-none transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
										>
											<div className="min-w-0">
												<div
													className="truncate font-[family-name:var(--font-literata)] italic"
													style={{
														fontSize: '14.5px',
														fontWeight: 500,
														color: 'var(--color-primary)',
														letterSpacing: '-0.01em',
													}}
												>
													open a new ledger for {search.trim()}
												</div>
												<p
													className="mt-0.5 font-[family-name:var(--font-archivo)] italic"
													style={{
														fontSize: '10.5px',
														color: 'var(--color-text-subtle)',
													}}
												>
													a fresh entry in today's daybook
												</p>
											</div>
											<span
												aria-hidden="true"
												className="shrink-0 transition-transform group-hover:translate-x-[3px]"
												style={{
													fontFamily: 'var(--font-literata)',
													fontStyle: 'italic',
													fontSize: '16px',
													color: 'var(--color-primary)',
												}}
											>
												+
											</span>
										</button>
									</>
								)}
							{filtered.length === 0 && !search.trim() && (
								<div className="flex items-center justify-center py-12">
									<p
										className="font-[family-name:var(--font-literata)] italic"
										style={{
											fontSize: '14px',
											color: 'var(--color-text-subtle)',
										}}
									>
										no customer names on file yet.
									</p>
								</div>
							)}
						</div>
					)
				}}
			</SearchMenu>
		</div>
	)
}
