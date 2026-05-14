import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCustomerList } from '../../lib/server/sales-customers'
import { getRFQQueue, saveRFQForLater } from '../../lib/server/sales-rfq'
import { useSalesStore } from '../../stores/sales'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../shared/DispatchDialog'
import { EmployeeActionButton } from '../shared/EmployeeControls'
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
	const editingRfqId = useSalesStore((s) => s.editingRfqId)
	const setEditingRfqId = useSalesStore((s) => s.setEditingRfqId)
	const newQuoteCustomer = useSalesStore((s) => s.newQuoteCustomer)
	const setNewQuoteCustomer = useSalesStore((s) => s.setNewQuoteCustomer)
	const newQuoteRequestId = useSalesStore((s) => s.newQuoteRequestId)
	const statusDialogRequestId = useSalesStore((s) => s.statusDialogRequestId)
	const setActiveTab = useSalesStore((s) => s.setActiveTab)
	const [negotiatingQuoteId, setNegotiatingQuoteId] = useState<string | null>(
		null,
	)
	const [customerSelectOpen, setCustomerSelectOpen] = useState(false)
	const [statusDialogOpen, setStatusDialogOpen] = useState(false)

	// Floating windows
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
			setStatusDialogOpen(false)
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

	useEffect(() => {
		if (newQuoteRequestId > 0) setCustomerSelectOpen(true)
	}, [newQuoteRequestId])

	useEffect(() => {
		if (statusDialogRequestId > 0) setStatusDialogOpen(true)
	}, [statusDialogRequestId])

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

	const statusGroups = [
		{ key: 'submitted', label: 'submitted', items: pipeline },
		{ key: 'saved', label: 'saved', items: saved },
		{ key: 'evaluated', label: 'evaluated', items: evaluated },
		{ key: 'rejected', label: 'rejected', items: rejected },
	] as const
	const statusTotal =
		pipeline.length + saved.length + evaluated.length + rejected.length
	const isNew = !!newQuoteCustomer?.id.startsWith('new-')

	return (
		<div className="sales-theme sales-paper flex h-full flex-col">
			{workingSavedOrder && (
				<div
					className="flex shrink-0 items-center justify-end px-3 py-1.5 sm:px-5"
					style={{ borderBottom: '1px solid var(--color-border)' }}
				>
					<EmployeeActionButton
						type="button"
						onClick={handleReturnToPipeline}
						tone="neutral"
						size="sm"
						leading={<span aria-hidden="true">←</span>}
						className="shrink-0 max-sm:min-h-7 max-sm:px-2 max-sm:py-1 max-sm:text-[9px]"
					>
						Queue
					</EmployeeActionButton>
				</div>
			)}

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
										letterSpacing: '0',
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

			<SearchMenu
				isOpen={statusDialogOpen}
				onClose={() => setStatusDialogOpen(false)}
				placeholder="Search status..."
				resultStatus={`${statusTotal} order${statusTotal === 1 ? '' : 's'}`}
			>
				{(search) => {
					const query = search.toLowerCase().trim()
					return (
						<div className="divide-y divide-[var(--color-border)]">
							{statusGroups.map(({ key, label, items }) => {
								const filtered = query
									? items.filter((rfq) =>
											`${rfq.customerName} ${rfq.id}`
												.toLowerCase()
												.includes(query),
										)
									: items
								if (filtered.length === 0) return null
								return (
									<section key={key} aria-labelledby={`sales-status-${key}`}>
										<div className="sticky top-0 z-10 flex items-baseline justify-between bg-[var(--color-surface)] px-4 py-2">
											<h3
												id={`sales-status-${key}`}
												className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]"
											>
												{label}
											</h3>
											<span className="font-[family-name:var(--font-plex-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
												{filtered.length}
											</span>
										</div>
										<div>
											{filtered.map((rfq) => {
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
												const action =
													key === 'submitted'
														? 'open'
														: key === 'saved'
															? 'resume'
															: 'report'
												return (
													<button
														key={rfq.id}
														type="button"
														data-searchmenu-row="true"
														onClick={() => {
															if (key === 'submitted') {
																setStatusDialogOpen(false)
																setWorkingSavedOrder(false)
																setEditingRfqId(rfq.id)
															} else if (key === 'saved') {
																handleOpenSavedOrder(rfq.id)
															} else {
																setStatusDialogOpen(false)
																setReportRfqId(rfq.id)
															}
														}}
														className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-start outline-none transition-colors hover:bg-[var(--color-primary)]/[0.04] focus-visible:bg-[var(--color-primary)]/[0.06] data-[active=true]:bg-[var(--color-primary)]/[0.06]"
													>
														<span className="min-w-0">
															<span className="block truncate font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
																{rfq.customerName}
															</span>
															<span className="mt-0.5 flex items-baseline gap-1.5 font-[family-name:var(--font-archivo)] text-[10px] italic text-[var(--color-text-subtle)]">
																<span className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums">
																	{rfq.lineItemCount}{' '}
																	{rfq.lineItemCount === 1 ? 'item' : 'items'}
																</span>
																<span aria-hidden="true">·</span>
																<span className="font-[family-name:var(--font-plex-mono)] not-italic tabular-nums">
																	{timeLabel}
																</span>
																{rfq.hasOutdatedPrices && (
																	<>
																		<span aria-hidden="true">·</span>
																		<span className="text-[var(--color-signal-amber)]">
																			outdated
																		</span>
																	</>
																)}
															</span>
														</span>
														<span className="shrink-0 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
															{action}
														</span>
													</button>
												)
											})}
										</div>
									</section>
								)
							})}
						</div>
					)
				}}
			</SearchMenu>

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
					<ul className="grid gap-2">
						{SAVE_DURATIONS.map(({ label, minutes }) => (
							<li key={minutes}>
								<button
									type="button"
									onClick={() => handleSaveConfirm(minutes)}
									className="group flex min-h-14 w-full items-center justify-between gap-4 rounded-md border border-[var(--color-border)] px-3 py-2 text-start outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-primary)]/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
								>
									<span className="min-w-0">
										<span className="block font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
											Return in {label.toLowerCase()}
										</span>
										<span className="mt-0.5 block font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-text-subtle)]">
											Move this quote out of the live queue
										</span>
									</span>
									<span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-2 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-transform group-hover:translate-x-0.5">
										Save
										<span aria-hidden="true">→</span>
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
									data-searchmenu-row="true"
									onClick={() => {
										setCustomerSelectOpen(false)
										setNewQuoteCustomer(customer)
									}}
									className="group flex w-full flex-col gap-1 px-4 py-3 text-left outline-none transition-colors data-[active=true]:bg-[var(--color-primary)]/[0.06] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] lg:flex-row lg:items-baseline lg:gap-3"
								>
									<div className="min-w-0 flex-1">
										<div
											className="break-words font-[family-name:var(--font-literata)] italic transition-colors group-hover:text-[var(--color-primary)] lg:truncate"
											style={{
												fontSize: '14.5px',
												fontWeight: 500,
												color: 'var(--color-text)',
												letterSpacing: '0',
											}}
										>
											{customer.name}
										</div>
										{customer.address && (
											<p
												className="mt-0.5 break-words font-[family-name:var(--font-archivo)] italic lg:truncate"
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
											data-searchmenu-row="true"
											onClick={() => {
												setCustomerSelectOpen(false)
												setNewQuoteCustomer({
													id: `new-${Date.now()}`,
													name: search.trim(),
												})
											}}
											className="group flex w-full flex-col gap-3 px-4 py-3 text-left outline-none transition-colors data-[active=true]:bg-[var(--color-primary)]/[0.06] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] lg:flex-row lg:items-start lg:justify-between"
										>
											<div className="min-w-0">
												<div
													className="break-words font-[family-name:var(--font-literata)] italic lg:truncate"
													style={{
														fontSize: '14.5px',
														fontWeight: 500,
														color: 'var(--color-primary)',
														letterSpacing: '0',
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
