import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertTriangle,
	ArrowLeft,
	Ban,
	CheckCircle2,
	ReceiptText,
	X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
	INTERNAL_LIVE_REFETCH_MS,
	INTERNAL_LIVE_STALE_MS,
} from '../../lib/internal-live-query'
import {
	cancelDealFromFinance,
	cancelOrderFromFinance,
	type FinanceDealView,
	type FinanceFollowUpView,
	type FinanceOrderView,
	getFinanceInbox,
	recordDealFollowUp,
	recordDealFullPayment,
	recordDealPartialPayment,
	recordOrderFollowUp,
	recordOrderFullPayment,
	recordOrderPartialPayment,
} from '../../lib/server/finance'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { formatDecimalEgp } from '../shared/formatters'
import { SlidePanel } from '../shared/SlidePanel'

interface FinancePaymentPanelProps {
	isOpen: boolean
	orderId: string | null
	dealId: string | null
	onClose: () => void
}

type Mode = 'order' | 'deal'
type Stage = 'preview' | 'confirm' | 'cancel'
type FollowUpChannel = 'phone' | 'whatsapp' | 'email' | 'bank' | 'other'
type FollowUpState = 'open' | 'waiting' | 'closed'

const DEFAULT_FOLLOW_UP_STATE: FollowUpState = 'open'
const FOLLOW_UP_CHANNEL_OPTIONS: { id: FollowUpChannel; label: string }[] = [
	{ id: 'phone', label: 'Phone' },
	{ id: 'whatsapp', label: 'WhatsApp' },
	{ id: 'email', label: 'Email' },
	{ id: 'bank', label: 'Bank' },
	{ id: 'other', label: 'Other' },
]
const FOLLOW_UP_STATE_OPTIONS: { id: FollowUpState; label: string }[] = [
	{ id: 'open', label: 'Open' },
	{ id: 'waiting', label: 'Waiting' },
	{ id: 'closed', label: 'Closed' },
]

function defaultFollowUpDueAt(): string {
	const due = new Date()
	due.setDate(due.getDate() + 1)
	due.setHours(10, 0, 0, 0)
	return due.toISOString().slice(0, 16)
}

function parseFollowUpChannel(value: string): FollowUpChannel {
	return (
		FOLLOW_UP_CHANNEL_OPTIONS.find((entry) => entry.id === value)?.id ?? 'other'
	)
}

function parseFollowUpState(value: string): FollowUpState {
	return (
		FOLLOW_UP_STATE_OPTIONS.find((entry) => entry.id === value)?.id ?? 'open'
	)
}

function formatFollowUpDate(value: string): string {
	return new Date(value).toLocaleString('en-EG', {
		dateStyle: 'medium',
		timeStyle: 'short',
	})
}

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
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
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
	const [followUpChannel, setFollowUpChannel] =
		useState<FollowUpChannel>('phone')
	const [followUpOutcome, setFollowUpOutcome] = useState('')
	const [followUpNotes, setFollowUpNotes] = useState('')
	const [followUpState, setFollowUpState] = useState<FollowUpState>(
		DEFAULT_FOLLOW_UP_STATE,
	)
	const [followUpDueAt, setFollowUpDueAt] = useState(defaultFollowUpDueAt)
	const [followUpMessage, setFollowUpMessage] = useState<string | null>(null)
	const paymentNextStepRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		if (!isOpen) return
		setStage('preview')
		setProofFilename('')
		setCancelReason('')
		setCancelNote('')
		setError(null)
		setPayMode('partial')
		setFollowUpChannel('phone')
		setFollowUpOutcome('')
		setFollowUpNotes('')
		setFollowUpState(DEFAULT_FOLLOW_UP_STATE)
		setFollowUpDueAt(defaultFollowUpDueAt())
		setFollowUpMessage(null)
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

	const followUpMutation = useMutation({
		mutationFn: async () => {
			const payload = {
				contactChannel: followUpChannel,
				outcome: followUpOutcome.trim(),
				notes: followUpNotes.trim(),
				followUpState,
				followUpDueAt,
			}
			if (mode === 'order' && orderId) {
				return recordOrderFollowUp({ data: { ...payload, quoteId: orderId } })
			}
			if (mode === 'deal' && dealId) {
				return recordDealFollowUp({ data: { ...payload, dealId } })
			}
			throw new Error('invalid target')
		},
		onSuccess: (res) => {
			if (!res.success) {
				setError(res.error)
				return
			}
			queryClient.invalidateQueries({ queryKey: ['finance-inbox'] })
			setFollowUpOutcome('')
			setFollowUpNotes('')
			setFollowUpState(DEFAULT_FOLLOW_UP_STATE)
			setFollowUpDueAt(defaultFollowUpDueAt())
			setFollowUpMessage('Follow-up saved')
			setError(null)
		},
		onError: (e: Error) => setError(e.message),
	})

	const proofOk = proofFilename.trim().length > 0
	const cancelReasonOk = cancelReason.trim().length >= 3
	const followUpOk =
		followUpOutcome.trim().length >= 2 &&
		followUpNotes.trim().length >= 5 &&
		followUpDueAt.trim().length > 0
	const panelName =
		mode === 'order' ? (order?.customerName ?? '') : (deal?.supplierName ?? '')
	const panelReference =
		mode === 'order'
			? `${order?.quoteNumber}${order?.customerPoNumber ? ` · ${order.customerPoNumber}` : ''}`
			: `${deal?.dealId} · ${deal?.itemCount ?? 0} item${
					(deal?.itemCount ?? 0) !== 1 ? 's' : ''
				}`
	const panelContext =
		mode === 'order' ? 'Money in · customer' : 'Money out · supplier'

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
	const handlePayModeChange = (nextPayMode: 'partial' | 'full') => {
		setPayMode(nextPayMode)
		if (!window.matchMedia('(max-width: 1023px)').matches) return
		window.requestAnimationFrame(() => {
			const behavior = window.matchMedia('(prefers-reduced-motion: reduce)')
				.matches
				? 'auto'
				: 'smooth'
			paymentNextStepRef.current?.scrollIntoView({
				behavior,
				block: 'start',
			})
		})
	}

	return (
		<SlidePanel
			isOpen={isOpen}
			onClose={onClose}
			scope="finance"
			maxWidth={560}
			panelKey="finance-payment-panel"
			ariaLabel="Finance payment recorder"
			mobileTitle={row ? panelName : undefined}
			mobileSubtitle={row ? `${panelContext} · ${panelReference}` : undefined}
		>
			<div className="ledger-theme flex h-full flex-col bg-[var(--color-surface)] text-[var(--color-text)]">
				{row ? (
					<>
						<PanelMasthead
							mode={mode}
							name={panelName}
							reference={panelReference}
						/>

						<div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6 lg:px-8">
							<TotalsLine
								totalDue={totalDue}
								paid={row.amountPaid}
								remaining={remainingDue}
							/>

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
											onChange={handlePayModeChange}
											totalDue={totalDue}
										/>
									)}

									<div ref={paymentNextStepRef} />
									{stage === 'preview' && (
										<AmountDisplay
											amount={amountThisStep}
											caption={
												paymentStatus === 'unpaid' && payMode === 'full'
													? 'This closes the payment now.'
													: paymentStatus === 'unpaid' && payMode === 'partial'
														? 'This records the first 50% payment.'
														: 'This records the remaining balance and settles the entry.'
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
									recordedBy={row.partialRecordedByName}
								/>
							)}

							<LatestFollowUp followUp={row.latestFollowUp} />

							{!isTerminal && stage === 'preview' && (
								<FollowUpForm
									mode={mode}
									channel={followUpChannel}
									setChannel={setFollowUpChannel}
									outcome={followUpOutcome}
									setOutcome={(value) => {
										setFollowUpOutcome(value)
										setFollowUpMessage(null)
									}}
									notes={followUpNotes}
									setNotes={(value) => {
										setFollowUpNotes(value)
										setFollowUpMessage(null)
									}}
									state={followUpState}
									setState={setFollowUpState}
									dueAt={followUpDueAt}
									setDueAt={setFollowUpDueAt}
									isPending={followUpMutation.isPending}
									canSave={followUpOk}
									message={followUpMessage}
									onSave={() => followUpMutation.mutate()}
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
								<EmployeeStatusPill
									tone="danger"
									leading={<AlertTriangle aria-hidden="true" size={14} />}
									className="mt-5"
								>
									{error}
								</EmployeeStatusPill>
							)}
						</div>

						{isTerminal ? (
							<PanelCloseFooter onClose={onClose} />
						) : (
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
		<header className="hidden shrink-0 border-b border-[var(--color-border)] px-4 pt-6 pb-5 sm:px-6 lg:block lg:px-8 lg:pt-7">
			<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
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
				className="mt-2 break-words font-[family-name:var(--font-bricolage)]"
				style={{
					fontSize: '22px',
					fontWeight: 600,
					color: 'var(--color-text)',
				}}
			>
				{name}
			</h2>
			<p
				className="mt-1 break-all font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
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
		<dl className="mt-5 grid grid-cols-1 gap-2 border-b border-[var(--color-border)] pb-5 sm:grid-cols-3">
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
		<div className="rounded-md border border-black/[0.08] bg-black/[0.02] px-3 py-2 dark:border-white/[0.1] dark:bg-white/[0.04]">
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
				className="mt-1 break-words font-[family-name:var(--font-jetbrains-mono)] font-semibold tabular-nums"
				style={{
					fontSize: '15px',
					color: value > 0 ? color : 'var(--color-text-subtle)',
					letterSpacing: '-0.015em',
				}}
			>
				{formatDecimalEgp(value)}
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
			<EmployeeStatusPill
				tone="success"
				leading={<CheckCircle2 aria-hidden="true" size={15} />}
			>
				Settled in full
			</EmployeeStatusPill>
			{paidAt && (
				<p
					className="mt-3 font-[family-name:var(--font-bricolage)]"
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
					className="mt-1 break-all font-[family-name:var(--font-jetbrains-mono)]"
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
			label: 'collect 50%',
			amount: Math.round(totalDue * 0.5 * 100) / 100,
			hint: 'record half now, balance later',
		},
		{
			id: 'full',
			label: 'settle full',
			amount: totalDue,
			hint: 'close the payment now',
		},
	]

	return (
		<section className="mt-6">
			<span
				className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
				style={{
					fontSize: '9.5px',
					letterSpacing: '0.2em',
					color: 'var(--color-text-subtle)',
				}}
			>
				Payment amount
			</span>
			<div className="mt-2 grid grid-cols-2 gap-2">
				{entries.map((entry) => {
					const isActive = payMode === entry.id
					return (
						<button
							key={entry.id}
							type="button"
							aria-pressed={isActive}
							onClick={() => onChange(entry.id)}
							className={`flex min-h-[82px] flex-col justify-between gap-2 rounded-md border px-3 py-3 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 ${
								isActive
									? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.06]'
									: 'border-black/[0.1] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-primary)]/[0.04] dark:border-white/[0.12]'
							}`}
						>
							<div className="flex items-start justify-between gap-2">
								<span
									className="font-[family-name:var(--font-archivo)] font-semibold uppercase transition-colors"
									style={{
										fontSize: '11px',
										color: isActive
											? 'var(--color-text)'
											: 'var(--color-text-muted)',
										letterSpacing: '0.1em',
									}}
								>
									{entry.label}
								</span>
								<span
									className="font-[family-name:var(--font-jetbrains-mono)] font-semibold tabular-nums"
									style={{
										fontSize: '12px',
										color: isActive
											? 'var(--color-primary)'
											: 'var(--color-text)',
									}}
								>
									{formatDecimalEgp(entry.amount)}
								</span>
							</div>
							<span
								className="font-[family-name:var(--font-bricolage)] text-[var(--color-text-subtle)]"
								style={{
									fontSize: '12px',
									lineHeight: 1.35,
								}}
							>
								{entry.hint}
							</span>
						</button>
					)
				})}
			</div>
		</section>
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
				amount to record
			</span>
			<div className="mt-2 flex flex-wrap items-baseline gap-2">
				<span
					className="break-words font-[family-name:var(--font-archivo-black)] text-[34px] leading-none tabular-nums text-[var(--color-text)] sm:text-[40px]"
					style={{
						fontFeatureSettings: '"tnum" on, "lnum" on',
					}}
				>
					{formatDecimalEgp(amount)}
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
				className="mt-2 font-[family-name:var(--font-bricolage)]"
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
	recordedBy,
}: {
	amountPaid: number
	partialPaidAt: string | null
	proof: string
	recordedBy: string | null
}) {
	return (
		<div className="mt-4 border-t-2 border-[var(--color-border)] pt-3 sm:border-t-0 sm:border-l-2 sm:pt-0 sm:pl-3">
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
				{formatDecimalEgp(amountPaid)} EGP ·{' '}
				{partialPaidAt
					? new Date(partialPaidAt).toLocaleDateString('en-EG')
					: '—'}
				{recordedBy ? ` · by ${recordedBy}` : ''}
			</p>
			<p
				className="mt-0.5 break-all font-[family-name:var(--font-jetbrains-mono)]"
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

// ─── Follow-up notes ─────────────────────────────────────

function LatestFollowUp({
	followUp,
}: {
	followUp: FinanceFollowUpView | null
}) {
	if (!followUp) return null
	return (
		<div className="mt-5 rounded-md border border-black/[0.08] bg-black/[0.02] px-3 py-3 dark:border-white/[0.1] dark:bg-white/[0.04]">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<span
					className="font-[family-name:var(--font-archivo)] font-semibold uppercase"
					style={{
						fontSize: '10.5px',
						letterSpacing: '0.1em',
						color: 'var(--color-text-subtle)',
					}}
				>
					Latest follow-up
				</span>
				<span
					className="font-[family-name:var(--font-jetbrains-mono)] uppercase"
					style={{
						fontSize: '9.5px',
						letterSpacing: '0.14em',
						color: 'var(--color-primary)',
					}}
				>
					{followUp.followUpState}
				</span>
			</div>
			<p
				className="mt-2 font-[family-name:var(--font-bricolage)]"
				style={{
					fontSize: '12.5px',
					color: 'var(--color-text)',
					lineHeight: 1.45,
				}}
			>
				{followUp.outcome} · {followUp.notes}
			</p>
			<p
				className="mt-2 font-[family-name:var(--font-jetbrains-mono)]"
				style={{
					fontSize: '10.5px',
					color: 'var(--color-text-subtle)',
					letterSpacing: '0.03em',
				}}
			>
				{followUp.contactChannel} · due{' '}
				{formatFollowUpDate(followUp.followUpDueAt)}
			</p>
		</div>
	)
}

function FollowUpForm({
	mode,
	channel,
	setChannel,
	outcome,
	setOutcome,
	notes,
	setNotes,
	state,
	setState,
	dueAt,
	setDueAt,
	isPending,
	canSave,
	message,
	onSave,
}: {
	mode: Mode | null
	channel: FollowUpChannel
	setChannel: (value: FollowUpChannel) => void
	outcome: string
	setOutcome: (value: string) => void
	notes: string
	setNotes: (value: string) => void
	state: FollowUpState
	setState: (value: FollowUpState) => void
	dueAt: string
	setDueAt: (value: string) => void
	isPending: boolean
	canSave: boolean
	message: string | null
	onSave: () => void
}) {
	return (
		<section className="mt-6 border-y border-[var(--color-border)] py-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<span
						className="font-[family-name:var(--font-archivo)] font-semibold uppercase"
						style={{
							fontSize: '11px',
							letterSpacing: '0.1em',
							color: 'var(--color-text-subtle)',
						}}
					>
						{mode === 'deal' ? 'Supplier contact' : 'Customer call'}
					</span>
					<p
						className="mt-1 font-[family-name:var(--font-bricolage)]"
						style={{
							fontSize: '11.5px',
							color: 'var(--color-text-muted)',
							lineHeight: 1.4,
						}}
					>
						Separate from payment proof
					</p>
				</div>
				<EmployeeActionButton
					tone="neutral"
					size="sm"
					leading={<ReceiptText aria-hidden="true" size={14} />}
					disabled={!canSave || isPending}
					onClick={onSave}
				>
					{isPending ? 'Saving...' : 'Save follow-up'}
				</EmployeeActionButton>
			</div>

			<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label
					htmlFor="finance-follow-up-channel"
					className="font-[family-name:var(--font-archivo)] font-semibold uppercase"
					style={{
						fontSize: '10.5px',
						letterSpacing: '0.1em',
						color: 'var(--color-text-subtle)',
					}}
				>
					Channel
					<select
						id="finance-follow-up-channel"
						value={channel}
						onChange={(event) =>
							setChannel(parseFollowUpChannel(event.target.value))
						}
						className="mt-2 min-h-11 w-full rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-bricolage)] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
						style={{ fontSize: '13.5px' }}
					>
						{FOLLOW_UP_CHANNEL_OPTIONS.map((option) => (
							<option key={option.id} value={option.id}>
								{option.label}
							</option>
						))}
					</select>
				</label>

				<label
					htmlFor="finance-follow-up-state"
					className="font-[family-name:var(--font-archivo)] font-semibold uppercase"
					style={{
						fontSize: '10.5px',
						letterSpacing: '0.1em',
						color: 'var(--color-text-subtle)',
					}}
				>
					State
					<select
						id="finance-follow-up-state"
						value={state}
						onChange={(event) =>
							setState(parseFollowUpState(event.target.value))
						}
						className="mt-2 min-h-11 w-full rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-bricolage)] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
						style={{ fontSize: '13.5px' }}
					>
						{FOLLOW_UP_STATE_OPTIONS.map((option) => (
							<option key={option.id} value={option.id}>
								{option.label}
							</option>
						))}
					</select>
				</label>
			</div>

			<label
				htmlFor="finance-follow-up-due"
				className="mt-4 block font-[family-name:var(--font-archivo)] font-semibold uppercase"
				style={{
					fontSize: '10.5px',
					letterSpacing: '0.1em',
					color: 'var(--color-text-subtle)',
				}}
			>
				Follow-up due
			</label>
			<input
				id="finance-follow-up-due"
				type="datetime-local"
				value={dueAt}
				onChange={(event) => setDueAt(event.target.value)}
				className="mt-2 min-h-11 w-full rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-bricolage)] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
				style={{ fontSize: '13.5px' }}
			/>

			<label
				htmlFor="finance-follow-up-outcome"
				className="mt-4 block font-[family-name:var(--font-archivo)] font-semibold uppercase"
				style={{
					fontSize: '10.5px',
					letterSpacing: '0.1em',
					color: 'var(--color-text-subtle)',
				}}
			>
				Outcome
			</label>
			<input
				id="finance-follow-up-outcome"
				type="text"
				value={outcome}
				onChange={(event) => setOutcome(event.target.value)}
				placeholder={
					mode === 'deal'
						? 'e.g. supplier will confirm bank advice'
						: 'e.g. customer promised transfer'
				}
				className="mt-2 min-h-11 w-full rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-bricolage)] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/55 focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
				style={{ fontSize: '13.5px' }}
			/>

			<label
				htmlFor="finance-follow-up-notes"
				className="mt-4 block font-[family-name:var(--font-archivo)] font-semibold uppercase"
				style={{
					fontSize: '10.5px',
					letterSpacing: '0.1em',
					color: 'var(--color-text-subtle)',
				}}
			>
				Notes
			</label>
			<textarea
				id="finance-follow-up-notes"
				value={notes}
				onChange={(event) => setNotes(event.target.value)}
				placeholder="record the call details and next action"
				rows={3}
				className="mt-2 min-h-[86px] w-full resize-none rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 py-2 font-[family-name:var(--font-bricolage)] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/55 focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
				style={{ fontSize: '13.5px', lineHeight: 1.45 }}
			/>

			{message && (
				<EmployeeStatusPill
					tone="success"
					leading={<CheckCircle2 aria-hidden="true" size={14} />}
					className="mt-3"
				>
					{message}
				</EmployeeStatusPill>
			)}
		</section>
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
				className="flex items-baseline gap-2 font-[family-name:var(--font-archivo)] font-semibold uppercase"
				style={{
					fontSize: '11px',
					letterSpacing: '0.1em',
					color: 'var(--color-text-subtle)',
				}}
			>
				Payment proof
			</label>
			<input
				id="proof-filename"
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="e.g. nbe-transfer-2026-04-15.pdf"
				className="mt-2 min-h-11 w-full rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-bricolage)] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/55 focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
				style={{
					fontSize: '14px',
				}}
			/>
			<p
				className="mt-2 font-[family-name:var(--font-bricolage)]"
				style={{
					fontSize: '11px',
					color: 'var(--color-text-muted)',
					letterSpacing: '0.002em',
				}}
			>
				Required before review. Use the bank transfer file name or internal
				reference.
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
			<EmployeeStatusPill
				tone="danger"
				leading={<AlertTriangle aria-hidden="true" size={14} />}
			>
				Cancel {mode === 'order' ? 'order' : 'deal'}
			</EmployeeStatusPill>
			<p
				className="mt-3 font-[family-name:var(--font-bricolage)]"
				style={{
					fontSize: '12px',
					color: 'var(--color-text-muted)',
					lineHeight: 1.45,
					letterSpacing: '0.002em',
				}}
			>
				This marks the record declined, stamps the report, and releases reserved
				stock. This cannot be undone.
			</p>
			<div className="mt-4">
				<label
					htmlFor="cancel-reason"
					className="font-[family-name:var(--font-archivo)] font-semibold uppercase"
					style={{
						fontSize: '11px',
						letterSpacing: '0.1em',
						color: 'var(--color-text-subtle)',
					}}
				>
					Reason
				</label>
				<input
					id="cancel-reason"
					type="text"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder="e.g. customer withdrew, duplicate order"
					className="mt-2 min-h-11 w-full rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-bricolage)] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/55 focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
					style={{
						fontSize: '13.5px',
					}}
				/>
			</div>
			<div className="mt-4">
				<label
					htmlFor="cancel-note"
					className="font-[family-name:var(--font-archivo)] font-semibold uppercase"
					style={{
						fontSize: '11px',
						letterSpacing: '0.1em',
						color: 'var(--color-text-subtle)',
					}}
				>
					Note · optional
				</label>
				<input
					id="cancel-note"
					type="text"
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="additional context for the audit trail"
					className="mt-2 min-h-11 w-full rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-bricolage)] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/55 focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
					style={{
						fontSize: '13.5px',
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
			<EmployeeStatusPill
				tone="neutral"
				leading={<ReceiptText aria-hidden="true" size={14} />}
			>
				Review before recording
			</EmployeeStatusPill>
			<dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3">
				<dt
					className="font-[family-name:var(--font-bricolage)]"
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
					{formatDecimalEgp(amount)} EGP
				</dd>
				<dt
					className="font-[family-name:var(--font-bricolage)]"
					style={{
						fontSize: '11.5px',
						color: 'var(--color-text-subtle)',
					}}
				>
					status
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
					{nextTransition === 'paid'
						? 'Paid in full'
						: 'Partial payment recorded'}
				</dd>
				<dt
					className="font-[family-name:var(--font-bricolage)]"
					style={{
						fontSize: '11.5px',
						color: 'var(--color-text-subtle)',
					}}
				>
					proof
				</dt>
				<dd
					className="break-all font-[family-name:var(--font-jetbrains-mono)]"
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
				className="mt-4 font-[family-name:var(--font-bricolage)]"
				style={{
					fontSize: '11px',
					color: 'var(--color-text-muted)',
					letterSpacing: '0.002em',
				}}
			>
				Verify the amount and proof before recording. Payment transitions cannot
				be reversed.
			</p>
		</div>
	)
}

// ─── Footer ──────────────────────────────────────────────

function PanelCloseFooter({ onClose }: { onClose: () => void }) {
	return (
		<footer className="shrink-0 border-t border-[var(--color-border)] px-4 py-4 sm:px-6 lg:px-8">
			<EmployeeActionButton
				tone="neutral"
				leading={<X aria-hidden="true" size={14} />}
				fullWidthOnMobile
				onClick={onClose}
				className="sm:w-full"
			>
				Close record
			</EmployeeActionButton>
		</footer>
	)
}

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
	const actionLabel =
		stage === 'preview'
			? 'Review payment'
			: `Record ${formatDecimalEgp(amountThisStep)} EGP`

	return (
		<footer className="shrink-0 border-t border-[var(--color-border)] px-4 py-4 sm:px-6 lg:px-8">
			{stage === 'cancel' ? (
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
					<EmployeeActionButton
						tone="neutral"
						leading={<ArrowLeft aria-hidden="true" size={14} />}
						fullWidthOnMobile
						onClick={onBack}
					>
						Back
					</EmployeeActionButton>
					<EmployeeActionButton
						tone="danger"
						leading={<Ban aria-hidden="true" size={14} />}
						fullWidthOnMobile
						disabled={!cancelReasonOk || isCancelling}
						onClick={onCommitCancel}
						className="sm:justify-self-end"
					>
						{isCancelling ? 'Canceling...' : 'Confirm cancel'}
					</EmployeeActionButton>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
					{stage === 'preview' && (
						<EmployeeActionButton
							tone="danger"
							size="sm"
							leading={<Ban aria-hidden="true" size={14} />}
							fullWidthOnMobile
							onClick={onStartCancel}
						>
							Cancel {mode === 'order' ? 'order' : 'deal'}
						</EmployeeActionButton>
					)}
					{stage === 'confirm' && (
						<EmployeeActionButton
							tone="neutral"
							leading={<ArrowLeft aria-hidden="true" size={14} />}
							fullWidthOnMobile
							onClick={onBack}
						>
							Back
						</EmployeeActionButton>
					)}
					<EmployeeActionButton
						tone={stage === 'confirm' ? 'success' : 'primary'}
						leading={
							stage === 'confirm' ? (
								<CheckCircle2 aria-hidden="true" size={14} />
							) : (
								<ReceiptText aria-hidden="true" size={14} />
							)
						}
						fullWidthOnMobile
						disabled={!proofOk || isPending}
						onClick={onAdvance}
						className="sm:justify-self-end"
					>
						{isPending ? 'Recording...' : actionLabel}
					</EmployeeActionButton>
				</div>
			)}
		</footer>
	)
}
