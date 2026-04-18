import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Button } from 'react-aria-components'
import {
	cancelDealFromFinance,
	cancelOrderFromFinance,
	type FinanceDealView,
	type FinanceOrderView,
	getFinanceInbox,
	recordDealFullPayment,
	recordDealPartialPayment,
	recordOrderFullPayment,
	recordOrderPartialPayment,
} from '../../lib/server/finance'
import { SlidePanel } from '../shared/SlidePanel'

interface FinancePaymentPanelProps {
	isOpen: boolean
	orderId: string | null
	dealId: string | null
	onClose: () => void
}

function formatEgp(n: number): string {
	return Math.round(n).toLocaleString('en-EG')
}

type Mode = 'order' | 'deal'
type Stage = 'preview' | 'confirm' | 'cancel'

export function FinancePaymentPanel({
	isOpen,
	orderId,
	dealId,
	onClose,
}: FinancePaymentPanelProps) {
	const queryClient = useQueryClient()
	const { data } = useQuery({
		queryKey: ['finance-inbox'],
		queryFn: () => getFinanceInbox({ data: {} }),
		staleTime: 30_000,
	})

	const mode: Mode | null = orderId ? 'order' : dealId ? 'deal' : null

	const order: FinanceOrderView | null = useMemo(() => {
		if (!orderId || !data) return null
		return data.customerOrders.find((o) => o.quoteId === orderId) ?? null
	}, [orderId, data])
	const deal: FinanceDealView | null = useMemo(() => {
		if (!dealId || !data) return null
		return data.supplierDeals.find((d) => d.dealId === dealId) ?? null
	}, [dealId, data])

	const row = order ?? deal
	const paymentStatus = row?.paymentStatus ?? 'paid'
	const isTerminal = paymentStatus === 'paid'

	const [payMode, setPayMode] = useState<'partial' | 'full'>('partial')

	const nextTransition: 'partial' | 'paid' | null = isTerminal
		? null
		: paymentStatus === 'partial'
			? 'paid'
			: payMode === 'full'
				? 'paid'
				: 'partial'

	const totalDue = row?.totalDue ?? 0
	const remainingDue = row?.remainingDue ?? 0
	const amountThisStep =
		paymentStatus === 'unpaid' && payMode === 'partial'
			? Math.round(totalDue * 0.5 * 100) / 100
			: paymentStatus === 'unpaid' && payMode === 'full'
				? totalDue
				: nextTransition === 'paid'
					? remainingDue
					: 0

	const [stage, setStage] = useState<Stage>('preview')
	const [proofFilename, setProofFilename] = useState('')
	const [cancelReason, setCancelReason] = useState('')
	const [cancelNote, setCancelNote] = useState('')
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!isOpen) return
		setStage('preview')
		setProofFilename('')
		setCancelReason('')
		setCancelNote('')
		setError(null)
		setPayMode('partial')
	}, [isOpen])

	const mutation = useMutation({
		mutationFn: async () => {
			if (!mode || !nextTransition) throw new Error('nothing to record')
			if (!proofFilename.trim()) throw new Error('proof of payment required')
			if (mode === 'order' && orderId) {
				const fn =
					nextTransition === 'partial'
						? recordOrderPartialPayment
						: recordOrderFullPayment
				return fn({
					data: { quoteId: orderId, proofUrl: proofFilename.trim() },
				})
			}
			if (mode === 'deal' && dealId) {
				const fn =
					nextTransition === 'partial'
						? recordDealPartialPayment
						: recordDealFullPayment
				return fn({ data: { dealId: dealId, proofUrl: proofFilename.trim() } })
			}
			throw new Error('invalid target')
		},
		onSuccess: (res) => {
			if (!res.success) {
				setError(res.error)
				return
			}
			queryClient.invalidateQueries({ queryKey: ['finance-inbox'] })
			queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
			queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
			queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] })
			onClose()
		},
		onError: (e: Error) => setError(e.message),
	})

	const cancelMutation = useMutation({
		mutationFn: async () => {
			if (!mode) throw new Error('nothing to cancel')
			if (!cancelReason.trim() || cancelReason.trim().length < 3) {
				throw new Error('reason is required (min 3 characters)')
			}
			if (mode === 'order' && orderId) {
				return cancelOrderFromFinance({
					data: {
						quoteId: orderId,
						reason: cancelReason.trim(),
						note: cancelNote.trim() || undefined,
					},
				})
			}
			if (mode === 'deal' && dealId) {
				return cancelDealFromFinance({
					data: {
						dealId: dealId,
						reason: cancelReason.trim(),
						note: cancelNote.trim() || undefined,
					},
				})
			}
			throw new Error('invalid target')
		},
		onSuccess: (res) => {
			if (!res.success) {
				setError(res.error)
				return
			}
			queryClient.invalidateQueries({ queryKey: ['finance-inbox'] })
			queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
			queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
			queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] })
			onClose()
		},
		onError: (e: Error) => setError(e.message),
	})

	const proofOk = proofFilename.trim().length > 0
	const cancelReasonOk = cancelReason.trim().length >= 3

	const handleAdvance = () => {
		if (stage === 'preview') {
			if (!proofOk) return
			setStage('confirm')
			return
		}
		if (stage === 'confirm') {
			mutation.mutate()
		}
	}

	return (
		<SlidePanel
			isOpen={isOpen}
			onClose={onClose}
			scope="finance"
			maxWidth={560}
			panelKey="finance-payment-panel"
			ariaLabel="Finance payment recorder"
		>
			<div className="ledger-theme flex h-full flex-col bg-[var(--color-surface)] text-[var(--color-text)]">
				{row ? (
					<>
						<PanelMasthead
							mode={mode}
							name={
								mode === 'order'
									? (order?.customerName ?? '')
									: (deal?.supplierName ?? '')
							}
							reference={
								mode === 'order'
									? `${order?.quoteNumber}${order?.customerPoNumber ? ` · ${order.customerPoNumber}` : ''}`
									: `${deal?.dealId} · ${deal?.itemCount ?? 0} item${
											(deal?.itemCount ?? 0) !== 1 ? 's' : ''
										}`
							}
						/>

						<div className="flex-1 overflow-y-auto px-8 pb-6">
							<TotalsLine
								totalDue={totalDue}
								paid={row.amountPaid}
								remaining={remainingDue}
							/>

							{mode === 'deal' && deal && deal.items.length > 0 && (
								<DealItemList items={deal.items} />
							)}

							{isTerminal ? (
								<SettledBanner
									paidAt={row.fullPaidAt}
									proof={row.fullProofUrl}
								/>
							) : (
								<>
									{paymentStatus === 'unpaid' && stage === 'preview' && (
										<PayModePicker
											payMode={payMode}
											onChange={setPayMode}
											totalDue={totalDue}
										/>
									)}

									{stage === 'preview' && (
										<AmountDisplay
											amount={amountThisStep}
											caption={
												paymentStatus === 'unpaid' && payMode === 'full'
													? 'full settlement — the order skips the partial stage.'
													: paymentStatus === 'unpaid' && payMode === 'partial'
														? 'fixed 50% split. the rest chases after delivery.'
														: 'remaining 50% — this entry closes on commit.'
											}
										/>
									)}
								</>
							)}

							{paymentStatus === 'partial' && row.partialProofUrl && (
								<PreviousPartial
									amountPaid={row.amountPaid}
									partialPaidAt={row.partialPaidAt}
									proof={row.partialProofUrl}
								/>
							)}

							{!isTerminal && stage === 'preview' && (
								<ProofInput value={proofFilename} onChange={setProofFilename} />
							)}

							{!isTerminal && stage === 'cancel' && (
								<CancelForm
									mode={mode}
									reason={cancelReason}
									setReason={setCancelReason}
									note={cancelNote}
									setNote={setCancelNote}
								/>
							)}

							{!isTerminal && stage === 'confirm' && (
								<ConfirmReview
									amount={amountThisStep}
									nextTransition={nextTransition}
									proof={proofFilename.trim()}
								/>
							)}

							{error && (
								<p
									className="mt-5 border-l-2 pl-3 font-[family-name:var(--font-bricolage)] italic"
									style={{
										fontSize: '12.5px',
										color: 'var(--ledger-out)',
										borderColor: 'var(--ledger-out)',
										lineHeight: 1.5,
									}}
								>
									{error}
								</p>
							)}
						</div>

						{!isTerminal && (
							<PanelFooter
								stage={stage}
								mode={mode}
								proofOk={proofOk}
								cancelReasonOk={cancelReasonOk}
								isPending={mutation.isPending}
								isCancelling={cancelMutation.isPending}
								amountThisStep={amountThisStep}
								onAdvance={handleAdvance}
								onStartCancel={() => {
									setStage('cancel')
									setError(null)
								}}
								onBack={() => {
									setStage('preview')
									setError(null)
								}}
								onCommitCancel={() => cancelMutation.mutate()}
							/>
						)}
					</>
				) : (
					<div className="flex h-full items-center justify-center">
						<p
							className="font-[family-name:var(--font-bricolage)] italic text-[var(--color-text-subtle)]"
							style={{ fontSize: '13px' }}
						>
							loading…
						</p>
					</div>
				)}
			</div>
		</SlidePanel>
	)
}

// ─── Masthead ────────────────────────────────────────────

function PanelMasthead({
	mode,
	name,
	reference,
}: {
	mode: Mode | null
	name: string
	reference: string
}) {
	return (
		<header className="shrink-0 border-b border-[var(--color-border)] px-8 pt-7 pb-5">
			<div className="flex items-baseline gap-2">
				<span
					className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
					style={{
						fontSize: '9.5px',
						letterSpacing: '0.22em',
						color: 'var(--color-primary)',
					}}
				>
					Ledger entry
				</span>
				<span
					className="font-[family-name:var(--font-bricolage)] italic"
					style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
				>
					· {mode === 'order' ? 'money in · customer' : 'money out · supplier'}
				</span>
			</div>
			<h2
				className="mt-2 truncate font-[family-name:var(--font-bricolage)]"
				style={{
					fontSize: '22px',
					fontWeight: 600,
					letterSpacing: '-0.015em',
					color: 'var(--color-text)',
				}}
			>
				{name}
			</h2>
			<p
				className="mt-1 truncate font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
				style={{
					fontSize: '10.5px',
					color: 'var(--color-text-subtle)',
					letterSpacing: '0.06em',
				}}
			>
				{reference}
			</p>
		</header>
	)
}

// ─── Totals line ─────────────────────────────────────────

function TotalsLine({
	totalDue,
	paid,
	remaining,
}: {
	totalDue: number
	paid: number
	remaining: number
}) {
	return (
		<dl className="mt-6 grid grid-cols-3 gap-6 border-b border-[var(--color-border)] pb-5">
			<TotalCell label="total due" value={totalDue} tone="neutral" />
			<TotalCell label="paid" value={paid} tone="in" />
			<TotalCell label="remaining" value={remaining} tone="chase" />
		</dl>
	)
}

function TotalCell({
	label,
	value,
	tone,
}: {
	label: string
	value: number
	tone: 'neutral' | 'in' | 'chase'
}) {
	const color = {
		neutral: 'var(--color-text)',
		in: 'var(--ledger-in)',
		chase: 'var(--ledger-chase)',
	}[tone]
	return (
		<div className="flex flex-col">
			<dt
				className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
				style={{
					fontSize: '9px',
					letterSpacing: '0.2em',
					color: 'var(--color-text-subtle)',
				}}
			>
				{label}
			</dt>
			<dd
				className="mt-1 font-[family-name:var(--font-jetbrains-mono)] font-semibold tabular-nums"
				style={{
					fontSize: '15px',
					color: value > 0 ? color : 'var(--color-text-subtle)',
					letterSpacing: '-0.015em',
				}}
			>
				{formatEgp(value)}
				<span
					className="ms-1 font-[family-name:var(--font-jetbrains-mono)] uppercase"
					style={{
						fontSize: '9px',
						fontWeight: 400,
						color: 'var(--color-text-subtle)',
						letterSpacing: '0.14em',
					}}
				>
					EGP
				</span>
			</dd>
		</div>
	)
}

// ─── Deal items ──────────────────────────────────────────

function DealItemList({
	items,
}: {
	items: Array<{
		productSlug: string
		productName: string
		sku: string
		unit: string
		agreedQty: number
		agreedRawCost: number
		lineTotal: number
	}>
}) {
	return (
		<section className="mt-6 border-b border-[var(--color-border)] pb-5">
			<span
				className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
				style={{
					fontSize: '9.5px',
					letterSpacing: '0.22em',
					color: 'var(--color-text-subtle)',
				}}
			>
				Order lines · {items.length}
			</span>
			<ul className="mt-3 flex flex-col">
				{items.map((it, i) => (
					<li
						key={it.productSlug}
						className="flex items-baseline justify-between gap-4 border-t border-[var(--color-border)] py-2 first:border-t-0 first:pt-0"
					>
						<div className="min-w-0 flex-1">
							<p
								className="truncate font-[family-name:var(--font-bricolage)]"
								style={{
									fontSize: '13px',
									fontWeight: 500,
									color: 'var(--color-text)',
									letterSpacing: '-0.008em',
								}}
							>
								<span
									className="me-2 font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
									style={{
										fontSize: '10.5px',
										color: 'var(--color-text-subtle)',
										letterSpacing: '0.04em',
									}}
								>
									{(i + 1).toString().padStart(2, '0')}
								</span>
								{it.productName}
							</p>
							<p
								className="mt-0.5 truncate font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
								style={{
									fontSize: '10px',
									color: 'var(--color-text-subtle)',
									letterSpacing: '0.04em',
								}}
							>
								{it.sku} · {it.agreedQty} {it.unit} ×{' '}
								{formatEgp(it.agreedRawCost)}
							</p>
						</div>
						<span
							className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] font-semibold tabular-nums"
							style={{
								fontSize: '13px',
								color: 'var(--color-text)',
								letterSpacing: '-0.012em',
							}}
						>
							{formatEgp(it.lineTotal)}
						</span>
					</li>
				))}
			</ul>
		</section>
	)
}

// ─── Settled banner ──────────────────────────────────────

function SettledBanner({
	paidAt,
	proof,
}: {
	paidAt: string | null
	proof: string | null
}) {
	return (
		<div
			className="mt-6 border-y-2 py-4"
			style={{ borderColor: 'var(--ledger-in)' }}
		>
			<div
				className="flex items-baseline gap-2 font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
				style={{
					fontSize: '11px',
					letterSpacing: '0.22em',
					color: 'var(--ledger-in)',
				}}
			>
				✓ settled in full
			</div>
			{paidAt && (
				<p
					className="mt-2 font-[family-name:var(--font-bricolage)] italic"
					style={{
						fontSize: '11.5px',
						color: 'var(--color-text-muted)',
					}}
				>
					paid {new Date(paidAt).toLocaleString('en-EG')}
				</p>
			)}
			{proof && (
				<p
					className="mt-0.5 truncate font-[family-name:var(--font-jetbrains-mono)]"
					style={{
						fontSize: '10.5px',
						color: 'var(--color-text-subtle)',
						letterSpacing: '0.02em',
					}}
				>
					proof · {proof}
				</p>
			)}
		</div>
	)
}

// ─── Pay-mode picker ─────────────────────────────────────

function PayModePicker({
	payMode,
	onChange,
	totalDue,
}: {
	payMode: 'partial' | 'full'
	onChange: (m: 'partial' | 'full') => void
	totalDue: number
}) {
	const entries: {
		id: 'partial' | 'full'
		label: string
		amount: number
		hint: string
	}[] = [
		{
			id: 'partial',
			label: 'partial · 50%',
			amount: Math.round(totalDue * 0.5 * 100) / 100,
			hint: 'collect now, chase the rest later',
		},
		{
			id: 'full',
			label: 'full · 100%',
			amount: totalDue,
			hint: 'settle in one shot',
		},
	]

	return (
		<div className="mt-6 flex flex-col gap-1">
			{entries.map((entry) => {
				const isActive = payMode === entry.id
				return (
					<button
						key={entry.id}
						type="button"
						onClick={() => onChange(entry.id)}
						className="group flex items-baseline justify-between gap-4 border-t border-[var(--color-border)] py-3 text-start outline-none first:border-t-0"
					>
						<div className="flex items-baseline gap-2">
							<span
								aria-hidden="true"
								className="h-[7px] w-[7px] shrink-0 self-center rounded-full transition-colors"
								style={{
									background: isActive
										? 'var(--color-primary)'
										: 'var(--color-text-subtle)',
									opacity: isActive ? 1 : 0.35,
								}}
							/>
							<span
								className="font-[family-name:var(--font-bricolage)] transition-colors"
								style={{
									fontSize: '13.5px',
									fontWeight: isActive ? 600 : 400,
									fontStyle: isActive ? 'normal' : 'italic',
									color: isActive
										? 'var(--color-text)'
										: 'var(--color-text-muted)',
									letterSpacing: '-0.008em',
								}}
							>
								{entry.label}
							</span>
							<span
								className="font-[family-name:var(--font-bricolage)] italic text-[var(--color-text-subtle)]"
								style={{ fontSize: '11px' }}
							>
								· {entry.hint}
							</span>
						</div>
						<span
							className="font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
							style={{
								fontSize: '13px',
								color: isActive
									? 'var(--color-text)'
									: 'var(--color-text-muted)',
								fontWeight: isActive ? 600 : 400,
								letterSpacing: '-0.012em',
							}}
						>
							{formatEgp(entry.amount)}
						</span>
					</button>
				)
			})}
		</div>
	)
}

// ─── Amount display ──────────────────────────────────────

function AmountDisplay({
	amount,
	caption,
}: {
	amount: number
	caption: string
}) {
	return (
		<div className="mt-6 border-y-2 border-[var(--color-primary)] py-5">
			<span
				className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
				style={{
					fontSize: '9.5px',
					letterSpacing: '0.22em',
					color: 'var(--color-primary)',
				}}
			>
				due now
			</span>
			<div className="mt-2 flex items-baseline gap-2">
				<span
					className="font-[family-name:var(--font-archivo-black)] tabular-nums leading-none"
					style={{
						fontSize: '40px',
						color: 'var(--color-text)',
						letterSpacing: '-0.028em',
					}}
				>
					{formatEgp(amount)}
				</span>
				<span
					className="font-[family-name:var(--font-jetbrains-mono)] uppercase"
					style={{
						fontSize: '11px',
						color: 'var(--color-text-subtle)',
						letterSpacing: '0.14em',
					}}
				>
					EGP
				</span>
			</div>
			<p
				className="mt-2 font-[family-name:var(--font-bricolage)] italic"
				style={{
					fontSize: '11.5px',
					color: 'var(--color-text-muted)',
					letterSpacing: '0.002em',
				}}
			>
				{caption}
			</p>
		</div>
	)
}

// ─── Previous partial ────────────────────────────────────

function PreviousPartial({
	amountPaid,
	partialPaidAt,
	proof,
}: {
	amountPaid: number
	partialPaidAt: string | null
	proof: string
}) {
	return (
		<div className="mt-4 border-l-2 border-[var(--color-border)] pl-3">
			<span
				className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
				style={{
					fontSize: '9.5px',
					letterSpacing: '0.22em',
					color: 'var(--color-text-subtle)',
				}}
			>
				previous partial
			</span>
			<p
				className="mt-1 font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
				style={{
					fontSize: '11.5px',
					color: 'var(--color-text-muted)',
					letterSpacing: '-0.004em',
				}}
			>
				{formatEgp(amountPaid)} EGP ·{' '}
				{partialPaidAt
					? new Date(partialPaidAt).toLocaleDateString('en-EG')
					: '—'}
			</p>
			<p
				className="mt-0.5 truncate font-[family-name:var(--font-jetbrains-mono)]"
				style={{
					fontSize: '10px',
					color: 'var(--color-text-subtle)',
					letterSpacing: '0.02em',
				}}
			>
				proof · {proof}
			</p>
		</div>
	)
}

// ─── Proof input ─────────────────────────────────────────

function ProofInput({
	value,
	onChange,
}: {
	value: string
	onChange: (v: string) => void
}) {
	return (
		<div className="mt-6">
			<label
				htmlFor="proof-filename"
				className="flex items-baseline gap-2 font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
				style={{
					fontSize: '9.5px',
					letterSpacing: '0.22em',
					color: 'var(--color-text-subtle)',
				}}
			>
				proof of payment
			</label>
			<input
				id="proof-filename"
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="e.g. nbe-transfer-2026-04-15.pdf"
				className="mt-2 w-full bg-transparent font-[family-name:var(--font-bricolage)] text-[var(--color-text)] outline-none placeholder:italic placeholder:text-[var(--color-text-subtle)]/50"
				style={{
					fontSize: '14px',
					borderBottom: '1px solid var(--color-border)',
					paddingBottom: '6px',
					letterSpacing: '-0.005em',
				}}
			/>
			<p
				className="mt-2 font-[family-name:var(--font-bricolage)] italic"
				style={{
					fontSize: '11px',
					color: 'var(--color-text-muted)',
					letterSpacing: '0.002em',
				}}
			>
				required. nothing commits without a reference file on the audit trail.
			</p>
		</div>
	)
}

// ─── Cancel form ─────────────────────────────────────────

function CancelForm({
	mode,
	reason,
	setReason,
	note,
	setNote,
}: {
	mode: Mode | null
	reason: string
	setReason: (s: string) => void
	note: string
	setNote: (s: string) => void
}) {
	return (
		<div
			className="mt-6 border-y-2 py-4"
			style={{ borderColor: 'var(--ledger-out)' }}
		>
			<span
				className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
				style={{
					fontSize: '9.5px',
					letterSpacing: '0.22em',
					color: 'var(--ledger-out)',
				}}
			>
				cancel {mode === 'order' ? 'order' : 'deal'}
			</span>
			<p
				className="mt-2 font-[family-name:var(--font-bricolage)] italic"
				style={{
					fontSize: '12px',
					color: 'var(--color-text-muted)',
					lineHeight: 1.45,
					letterSpacing: '0.002em',
				}}
			>
				walks the record to <em>declined</em>, stamps the report, and releases
				reserved stock. irreversible.
			</p>
			<div className="mt-4">
				<label
					htmlFor="cancel-reason"
					className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
					style={{
						fontSize: '9.5px',
						letterSpacing: '0.22em',
						color: 'var(--color-text-subtle)',
					}}
				>
					reason
				</label>
				<input
					id="cancel-reason"
					type="text"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder="e.g. customer withdrew, duplicate order"
					className="mt-1.5 w-full bg-transparent font-[family-name:var(--font-bricolage)] text-[var(--color-text)] outline-none placeholder:italic placeholder:text-[var(--color-text-subtle)]/50"
					style={{
						fontSize: '13.5px',
						borderBottom: '1px solid var(--color-border)',
						paddingBottom: '5px',
					}}
				/>
			</div>
			<div className="mt-4">
				<label
					htmlFor="cancel-note"
					className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
					style={{
						fontSize: '9.5px',
						letterSpacing: '0.22em',
						color: 'var(--color-text-subtle)',
					}}
				>
					note · optional
				</label>
				<input
					id="cancel-note"
					type="text"
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="additional context for the audit trail"
					className="mt-1.5 w-full bg-transparent font-[family-name:var(--font-bricolage)] text-[var(--color-text)] outline-none placeholder:italic placeholder:text-[var(--color-text-subtle)]/50"
					style={{
						fontSize: '13.5px',
						borderBottom: '1px solid var(--color-border)',
						paddingBottom: '5px',
					}}
				/>
			</div>
		</div>
	)
}

// ─── Confirm review ──────────────────────────────────────

function ConfirmReview({
	amount,
	nextTransition,
	proof,
}: {
	amount: number
	nextTransition: 'partial' | 'paid' | null
	proof: string
}) {
	return (
		<div className="mt-6 border-y-2 border-[var(--color-primary)] py-4">
			<span
				className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
				style={{
					fontSize: '9.5px',
					letterSpacing: '0.22em',
					color: 'var(--color-primary)',
				}}
			>
				review & commit
			</span>
			<dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-5 gap-y-2">
				<dt
					className="font-[family-name:var(--font-bricolage)] italic"
					style={{
						fontSize: '11.5px',
						color: 'var(--color-text-subtle)',
					}}
				>
					amount
				</dt>
				<dd
					className="font-[family-name:var(--font-jetbrains-mono)] font-semibold tabular-nums"
					style={{
						fontSize: '13px',
						color: 'var(--color-text)',
						letterSpacing: '-0.012em',
					}}
				>
					{formatEgp(amount)} EGP
				</dd>
				<dt
					className="font-[family-name:var(--font-bricolage)] italic"
					style={{
						fontSize: '11.5px',
						color: 'var(--color-text-subtle)',
					}}
				>
					moves to
				</dt>
				<dd
					className="font-[family-name:var(--font-bricolage)]"
					style={{
						fontSize: '13px',
						fontWeight: 600,
						color: 'var(--color-text)',
						letterSpacing: '-0.008em',
					}}
				>
					{nextTransition}
				</dd>
				<dt
					className="font-[family-name:var(--font-bricolage)] italic"
					style={{
						fontSize: '11.5px',
						color: 'var(--color-text-subtle)',
					}}
				>
					proof
				</dt>
				<dd
					className="truncate font-[family-name:var(--font-jetbrains-mono)]"
					style={{
						fontSize: '11.5px',
						color: 'var(--color-text)',
						letterSpacing: '0.02em',
					}}
				>
					{proof}
				</dd>
			</dl>
			<p
				className="mt-3 font-[family-name:var(--font-bricolage)] italic"
				style={{
					fontSize: '11px',
					color: 'var(--color-text-muted)',
					letterSpacing: '0.002em',
				}}
			>
				transitions can't be reversed. verify the amount and proof before
				committing.
			</p>
		</div>
	)
}

// ─── Footer ──────────────────────────────────────────────

function PanelFooter({
	stage,
	mode,
	proofOk,
	cancelReasonOk,
	isPending,
	isCancelling,
	amountThisStep,
	onAdvance,
	onStartCancel,
	onBack,
	onCommitCancel,
}: {
	stage: Stage
	mode: Mode | null
	proofOk: boolean
	cancelReasonOk: boolean
	isPending: boolean
	isCancelling: boolean
	amountThisStep: number
	onAdvance: () => void
	onStartCancel: () => void
	onBack: () => void
	onCommitCancel: () => void
}) {
	return (
		<footer className="shrink-0 border-t border-[var(--color-border)] px-8 py-4">
			{stage === 'cancel' ? (
				<div className="flex items-baseline justify-between gap-3">
					<Button
						onPress={onBack}
						className="font-[family-name:var(--font-bricolage)] italic text-[var(--color-text-muted)] outline-none hover:text-[var(--color-text)] data-[focus-visible]:underline"
						style={{ fontSize: '12.5px' }}
					>
						← back
					</Button>
					<Button
						onPress={onCommitCancel}
						isDisabled={!cancelReasonOk || isCancelling}
						className="group inline-flex items-baseline gap-1.5 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
					>
						<span
							className="font-[family-name:var(--font-bricolage)]"
							style={{
								fontSize: '13.5px',
								fontWeight: 500,
								color: 'var(--ledger-out)',
								letterSpacing: '-0.005em',
							}}
						>
							{isCancelling ? 'canceling…' : 'confirm cancel'}
						</span>
						<span
							aria-hidden="true"
							className="transition-transform group-hover:translate-x-[3px]"
							style={{
								fontFamily: 'var(--font-bricolage)',
								fontStyle: 'italic',
								fontSize: '14px',
								color: 'var(--ledger-out)',
							}}
						>
							→
						</span>
					</Button>
				</div>
			) : (
				<div className="flex items-baseline justify-between gap-3">
					{stage === 'preview' && (
						<Button
							onPress={onStartCancel}
							className="font-[family-name:var(--font-bricolage)] italic outline-none hover:underline data-[focus-visible]:underline"
							style={{ fontSize: '12px', color: 'var(--ledger-out)' }}
						>
							cancel {mode === 'order' ? 'order' : 'deal'}
						</Button>
					)}
					{stage === 'confirm' && (
						<Button
							onPress={onBack}
							className="font-[family-name:var(--font-bricolage)] italic text-[var(--color-text-muted)] outline-none hover:text-[var(--color-text)] data-[focus-visible]:underline"
							style={{ fontSize: '12.5px' }}
						>
							← back
						</Button>
					)}
					<Button
						onPress={onAdvance}
						isDisabled={!proofOk || isPending}
						className="group inline-flex items-baseline gap-2 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
					>
						<span
							className="font-[family-name:var(--font-bricolage)]"
							style={{
								fontSize: '14px',
								fontWeight: 600,
								color: 'var(--color-text)',
								letterSpacing: '-0.008em',
							}}
						>
							{isPending
								? 'recording…'
								: stage === 'preview'
									? 'review payment'
									: `commit ${formatEgp(amountThisStep)} EGP`}
						</span>
						<span
							aria-hidden="true"
							className="transition-transform group-hover:translate-x-[3px]"
							style={{
								fontFamily: 'var(--font-bricolage)',
								fontStyle: 'italic',
								fontSize: '15px',
								color: 'var(--color-primary)',
							}}
						>
							→
						</span>
					</Button>
				</div>
			)}
		</footer>
	)
}
