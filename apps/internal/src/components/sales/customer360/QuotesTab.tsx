import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
	Button,
	Label,
	ListBox,
	ListBoxItem,
	Popover,
	Select,
	SelectValue,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface QuotesTabProps {
	customerId: string
	enabled: boolean
}

type StatusFilter = 'all' | 'won' | 'lost' | 'pending' | 'draft' | 'sent'

export function QuotesTab({ customerId, enabled }: QuotesTabProps) {
	const { t } = useTranslation('internal')
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
	const [expandedId, setExpandedId] = useState<string | null>(null)

	const { data, isLoading } = useQuery({
		queryKey: ['customer-360', 'quotes', customerId],
		queryFn: () => getCustomer360({ data: { customerId } }),
		staleTime: 120_000,
		enabled,
		select: (d) => d.quotes,
	})

	if (!enabled) return null
	if (isLoading) return <TabSkeleton />
	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-48 text-[13px] text-black/30 dark:text-white/30">
				{t('sales.customer360.quotes.noQuotes')}
			</div>
		)
	}

	const filtered =
		statusFilter === 'all'
			? data
			: data.filter((q) => {
					if (statusFilter === 'won') return q.outcome === 'won'
					if (statusFilter === 'lost') return q.outcome === 'lost'
					if (statusFilter === 'pending') return q.outcome === 'pending'
					return q.status === statusFilter
				})

	const wonCount = data.filter((q) => q.outcome === 'won').length
	const lostCount = data.filter((q) => q.outcome === 'lost').length
	const winRate =
		data.length > 0 ? Math.round((wonCount / data.length) * 100) : 0

	return (
		<div className="space-y-5 p-4 sm:p-6">
			{/* Win/Loss Summary + Filter */}
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
				<div className="flex items-center gap-2">
					<span className="text-[11px] text-black/35 dark:text-white/35">
						{t('sales.customer360.quotes.winRate')}
					</span>
					<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)] dark:text-white">
						{winRate}%
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
					<span className="text-[11px] text-black/35 dark:text-white/35">
						{t('sales.customer360.quotes.won')}:{' '}
						<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
							{wonCount}
						</span>
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
					<span className="text-[11px] text-black/35 dark:text-white/35">
						{t('sales.customer360.quotes.lost')}:{' '}
						<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
							{lostCount}
						</span>
					</span>
				</div>

				<div className="sm:ms-auto">
					<Select
						selectedKey={statusFilter}
						onSelectionChange={(key) => setStatusFilter(key as StatusFilter)}
						aria-label={t('sales.customer360.quotes.filterStatus')}
					>
						<Label className="sr-only">
							{t('sales.customer360.quotes.filterStatus')}
						</Label>
						<Button className="flex items-center gap-2 px-3 py-1.5 text-[11px] border border-black/[0.06] dark:border-white/[0.06] rounded-lg text-black/50 dark:text-white/50 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40">
							<SelectValue />
						</Button>
						<Popover
							aria-label="Filter quotes"
							className="w-[min(220px,calc(100vw-24px))] rounded-lg border border-black/[0.06] bg-white p-1 shadow-lg dark:border-white/[0.06] dark:bg-[var(--color-surface)]"
						>
							<ListBox className="outline-none">
								<ListBoxItem
									id="all"
									className="px-3 py-1.5 text-[11px] rounded-md cursor-pointer outline-none data-[focused]:bg-[#2563EB]/[0.08] data-[focused]:text-[#2563EB]"
								>
									{t('sales.customer360.quotes.all')}
								</ListBoxItem>
								<ListBoxItem
									id="won"
									className="px-3 py-1.5 text-[11px] rounded-md cursor-pointer outline-none data-[focused]:bg-[#2563EB]/[0.08] data-[focused]:text-[#2563EB]"
								>
									{t('sales.customer360.quotes.won')}
								</ListBoxItem>
								<ListBoxItem
									id="lost"
									className="px-3 py-1.5 text-[11px] rounded-md cursor-pointer outline-none data-[focused]:bg-[#2563EB]/[0.08] data-[focused]:text-[#2563EB]"
								>
									{t('sales.customer360.quotes.lost')}
								</ListBoxItem>
								<ListBoxItem
									id="pending"
									className="px-3 py-1.5 text-[11px] rounded-md cursor-pointer outline-none data-[focused]:bg-[#2563EB]/[0.08] data-[focused]:text-[#2563EB]"
								>
									{t('sales.customer360.quotes.pending')}
								</ListBoxItem>
							</ListBox>
						</Popover>
					</Select>
				</div>
			</div>

			{/* Quote rows — clean list, expandable */}
			<div className="space-y-0">
				{filtered.map((quote) => (
					<button
						key={quote.id}
						type="button"
						onClick={() =>
							setExpandedId(expandedId === quote.id ? null : quote.id)
						}
						className="flex w-full flex-col gap-2 border-b border-black/[0.04] py-3 text-start transition-colors last:border-b-0 hover:bg-black/[0.01] dark:border-white/[0.04] dark:hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-4"
					>
						{/* Quote number */}
						<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-medium tabular-nums text-[#2563EB] sm:w-[100px] sm:shrink-0">
							{quote.quoteNumber}
						</span>

						{/* Date */}
						<span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-black/40 dark:text-white/40 sm:w-[90px] sm:shrink-0">
							{new Date(quote.createdAt).toLocaleDateString()}
						</span>

						{/* Total */}
						<span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)] dark:text-white sm:flex-1">
							{formatCurrency(quote.total)}
						</span>

						{/* Status pill */}
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-black/50 dark:text-white/50 capitalize">
							{quote.status.replace(/_/g, ' ')}
						</span>

						{/* Outcome */}
						<OutcomeBadge outcome={quote.outcome} />
					</button>
				))}
			</div>
		</div>
	)
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
	if (!outcome || outcome === 'pending') {
		return (
			<span className="text-[11px] text-black/20 dark:text-white/20 sm:w-[50px] sm:text-end">
				&mdash;
			</span>
		)
	}

	const isWon = outcome === 'won'
	return (
		<span
			className={`text-[11px] font-medium sm:w-[50px] sm:text-end ${
				isWon ? 'text-[#22c55e]' : 'text-[#ef4444]'
			}`}
		>
			{outcome.toUpperCase()}
		</span>
	)
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-EG', {
		style: 'currency',
		currency: 'EGP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount)
}

function TabSkeleton() {
	return (
		<div className="p-6 space-y-3 animate-pulse">
			{Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map((key) => (
				<div
					key={key}
					className="h-10 rounded bg-black/[0.03] dark:bg-white/[0.03]"
				/>
			))}
		</div>
	)
}
