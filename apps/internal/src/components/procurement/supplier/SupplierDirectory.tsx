import { useQuery } from '@tanstack/react-query'
import Fuse from 'fuse.js'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Button, Input, SearchField } from 'react-aria-components'
import { getSupplierDirectory } from '../../../lib/server/procurement-suppliers'
import { useProcurementStore } from '../../../stores/procurement'
import { Button as UiButton } from '../../ui'
import { SupplierTierBadge } from './SupplierTierBadge'

// ─── Constants ────────────────────────────────────────────

const TIER_OPTIONS: { id: string; label: string }[] = [
	{ id: 'all', label: 'All' },
	{ id: 'preferred', label: 'Preferred' },
	{ id: 'approved', label: 'Approved' },
	{ id: 'conditional', label: 'Conditional' },
	{ id: 'new', label: 'New' },
]

const PAGE_SIZE = 20

function TrendIndicator({ trend }: { trend: string }) {
	if (trend === 'improving') {
		return (
			<span className="flex items-center gap-1 text-green-600 text-[12px] font-medium leading-none select-none">
				<span className="text-[16px]">↗</span> Improving
			</span>
		)
	}
	if (trend === 'declining') {
		return (
			<span className="flex items-center gap-1 text-red-500 text-[12px] font-medium leading-none select-none">
				<span className="text-[16px]">↘</span> Declining
			</span>
		)
	}
	return (
		<span className="flex items-center gap-1 text-black/40 dark:text-white/40 text-[12px] font-medium leading-none select-none">
			<span className="text-[16px]">→</span> Stable
		</span>
	)
}

// ─── Main Component ───────────────────────────────────────

export function SupplierDirectory() {
	const [search, setSearch] = useState('')
	const [tierFilter, setTierFilter] = useState<string>('all')
	const [page, setPage] = useState(1)
	const setSelectedSupplierId = useProcurementStore(
		(s) => s.setSelectedSupplierId,
	)

	const { data, isLoading } = useQuery({
		queryKey: ['supplier-directory', page],
		queryFn: () => getSupplierDirectory({ data: { page, limit: PAGE_SIZE } }),
		staleTime: 60_000,
	})

	// Client-side fuse.js search for responsive filtering
	const fuse = useMemo(() => {
		if (!data?.suppliers) return null
		return new Fuse(data.suppliers, {
			keys: ['supplierName'],
			threshold: 0.3,
		})
	}, [data?.suppliers])

	const filteredSuppliers = useMemo(() => {
		if (!data?.suppliers) return []
		let results = data.suppliers

		if (search && fuse) {
			results = fuse.search(search).map((r) => r.item)
		}

		if (tierFilter !== 'all') {
			results = results.filter((s) => s.tier === tierFilter)
		}

		// Sort by score descending
		results = [...results].sort((a, b) => b.overallScore - a.overallScore)

		return results
	}, [data?.suppliers, search, tierFilter, fuse])

	return (
		<div className="space-y-4 p-4">
			{/* Search + Filter bar */}
			<div className="flex items-center gap-3">
				<SearchField
					value={search}
					onChange={setSearch}
					className="flex-1 relative"
					aria-label="Search suppliers"
				>
					<div className="relative">
						<svg
							className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-black/40 dark:text-white/40"
							viewBox="0 0 16 16"
							fill="none"
							aria-hidden="true"
						>
							<circle
								cx="7"
								cy="7"
								r="5"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							<path
								d="M11 11L14 14"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							/>
						</svg>
						<Input
							placeholder="Search suppliers..."
							className="w-full rounded-lg border border-black/[0.06] bg-transparent py-2 ps-9 pe-3 text-[13px] text-black/80 placeholder:text-black/30 outline-none focus:border-[#2563EB]/30 dark:border-white/[0.06] dark:text-white/80 dark:placeholder:text-white/30"
						/>
					</div>
				</SearchField>

				{/* Tier filter pills */}
				<div className="flex items-center gap-0.5">
					{TIER_OPTIONS.map((opt) => (
						<Button
							key={opt.id}
							className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium outline-none transition-colors
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                ${
									tierFilter === opt.id
										? 'bg-[#2563EB]/10 text-[#2563EB]'
										: 'text-black/40 dark:text-white/40 data-[hovered]:text-black/60 dark:data-[hovered]:text-white/60'
								}`}
							onPress={() => {
								setTierFilter(opt.id)
								setPage(1)
							}}
						>
							{opt.label}
						</Button>
					))}
				</div>
			</div>

			{/* Card grid */}
			{isLoading ? (
				<div className="flex items-center justify-center h-48">
					<p className="text-[13px] text-black/40 dark:text-white/40">
						Loading...
					</p>
				</div>
			) : filteredSuppliers.length === 0 ? (
				<div className="flex items-center justify-center h-48">
					<p className="text-[13px] text-black/40 dark:text-white/40">
						No suppliers found
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{filteredSuppliers.map((supplier, i) => (
						<motion.button
							key={supplier.supplierId}
							type="button"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: i * 0.02 }}
							className="flex flex-col rounded-xl p-4 text-start outline-none transition-colors
                hover:bg-black/[0.02] dark:hover:bg-white/[0.02]
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-inset data-[focus-visible]:ring-[#2563EB]/50"
							onClick={() => setSelectedSupplierId(supplier.supplierId)}
						>
							{/* Score + Trend */}
							<div className="flex items-center gap-3">
								<span className="font-[family-name:var(--font-geist-mono)] text-[28px] font-bold tabular-nums leading-none text-black/80 dark:text-white/80">
									{supplier.overallScore}
								</span>
								<TrendIndicator trend={supplier.trend} />
							</div>

							{/* Divider */}
							<div className="border-b border-black/[0.04] dark:border-white/[0.04] mt-3 mb-3" />

							{/* Name */}
							<div className="text-[13px] font-semibold text-black/80 dark:text-white/80">
								{supplier.supplierName}
							</div>

							{/* Tier */}
							<div className="mt-1.5">
								<SupplierTierBadge tier={supplier.tier} />
							</div>

							{/* Metrics line */}
							<div className="mt-3 font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/50 dark:text-white/50">
								{supplier.onTimeDeliveryRate}% on-time ·{' '}
								{(100 - supplier.qualityRejectionRate).toFixed(1)}% quality
							</div>
						</motion.button>
					))}
				</div>
			)}

			{/* Pagination */}
			{data && data.total > PAGE_SIZE && (
				<div className="flex items-center justify-between">
					<p className="text-[12px] text-black/40 dark:text-white/40">
						<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
							{(page - 1) * PAGE_SIZE + 1}-
							{Math.min(page * PAGE_SIZE, data.total)}
						</span>
						{' of '}
						<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
							{data.total}
						</span>
					</p>
					<div className="flex items-center gap-1">
						<UiButton
							variant="ghost"
							onPress={() => setPage((p) => Math.max(1, p - 1))}
							isDisabled={page <= 1}
							className="text-[12px]"
						>
							Prev
						</UiButton>
						<span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40 px-1">
							{page}
						</span>
						<UiButton
							variant="ghost"
							onPress={() => setPage((p) => p + 1)}
							isDisabled={page * PAGE_SIZE >= data.total}
							className="text-[12px]"
						>
							Next
						</UiButton>
					</div>
				</div>
			)}
		</div>
	)
}
