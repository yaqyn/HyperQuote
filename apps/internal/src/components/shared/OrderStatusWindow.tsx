import { useQuery } from '@tanstack/react-query'
import {
	ArrowLeft,
	Clock3,
	Download,
	FileText,
	Search,
	Share2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import {
	INTERNAL_LIVE_REFETCH_MS,
	INTERNAL_LIVE_STALE_MS,
} from '../../lib/internal-live-query'
import {
	getOrderReport,
	getOrderStatusIndex,
	type OrderStatusIndexRow,
	type ResolvedReport,
} from '../../lib/server/order-reports'
import { useOrderStatusStore } from '../../stores/order-status'
import { DispatchBody, DispatchDialog } from './DispatchDialog'
import { ReportContent } from './ReportViewer'

const LEVEL_TONE: Record<string, string> = {
	delivery: 'border-[#116B3A]/25 bg-[#116B3A]/[0.055] text-[#116B3A]',
	dispatch: 'border-[#2F5EAA]/25 bg-[#2F5EAA]/[0.055] text-[#2F5EAA]',
	finance: 'border-[#7650A8]/25 bg-[#7650A8]/[0.06] text-[#7650A8]',
	inventory: 'border-[#8B6B11]/25 bg-[#8B6B11]/[0.055] text-[#8B6B11]',
	sales:
		'border-[var(--color-primary)]/25 bg-[var(--color-primary)]/[0.055] text-[var(--color-primary)]',
	stopped: 'border-[#B3261E]/25 bg-[#B3261E]/[0.055] text-[#B3261E]',
	warehouse: 'border-[#0E7369]/25 bg-[#0E7369]/[0.055] text-[#0E7369]',
}

export function OrderStatusWindow() {
	const isOpen = useOrderStatusStore((state) => state.isOpen)
	const initialRfqId = useOrderStatusStore((state) => state.initialRfqId)
	const close = useOrderStatusStore((state) => state.close)
	const clearInitialRfqId = useOrderStatusStore(
		(state) => state.clearInitialRfqId,
	)
	const [query, setQuery] = useState('')
	const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null)
	const [shareStatus, setShareStatus] = useState<string | null>(null)

	const indexQuery = useQuery({
		queryKey: ['order-status-index'],
		queryFn: () => getOrderStatusIndex(),
		enabled: isOpen,
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})

	useEffect(() => {
		if (!isOpen) {
			setSelectedRfqId(null)
			setQuery('')
			setShareStatus(null)
			return
		}
		if (initialRfqId) {
			setSelectedRfqId(initialRfqId)
			clearInitialRfqId()
		}
	}, [clearInitialRfqId, initialRfqId, isOpen])

	const reportQuery = useQuery({
		queryKey: ['order-status-report', selectedRfqId],
		queryFn: () => getOrderReport({ data: { rfqId: selectedRfqId ?? '' } }),
		enabled: isOpen && !!selectedRfqId,
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})

	const rows = indexQuery.data ?? []
	const filtered = useMemo(() => filterRows(rows, query), [query, rows])
	const groups = useMemo(() => groupRows(filtered), [filtered])
	const selectedRow = rows.find((row) => row.rfqId === selectedRfqId) ?? null
	const report = reportQuery.data ?? null

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={close}
			size="xl"
			title="Order status"
			eyebrow="Internal workflow"
			caption="All active and stopped orders grouped by operational level."
			fullScreenOnMobile
			hideHeaderOnMobile
		>
			<div className="relative flex min-h-0 flex-1 overflow-hidden sm:min-h-[min(720px,calc(100dvh-9rem))]">
				<AnimatePresence mode="wait" initial={false}>
					{selectedRfqId ? (
						<motion.div
							key="report"
							initial={{ opacity: 0, x: 28 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: 28 }}
							transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
							className="flex min-h-0 w-full flex-col"
						>
							<ReportToolbar
								report={report}
								row={selectedRow}
								shareStatus={shareStatus}
								onBack={() => {
									setSelectedRfqId(null)
									setShareStatus(null)
								}}
								onDownload={() => {
									if (report) downloadReport(report)
								}}
								onShare={() =>
									void shareReport(report, selectedRow).then(setShareStatus)
								}
							/>
							{reportQuery.isLoading ? (
								<CenteredState label="Loading report" />
							) : report ? (
								<ReportContent report={report} />
							) : (
								<CenteredState label="Report unavailable" />
							)}
						</motion.div>
					) : (
						<motion.div
							key="index"
							initial={{ opacity: 0, x: -18 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -18 }}
							transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
							className="flex min-h-0 w-full flex-col"
						>
							<div className="shrink-0 border-b border-black/[0.08] px-3 py-3 pr-12 dark:border-white/[0.1] sm:px-5 sm:pr-5">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<label className="relative block min-w-0 flex-1">
										<Search
											aria-hidden="true"
											size={15}
											strokeWidth={1.9}
											className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
										/>
										<input
											type="search"
											value={query}
											onChange={(event) => setQuery(event.target.value)}
											placeholder="Search customer, order, quote, stage..."
											className="h-10 w-full rounded-md border border-black/[0.08] bg-transparent pl-9 pr-3 font-[family-name:var(--font-archivo)] text-[13px] text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/45 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.1]"
										/>
									</label>
									<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
										{filtered.length} / {rows.length} orders
									</p>
								</div>
							</div>
							<DispatchBody className="space-y-5 px-3 py-3 sm:px-5 sm:py-5">
								{indexQuery.isLoading ? (
									<CenteredState label="Loading orders" />
								) : groups.length === 0 ? (
									<CenteredState label="No matching orders" />
								) : (
									groups.map((group) => (
										<LevelGroup
											key={group.key}
											group={group}
											onSelect={setSelectedRfqId}
										/>
									))
								)}
							</DispatchBody>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</DispatchDialog>
	)
}

function filterRows(rows: OrderStatusIndexRow[], query: string) {
	const normalized = query.trim().toLowerCase()
	if (!normalized) return rows
	return rows.filter((row) =>
		[
			row.customerName,
			row.contactName,
			row.requestNumber,
			row.orderNumber,
			row.levelLabel,
			row.status,
			row.orderStatus,
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase()
			.includes(normalized),
	)
}

function groupRows(rows: OrderStatusIndexRow[]) {
	const groups = new Map<
		string,
		{
			key: string
			label: string
			level: number
			levelId: string
			rows: OrderStatusIndexRow[]
		}
	>()
	for (const row of rows) {
		const key = `${row.level}-${row.levelId}`
		const existing = groups.get(key) ?? {
			key,
			label: row.levelLabel,
			level: row.level,
			levelId: row.levelId,
			rows: [],
		}
		existing.rows.push(row)
		groups.set(key, existing)
	}
	return Array.from(groups.values()).sort((a, b) => a.level - b.level)
}

function LevelGroup({
	group,
	onSelect,
}: {
	group: ReturnType<typeof groupRows>[number]
	onSelect: (rfqId: string) => void
}) {
	return (
		<section>
			<div className="mb-2 flex items-center justify-between border-b border-black/[0.08] bg-[var(--color-surface)] py-2 dark:border-white/[0.1] sm:sticky sm:top-0 sm:z-10">
				<div className="flex min-w-0 items-center gap-2">
					<span
						className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 font-[family-name:var(--font-plex-mono)] text-[11px] font-semibold ${LEVEL_TONE[group.levelId] ?? LEVEL_TONE.sales}`}
					>
						L{group.level}
					</span>
					<h3 className="truncate font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
						{group.label}
					</h3>
				</div>
				<span className="font-[family-name:var(--font-plex-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
					{group.rows.length}
				</span>
			</div>
			<div className="grid gap-2">
				{group.rows.map((row) => (
					<button
						key={row.rfqId}
						type="button"
						onClick={() => onSelect(row.rfqId)}
						className="grid min-h-20 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-black/[0.08] bg-black/[0.015] px-3 py-2.5 text-start outline-none transition-colors hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-primary)]/[0.045] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 dark:border-white/[0.1] dark:bg-white/[0.025]"
					>
						<span
							className={`inline-flex h-10 w-10 items-center justify-center rounded-md border font-[family-name:var(--font-plex-mono)] text-[12px] font-semibold ${LEVEL_TONE[row.levelId] ?? LEVEL_TONE.sales}`}
						>
							{row.level}
						</span>
						<span className="min-w-0">
							<span className="block truncate font-[family-name:var(--font-archivo)] text-[14px] font-semibold text-[var(--color-text)]">
								{row.customerName}
							</span>
							<span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-plex-mono)] text-[10.5px] text-[var(--color-text-subtle)]">
								<span>{row.requestNumber}</span>
								{row.orderNumber && <span>{row.orderNumber}</span>}
								<span>{row.itemCount} lines</span>
								{row.paymentCount > 0 && (
									<span>{row.paymentCount} payments</span>
								)}
							</span>
							<span className="mt-1 block truncate font-[family-name:var(--font-archivo)] text-[12px] italic text-[var(--color-text-muted)]">
								{row.summary}
							</span>
						</span>
						<span className="hidden shrink-0 items-end gap-1 text-end font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-subtle)] sm:flex sm:flex-col">
							<span className="inline-flex items-center gap-1">
								<Clock3 size={12} strokeWidth={1.8} />
								{formatDateTime(row.lastActivityAt)}
							</span>
							<span>{row.orderStatus ?? row.status}</span>
						</span>
					</button>
				))}
			</div>
		</section>
	)
}

function ReportToolbar({
	onBack,
	onDownload,
	onShare,
	report,
	row,
	shareStatus,
}: {
	onBack: () => void
	onDownload: () => void
	onShare: () => void
	report: ResolvedReport | null
	row: OrderStatusIndexRow | null
	shareStatus: string | null
}) {
	return (
		<div className="shrink-0 border-b border-black/[0.08] px-3 py-3 pr-12 dark:border-white/[0.1] sm:px-5 sm:pr-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<Button
						onPress={onBack}
						aria-label="Back to orders"
						className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/[0.08] text-[var(--color-text-muted)] outline-none transition-colors hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 dark:border-white/[0.1]"
					>
						<ArrowLeft size={15} strokeWidth={1.9} />
					</Button>
					<div className="min-w-0">
						<p className="truncate font-[family-name:var(--font-archivo)] text-[14px] font-semibold text-[var(--color-text)]">
							{report?.customerName ?? row?.customerName ?? 'Order report'}
						</p>
						<p className="mt-0.5 truncate font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
							{row?.requestNumber ?? report?.rfqId ?? 'loading'}
							{row?.orderNumber ? ` / ${row.orderNumber}` : ''}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{shareStatus && (
						<span className="font-[family-name:var(--font-plex-mono)] text-[10px] text-[var(--color-text-subtle)]">
							{shareStatus}
						</span>
					)}
					<Button
						onPress={onShare}
						isDisabled={!report}
						className="inline-flex h-9 items-center gap-2 rounded-md border border-black/[0.08] px-3 font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text-muted)] outline-none transition-colors hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 disabled:opacity-45 dark:border-white/[0.1]"
					>
						<Share2 size={14} strokeWidth={1.9} />
						Share
					</Button>
					<Button
						onPress={onDownload}
						isDisabled={!report}
						className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--color-primary)] px-3 font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-white outline-none transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 disabled:opacity-45"
					>
						<Download size={14} strokeWidth={1.9} />
						Download
					</Button>
				</div>
			</div>
		</div>
	)
}

function CenteredState({ label }: { label: string }) {
	return (
		<div className="flex flex-1 items-center justify-center p-8 text-center">
			<div>
				<FileText
					aria-hidden="true"
					size={24}
					strokeWidth={1.7}
					className="mx-auto text-[var(--color-text-subtle)]"
				/>
				<p className="mt-3 font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text-muted)]">
					{label}
				</p>
			</div>
		</div>
	)
}

function formatDateTime(iso: string) {
	return new Intl.DateTimeFormat('en-EG', {
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		month: 'short',
	}).format(new Date(iso))
}

function downloadReport(report: ResolvedReport) {
	const html = reportHtml(report)
	const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = report.exportFileName
	document.body.append(anchor)
	anchor.click()
	anchor.remove()
	URL.revokeObjectURL(url)
}

async function shareReport(
	report: ResolvedReport | null,
	row: OrderStatusIndexRow | null,
) {
	if (!report) return null
	const title = `${row?.requestNumber ?? report.rfqId} order report`
	const text = `${title}\n${report.summary.headline}\n${report.steps
		.map((step, index) => `${index + 1}. ${step.title} - ${step.summary}`)
		.join('\n')}`
	if (navigator.share) {
		try {
			await navigator.share({ text, title })
			return 'Shared'
		} catch {
			return null
		}
	}
	try {
		await navigator.clipboard.writeText(text)
		return 'Copied'
	} catch {
		return 'Copy unavailable'
	}
}

function reportHtml(report: ResolvedReport) {
	const sections = report.steps
		.map(
			(step, index) => `
				<section>
					<h2>${index + 1}. ${escapeHtml(step.title)}</h2>
					<p>${escapeHtml(step.summary)}</p>
					<table>
						<tbody>
							${step.facts
								.map(
									(fact) =>
										`<tr><th>${escapeHtml(fact.label)}</th><td>${escapeHtml(fact.value)}</td></tr>`,
								)
								.join('')}
						</tbody>
					</table>
				</section>`,
		)
		.join('')
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<title>${escapeHtml(report.customerName)} order report</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 32px; color: #111; }
		header, section { border-bottom: 1px solid #ddd; padding: 18px 0; }
		h1 { margin: 0 0 8px; font-size: 26px; }
		h2 { margin: 0 0 8px; font-size: 18px; }
		p { color: #444; }
		table { border-collapse: collapse; width: 100%; margin-top: 12px; }
		th, td { border-top: 1px solid #eee; padding: 7px 0; text-align: left; vertical-align: top; }
		th { width: 180px; color: #666; font-size: 12px; text-transform: uppercase; }
	</style>
</head>
<body>
	<header>
		<h1>${escapeHtml(report.customerName)}</h1>
		<p>${escapeHtml(report.summary.headline)}</p>
		<p>Generated ${escapeHtml(new Date(report.generatedAt).toLocaleString('en-EG'))}</p>
	</header>
	${sections}
</body>
</html>`
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;')
}
