import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { getRFQQueue } from '../../../lib/server/sales-rfq'
import { useSalesStore } from '../../../stores/sales'
import type { PipelineDeal, PipelineStage, RFQ } from '../../../types/sales'
import { ReportViewerModal } from '../../shared/ReportViewer'
import { OutdatedPricesCard } from '../home/OutdatedPricesCard'
import { DeclineRFQDialog } from './DeclineRFQDialog'

// ─── Stage filter config ─────────────────────────────────
// Submitted merges new requests + awaiting clarification; the tab
// renders two section rules inside so the rep still sees the split.
const STAGE_FILTERS = [
	{ id: 'submitted' as const, label: 'submitted' },
	{ id: 'evaluated' as const, label: 'evaluated' },
	{ id: 'canceled' as const, label: 'canceled' },
] as const

type StageId = (typeof STAGE_FILTERS)[number]['id']

const SUBMITTED_STATUSES = [
	'submitted',
	'assigned',
	'awaiting_clarification',
] as const
const EVALUATED_STATUSES = [
	'reviewing',
	'quoting',
	'quoted',
	'negotiating',
	'countered',
	'won',
] as const
const CANCELED_STATUSES = ['lost', 'declined', 'expired'] as const

const STAGE_FILTER_FN: Record<string, (rfq: RFQ) => boolean> = {
	submitted: (rfq) =>
		(SUBMITTED_STATUSES as readonly string[]).includes(rfq.status),
	evaluated: (rfq) =>
		(EVALUATED_STATUSES as readonly string[]).includes(rfq.status),
	canceled: (rfq) =>
		(CANCELED_STATUSES as readonly string[]).includes(rfq.status),
}

// ─── Helpers ─────────────────────────────────────────────

function formatValue(v: number): string {
	if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
	if (v >= 1_000) return `${Math.round(v / 1_000)}K`
	return String(v)
}

function getSlaRemaining(slaDeadline: string): {
	text: string
	urgent: boolean
	overdue: boolean
} {
	const ms = new Date(slaDeadline).getTime() - Date.now()
	if (ms <= 0) return { text: 'overdue', urgent: true, overdue: true }
	const totalMinutes = Math.floor(ms / 60_000)
	const hours = Math.floor(totalMinutes / 60)
	const minutes = totalMinutes % 60
	const days = Math.floor(hours / 24)
	if (days >= 1)
		return { text: `${days}d ${hours % 24}h`, urgent: false, overdue: false }
	if (hours >= 1)
		return {
			text: `${hours}h ${minutes}m`,
			urgent: hours < 2,
			overdue: false,
		}
	return { text: `${minutes}m`, urgent: true, overdue: false }
}

// ─── Component ───────────────────────────────────────────

interface RFQInboxTableProps {
	onCreateQuote?: () => void
}

export function RFQInboxTable({ onCreateQuote }: RFQInboxTableProps) {
	const _queryClient = useQueryClient()
	const rfqStageFilter = useSalesStore((s) => s.rfqStageFilter)
	const setRfqStageFilter = useSalesStore((s) => s.setRfqStageFilter)
	const setEditingRfqId = useSalesStore((s) => s.setEditingRfqId)

	const { data, isLoading } = useQuery({
		queryKey: ['rfq-queue', {}],
		queryFn: () => getRFQQueue({ data: { page: 1, limit: 50 } }),
		staleTime: 30_000,
	})

	const { data: pipelineData } = useQuery({
		queryKey: ['sales-pipeline-summary'],
		queryFn: () => getSalesPipeline({ data: {} }),
		staleTime: 60_000,
	})

	const [showDecline, setShowDecline] = useState(false)
	const [declineRfqId, setDeclineRfqId] = useState<string | null>(null)
	const [reportRfqId, setReportRfqId] = useState<string | null>(null)

	const rfqs = data?.rfqs ?? []

	const filteredRfqs = useMemo(() => {
		const stageFn = STAGE_FILTER_FN[rfqStageFilter] ?? (() => true)
		return rfqs
			.filter(stageFn)
			.sort((a, b) => b.priorityScore - a.priorityScore)
	}, [rfqs, rfqStageFilter])

	const submittedSections = useMemo(() => {
		const newOnes = filteredRfqs.filter(
			(r) => r.status === 'submitted' || r.status === 'assigned',
		)
		const onHold = filteredRfqs.filter(
			(r) => r.status === 'awaiting_clarification',
		)
		return { newOnes, onHold }
	}, [filteredRfqs])

	const stageCounts = useMemo(() => {
		const counts: Record<string, number> = {}
		for (const stage of STAGE_FILTERS) {
			const fn = STAGE_FILTER_FN[stage.id] ?? (() => true)
			counts[stage.id] = rfqs.filter(fn).length
		}
		return counts
	}, [rfqs])

	const _pipelineSummary = useMemo(() => {
		const stages: PipelineStage[] = pipelineData?.stages ?? []
		const deals: PipelineDeal[] = pipelineData?.deals ?? []
		const activeStages = stages.filter(
			(s) => s.id !== 'won' && s.id !== 'lost_expired',
		)
		const totalPipeline = activeStages.reduce((sum, s) => sum + s.totalValue, 0)
		const weightedForecast = deals
			.filter((d) => d.stage !== 'won' && d.stage !== 'lost_expired')
			.reduce((sum, d) => sum + d.dealValue * (d.winProbability / 100), 0)
		const activeDeals = deals.filter(
			(d) => d.stage !== 'won' && d.stage !== 'lost_expired',
		).length
		const wonDeals = deals.filter((d) => d.stage === 'won').length
		const totalClosed = deals.filter(
			(d) => d.stage === 'won' || d.stage === 'lost_expired',
		).length
		const winRate =
			totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 100) : 0
		return { totalPipeline, weightedForecast, activeDeals, winRate }
	}, [pipelineData])

	const listRef = useRef<HTMLElement>(null)
	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'j' || e.key === 'k') {
			e.preventDefault()
		}
	}, [])

	const handleStartQuote = (rfq: RFQ) => {
		setEditingRfqId(rfq.id)
	}

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div
					className="h-px w-[80px] origin-left scale-x-0 animate-[horizon-draw_720ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
					style={{ backgroundColor: 'var(--color-text-subtle)' }}
				/>
			</div>
		)
	}

	return (
		<section
			ref={listRef}
			aria-label="RFQ inbox"
			className="flex h-full flex-col focus:outline-none"
			onKeyDown={handleKeyDown}
		>
			{/* Top bar — stage filter nav + right actions */}
			<div
				className="shrink-0 flex items-center gap-6 px-6 py-3"
				style={{ borderBottom: '1px solid var(--color-border)' }}
			>
				{/* Stage filter tabs */}
				<nav aria-label="RFQ stage filter">
					<ol className="flex items-baseline gap-5">
						{STAGE_FILTERS.map((stage) => {
							const count = stageCounts[stage.id] ?? 0
							const isActive = rfqStageFilter === stage.id
							return (
								<li key={stage.id}>
									<StageTab
										label={stage.label}
										count={count}
										active={isActive}
										onClick={() => setRfqStageFilter(stage.id as StageId)}
									/>
								</li>
							)
						})}
					</ol>
				</nav>

				<div className="flex-1" />

				<div className="shrink-0">
					<OutdatedPricesCard />
				</div>

				{/* New quote — italic Literata word-action */}
				{onCreateQuote && (
					<button
						type="button"
						onClick={onCreateQuote}
						className="group relative inline-flex items-baseline gap-2 font-[family-name:var(--font-literata)] italic outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
						style={{
							fontSize: '18px',
							fontWeight: 500,
							color: 'var(--color-text)',
							letterSpacing: '-0.02em',
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
							className="transition-transform group-hover:translate-x-1"
							style={{ fontSize: '15px' }}
						>
							→
						</span>
					</button>
				)}
			</div>

			{/* List content */}
			<div
				className="flex-1 min-h-0 overflow-y-auto px-6 py-6"
				data-module-content
			>
				{filteredRfqs.length === 0 ? (
					<EmptyState stage={rfqStageFilter} />
				) : rfqStageFilter === 'evaluated' ? (
					<div className="flex flex-col gap-0">
						{filteredRfqs.map((rfq) => (
							<EvaluatedRow
								key={rfq.id}
								rfq={rfq}
								onOpen={() => handleStartQuote(rfq)}
							/>
						))}
					</div>
				) : rfqStageFilter === 'submitted' ? (
					<div className="flex flex-col gap-8">
						<SubmittedSection
							label="new requests"
							rfqs={submittedSections.newOnes}
							onOpen={handleStartQuote}
						/>
						<SubmittedSection
							label="awaiting clarification"
							rfqs={submittedSections.onHold}
							onOpen={handleStartQuote}
						/>
					</div>
				) : rfqStageFilter === 'canceled' ? (
					<div className="flex flex-col gap-0">
						{filteredRfqs.map((rfq) => (
							<CanceledRow
								key={rfq.id}
								rfq={rfq}
								onOpenReport={setReportRfqId}
							/>
						))}
					</div>
				) : (
					<div className="flex flex-col gap-0">
						{filteredRfqs.map((rfq) => (
							<RfqRow
								key={rfq.id}
								rfq={rfq}
								onOpen={() => handleStartQuote(rfq)}
							/>
						))}
					</div>
				)}
			</div>

			{/* Decline Dialog */}
			{declineRfqId && (
				<DeclineRFQDialog
					rfqId={declineRfqId}
					isOpen={showDecline}
					onClose={() => {
						setShowDecline(false)
						setDeclineRfqId(null)
					}}
				/>
			)}

			<ReportViewerModal
				rfqId={reportRfqId}
				onClose={() => setReportRfqId(null)}
			/>
		</section>
	)
}

// ─── Stage tab ───────────────────────────────────────────

function StageTab({
	label,
	count,
	active,
	onClick,
}: {
	label: string
	count: number
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-current={active ? 'page' : undefined}
			className="group relative inline-flex items-baseline gap-1.5 font-[family-name:var(--font-archivo)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
		>
			<span
				style={{
					fontSize: '13px',
					fontStyle: active ? 'normal' : 'italic',
					fontWeight: active ? 500 : 400,
					color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
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
						color: active ? 'var(--color-primary)' : 'var(--color-text-subtle)',
						letterSpacing: '0.04em',
					}}
				>
					{count}
				</span>
			)}
			<span
				aria-hidden="true"
				className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-[var(--color-primary)] transition-transform duration-200 ${
					active
						? 'scale-x-100'
						: 'scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100'
				}`}
			/>
		</button>
	)
}

// ─── Section header for grouped RFQs ─────────────────────

function SubmittedSection({
	label,
	rfqs,
	onOpen,
}: {
	label: string
	rfqs: RFQ[]
	onOpen: (rfq: RFQ) => void
}) {
	if (rfqs.length === 0) return null
	return (
		<section>
			<div className="mb-2 flex items-center gap-4">
				<span
					className="shrink-0 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-muted)]"
					style={{ fontSize: '11px' }}
				>
					{label}
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
					style={{ fontSize: '10px', letterSpacing: '0.06em' }}
				>
					{rfqs.length}
				</span>
			</div>
			<div className="flex flex-col gap-0">
				{rfqs.map((rfq) => (
					<RfqRow key={rfq.id} rfq={rfq} onOpen={() => onOpen(rfq)} />
				))}
			</div>
		</section>
	)
}

// ─── Row templates ───────────────────────────────────────

function RfqRow({ rfq, onOpen }: { rfq: RFQ; onOpen: () => void }) {
	const sla = getSlaRemaining(rfq.slaDeadline)
	return (
		<button
			type="button"
			onClick={onOpen}
			className="group grid w-full grid-cols-[1fr_auto_auto] items-baseline gap-6 py-4 text-start outline-none transition-colors hover:bg-black/[0.015] focus-visible:bg-[var(--color-primary)]/[0.04] dark:hover:bg-white/[0.02]"
			style={{
				borderBottom: '1px solid var(--color-border)',
			}}
			aria-label={`Open RFQ for ${rfq.customerName}`}
		>
			<div className="min-w-0">
				<div className="flex items-baseline gap-2">
					<span
						className="truncate font-[family-name:var(--font-archivo)]"
						style={{
							fontSize: '15px',
							fontWeight: 500,
							color: 'var(--color-text)',
							letterSpacing: '-0.005em',
						}}
					>
						{rfq.customerName}
					</span>
					{rfq.hasOutdatedPrices && (
						<span
							className="inline-flex shrink-0 items-baseline text-[var(--color-signal-amber)]"
							title="Contains items with outdated prices — request update from inventory"
						>
							<AlertTriangle size={11} strokeWidth={2} aria-hidden="true" />
						</span>
					)}
				</div>
				<div className="mt-1 flex items-baseline gap-2">
					{rfq.deliveryCity && (
						<span
							className="font-[family-name:var(--font-archivo)] italic truncate"
							style={{
								fontSize: '11px',
								color: 'var(--color-text-subtle)',
							}}
						>
							{rfq.deliveryCity.toLowerCase()}
						</span>
					)}
					{rfq.deliveryCity && (
						<span
							style={{
								color: 'var(--color-text-subtle)',
								fontSize: '10px',
							}}
						>
							·
						</span>
					)}
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums shrink-0"
						style={{
							fontSize: '10px',
							color: 'var(--color-text-subtle)',
							letterSpacing: '0.04em',
						}}
					>
						{rfq.lineItemCount} {rfq.lineItemCount === 1 ? 'item' : 'items'}
					</span>
				</div>
			</div>

			<div className="flex flex-col items-end">
				<span
					className="font-[family-name:var(--font-plex-mono)] tabular-nums"
					style={{
						fontSize: '14px',
						fontWeight: 500,
						color: 'var(--color-text)',
						letterSpacing: '0.01em',
					}}
				>
					{formatValue(rfq.estimatedValue)}
				</span>
				<span
					className="mt-0.5 font-[family-name:var(--font-archivo)] italic"
					style={{
						fontSize: '10px',
						color: 'var(--color-text-subtle)',
					}}
				>
					EGP · est.
				</span>
			</div>

			<div className="flex flex-col items-end">
				<span
					className="font-[family-name:var(--font-plex-mono)] tabular-nums"
					style={{
						fontSize: '11px',
						color: sla.overdue
							? 'var(--color-signal-red)'
							: sla.urgent
								? 'var(--color-signal-amber)'
								: 'var(--color-text-muted)',
						fontWeight: sla.urgent ? 500 : 400,
						letterSpacing: '0.02em',
					}}
				>
					{sla.text}
				</span>
				<span
					className="mt-0.5 font-[family-name:var(--font-archivo)] italic"
					style={{
						fontSize: '10px',
						color: sla.urgent
							? 'var(--color-signal-amber)'
							: 'var(--color-text-subtle)',
					}}
				>
					{sla.overdue ? 'past sla' : 'sla'}
				</span>
			</div>
		</button>
	)
}

function EvaluatedRow({ rfq, onOpen }: { rfq: RFQ; onOpen: () => void }) {
	const sla = getSlaRemaining(rfq.slaDeadline)
	const previewItems = (rfq.previewItems ?? []).slice(0, 3)
	const extraCount = Math.max(0, rfq.lineItemCount - previewItems.length)
	const status = rfq.status.replace('_', ' ')

	return (
		<button
			type="button"
			onClick={onOpen}
			className="grid w-full grid-cols-[1fr_auto_auto] items-baseline gap-6 py-4 text-start outline-none transition-colors hover:bg-black/[0.015] focus-visible:bg-[var(--color-primary)]/[0.04] dark:hover:bg-white/[0.02]"
			style={{ borderBottom: '1px solid var(--color-border)' }}
			aria-label={`Open RFQ for ${rfq.customerName}`}
		>
			<div className="min-w-0">
				<div className="flex items-baseline gap-2">
					<span
						className="truncate font-[family-name:var(--font-archivo)]"
						style={{
							fontSize: '15px',
							fontWeight: 500,
							color: 'var(--color-text)',
							letterSpacing: '-0.005em',
						}}
					>
						{rfq.customerName}
					</span>
					{rfq.hasOutdatedPrices && (
						<AlertTriangle
							size={11}
							strokeWidth={2}
							className="shrink-0 self-center text-[var(--color-signal-amber)]"
							aria-hidden="true"
						/>
					)}
					<span
						className="shrink-0 font-[family-name:var(--font-archivo)] italic"
						style={{
							fontSize: '11px',
							color: 'var(--color-primary)',
						}}
					>
						· {status}
					</span>
				</div>
				<div className="mt-1 flex items-baseline gap-2">
					{previewItems.length > 0 && (
						<span
							className="truncate font-[family-name:var(--font-archivo)] italic"
							style={{
								fontSize: '11px',
								color: 'var(--color-text-muted)',
							}}
						>
							{previewItems.join(' · ')}
							{extraCount > 0 && (
								<span style={{ color: 'var(--color-text-subtle)' }}>
									{' '}
									· +{extraCount} more
								</span>
							)}
						</span>
					)}
				</div>
			</div>

			<div className="flex flex-col items-end">
				<span
					className="font-[family-name:var(--font-plex-mono)] tabular-nums"
					style={{
						fontSize: '14px',
						fontWeight: 500,
						color: 'var(--color-text)',
						letterSpacing: '0.01em',
					}}
				>
					{formatValue(rfq.estimatedValue)}
				</span>
				<span
					className="mt-0.5 font-[family-name:var(--font-archivo)] italic"
					style={{
						fontSize: '10px',
						color: 'var(--color-text-subtle)',
					}}
				>
					EGP · est.
				</span>
			</div>

			<div className="flex flex-col items-end">
				<span
					className="font-[family-name:var(--font-plex-mono)] tabular-nums"
					style={{
						fontSize: '11px',
						color: sla.overdue
							? 'var(--color-signal-red)'
							: sla.urgent
								? 'var(--color-signal-amber)'
								: 'var(--color-text-muted)',
						fontWeight: sla.urgent ? 500 : 400,
						letterSpacing: '0.02em',
					}}
				>
					{sla.text}
				</span>
				<span
					className="mt-0.5 font-[family-name:var(--font-archivo)] italic"
					style={{
						fontSize: '10px',
						color: sla.urgent
							? 'var(--color-signal-amber)'
							: 'var(--color-text-subtle)',
					}}
				>
					{sla.overdue ? 'past sla' : 'sla'}
				</span>
			</div>
		</button>
	)
}

function CanceledRow({
	rfq,
	onOpenReport,
}: {
	rfq: RFQ
	onOpenReport: (rfqId: string) => void
}) {
	const status = rfq.status.replace('_', ' ')
	return (
		<button
			type="button"
			onClick={() => onOpenReport(rfq.id)}
			className="grid w-full grid-cols-[1fr_auto] items-baseline gap-6 py-4 text-start outline-none transition-colors hover:bg-black/[0.015] focus-visible:bg-[var(--color-primary)]/[0.04] dark:hover:bg-white/[0.02]"
			style={{
				borderBottom: '1px solid var(--color-border)',
				opacity: 0.7,
			}}
			aria-label={`View report for ${rfq.customerName}`}
		>
			<div className="min-w-0">
				<div className="flex items-baseline gap-2">
					<span
						className="truncate font-[family-name:var(--font-archivo)]"
						style={{
							fontSize: '15px',
							fontWeight: 500,
							color: 'var(--color-text-muted)',
							letterSpacing: '-0.005em',
						}}
					>
						{rfq.customerName}
					</span>
					<span
						className="shrink-0 font-[family-name:var(--font-archivo)] italic"
						style={{
							fontSize: '11px',
							color: 'var(--color-signal-red)',
						}}
					>
						· {status}
					</span>
				</div>
			</div>
			<span
				className="group relative inline-flex items-baseline gap-1 font-[family-name:var(--font-archivo)] italic shrink-0"
				style={{
					fontSize: '11px',
					color: 'var(--color-primary)',
				}}
			>
				<span className="relative">
					view report
					<span
						aria-hidden="true"
						className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-200 group-hover:scale-x-100"
					/>
				</span>
				<span aria-hidden="true">→</span>
			</span>
		</button>
	)
}

function EmptyState({ stage }: { stage: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-20">
			<p
				className="font-[family-name:var(--font-literata)] italic"
				style={{
					fontSize: '18px',
					color: 'var(--color-text-subtle)',
					letterSpacing: '-0.01em',
				}}
			>
				no rfqs in {stage}
			</p>
			<p
				className="mt-2 max-w-[280px] text-center font-[family-name:var(--font-archivo)] italic"
				style={{
					fontSize: '11px',
					color: 'var(--color-text-subtle)',
					lineHeight: 1.5,
				}}
			>
				{stage === 'submitted'
					? 'new customer requests will surface here.'
					: stage === 'evaluated'
						? 'quotes you\u2019ve built and sent live here.'
						: 'archived requests (lost · declined · expired) will surface here.'}
			</p>
		</div>
	)
}
