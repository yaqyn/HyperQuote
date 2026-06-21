import type { OrderReportStageId, OrderReportStep } from '@hyperquote/types'
import type { ReactNode } from 'react'
import type { ResolvedReport } from '../../lib/server/order-reports'
import { DispatchBody, DispatchSection } from './DispatchDialog'

const STAGE_LABEL: Record<OrderReportStageId, string> = {
	delivery: 'Delivery',
	dispatch: 'Dispatch',
	finance: 'Finance',
	inventory: 'Inventory',
	sales: 'Sales',
	stopped: 'Stopped',
	submitted: 'Submitted',
	warehouse: 'Warehouse',
}

const STATUS_TONE: Record<ResolvedReport['summary']['status'], string> = {
	active: 'text-[var(--color-text)]',
	completed: 'text-[#116B3A]',
	stopped: 'text-[#B3261E] dark:text-[#E46B63]',
}

function formatRelative(iso: string | null): string {
	if (!iso) return '—'
	const ms = Date.now() - new Date(iso).getTime()
	const h = Math.abs(ms) / 3_600_000
	if (h < 1) return `${Math.round(h * 60)}m ago`
	if (h < 24) return `${Math.round(h)}h ago`
	return `${Math.floor(h / 24)}d ago`
}

export function ReportContent({ report }: { report: ResolvedReport }) {
	return (
		<DispatchBody>
			<ReportSummary report={report} />
			<section>
				<DispatchSection label="Timeline" />
				<ol className="space-y-4">
					{report.steps.map((step, index) => (
						<ReportStepCard
							key={step.id}
							step={step}
							index={index}
							isLast={index === report.steps.length - 1}
						/>
					))}
				</ol>
			</section>
			{report.pending.length > 0 && (
				<section className="mt-8 pt-5 border-t border-dashed border-black/[0.12] dark:border-white/[0.14]">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-subtle)]">
						Pending
					</p>
					<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 font-[family-name:var(--font-plex-mono)] text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)]/80">
						{report.pending.map((stage) => (
							<span key={stage}>· {STAGE_LABEL[stage]}</span>
						))}
					</div>
				</section>
			)}
		</DispatchBody>
	)
}

function ReportSummary({ report }: { report: ResolvedReport }) {
	return (
		<section>
			<DispatchSection label="Summary" />
			<div className="border border-black/[0.1] bg-black/[0.025] p-4 dark:border-white/[0.12] dark:bg-white/[0.035]">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<p
							className={`font-[family-name:var(--font-archivo-black)] text-[24px] leading-tight ${STATUS_TONE[report.summary.status]}`}
						>
							{report.summary.headline}
						</p>
						<p className="mt-2 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
							Reached {STAGE_LABEL[report.summary.currentStage]}
							{report.summary.processedBy
								? ` · Last processed by ${report.summary.processedBy}`
								: ''}
						</p>
					</div>
					{report.summary.specialCaseCount > 0 && (
						<span className="shrink-0 border border-[#B3261E]/35 px-3 py-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.16em] text-[#B3261E] dark:text-[#E46B63]">
							{report.summary.specialCaseCount} special
						</span>
					)}
				</div>
			</div>
		</section>
	)
}

function ReportStepCard({
	index,
	isLast,
	step,
}: {
	index: number
	isLast: boolean
	step: OrderReportStep
}) {
	const tone =
		step.status === 'stopped' || step.status === 'special'
			? 'border-[#B3261E]/35 bg-[#B3261E]/[0.035]'
			: isLast
				? 'border-[var(--color-text)] bg-black/[0.025] dark:bg-white/[0.035]'
				: 'border-black/[0.1] dark:border-white/[0.12]'
	return (
		<li className={`border p-4 ${tone}`}>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
							{String(index + 1).padStart(2, '0')} · {STAGE_LABEL[step.stage]}
						</span>
						{step.specialCase && (
							<span className="border border-[#B3261E]/30 px-2 py-0.5 font-[family-name:var(--font-plex-mono)] text-[9px] uppercase tracking-[0.14em] text-[#B3261E] dark:text-[#E46B63]">
								{step.specialCase.label}
							</span>
						)}
					</div>
					<h3 className="mt-2 font-[family-name:var(--font-archivo-black)] text-[19px] leading-tight text-[var(--color-text)]">
						{step.title}
					</h3>
					<p className="mt-2 font-[family-name:var(--font-archivo)] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
						{step.summary}
					</p>
				</div>
				<div className="shrink-0 text-end font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
					{formatRelative(step.timestamp)}
				</div>
			</div>
			<Grid>
				<Detail label="Processed by">
					<Strong>{step.actor?.name ?? '—'}</Strong>
				</Detail>
				{step.advisor && (
					<Detail label="Advisor">
						<Strong>{step.advisor.name}</Strong>
					</Detail>
				)}
				{step.facts.map((item) => (
					<Detail key={`${step.id}-${item.label}`} label={item.label}>
						<Mono>{formatReportValue(item.value)}</Mono>
					</Detail>
				))}
			</Grid>
			{step.lines.length > 0 && (
				<ul className="mt-4 space-y-1 border-t border-black/[0.08] pt-3 dark:border-white/[0.1]">
					{step.lines.map((line) => (
						<li
							key={`${step.id}-${line}`}
							className="font-[family-name:var(--font-archivo)] text-[13px] text-[var(--color-text)]"
						>
							{line}
						</li>
					))}
				</ul>
			)}
		</li>
	)
}

function formatReportValue(value: string): string {
	if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatRelative(value)
	return value.replace(/_/g, ' ')
}

function Grid({ children }: { children: ReactNode }) {
	return (
		<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
	)
}

function Detail({ children, label }: { children: ReactNode; label: string }) {
	return (
		<div className="min-w-0">
			<span className="font-[family-name:var(--font-plex-mono)] text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
				{label}
			</span>
			<div className="mt-1">{children}</div>
		</div>
	)
}

function Strong({ children }: { children: ReactNode }) {
	return (
		<span className="font-[family-name:var(--font-archivo)] text-[14px] font-semibold text-[var(--color-text)]">
			{children}
		</span>
	)
}

function Mono({ children }: { children: ReactNode }) {
	return (
		<span className="font-[family-name:var(--font-plex-mono)] text-[12px] text-[var(--color-text)]">
			{children}
		</span>
	)
}
