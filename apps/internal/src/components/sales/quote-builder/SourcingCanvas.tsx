/**
 * Sourcing summary panel — scales to 1000+ items.
 * Shows assignment progress, source cards with counts,
 * and supports bulk category-based assignment.
 */
import { useMemo, useState } from 'react'
import { SearchMenu } from './SearchMenu'

interface SupplierRecord {
	id: string
	name: string
	tier: string
	score: number
	categories: string[]
}

interface SourcingItem {
	productName: string
	quantity: number
	unit: string
	sourceId: string
	stockAvailable: number
	stockWac: number
}

interface SourcingCanvasProps {
	items: SourcingItem[]
	allSuppliers: SupplierRecord[]
	searchSuppliers: (query: string, itemName?: string) => SupplierRecord[]
	onAssignSource: (itemIndex: number, sourceId: string) => void
}

export function SourcingCanvas({
	items,
	allSuppliers,
	searchSuppliers,
	onAssignSource,
}: SourcingCanvasProps) {
	const [addSupplierOpen, setAddSupplierOpen] = useState(false)

	const totalItems = items.length
	const assignedCount = items.filter((i) => !!i.sourceId).length
	const unassignedCount = totalItems - assignedCount
	const progress =
		totalItems > 0 ? Math.round((assignedCount / totalItems) * 100) : 0

	// Group items by source
	const sourceGroups = useMemo(() => {
		const groups = new Map<
			string,
			{ indices: number[]; items: SourcingItem[] }
		>()

		items.forEach((item, i) => {
			const key = item.sourceId || '__unassigned__'
			const group = groups.get(key) ?? { indices: [], items: [] }
			group.indices.push(i)
			group.items.push(item)
			groups.set(key, group)
		})

		return groups
	}, [items])

	// Active suppliers (ones that have items assigned)
	const activeSupplierIds = useMemo(() => {
		const ids = new Set<string>()
		items.forEach((item) => {
			if (item.sourceId && item.sourceId !== 'warehouse') ids.add(item.sourceId)
		})
		return Array.from(ids)
	}, [items])

	// Warehouse stats
	const warehouseGroup = sourceGroups.get('warehouse')
	const warehouseCount = warehouseGroup?.items.length ?? 0
	const stockableItems = items.filter((i) => i.stockAvailable > 0)

	// Unassigned items
	const _unassignedGroup = sourceGroups.get('__unassigned__')

	// Bulk assign all stockable unassigned items to warehouse
	const assignAllStockToWarehouse = () => {
		items.forEach((item, i) => {
			if (!item.sourceId && item.stockAvailable > 0) {
				onAssignSource(i, 'warehouse')
			}
		})
	}

	// Bulk assign unassigned items to a supplier
	const assignAllUnassignedTo = (sourceId: string) => {
		items.forEach((item, i) => {
			if (!item.sourceId) onAssignSource(i, sourceId)
		})
	}

	return (
		<div className="flex h-full flex-col">
			{/* Progress header */}
			<div className="shrink-0 border-b border-black/[0.04] px-5 py-4 dark:border-white/[0.04]">
				<div className="flex items-baseline justify-between mb-2">
					<h3 className="text-[13px] font-semibold text-[var(--color-text)]">
						Sourcing
					</h3>
					<span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">
						{assignedCount}/{totalItems}
					</span>
				</div>
				{/* Progress bar */}
				<div className="h-1 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
					<div
						className={`h-full rounded-full transition-all duration-300 ${
							progress === 100
								? 'bg-[var(--color-primary)]'
								: 'bg-[var(--color-primary)]/60'
						}`}
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>

			{/* Source cards */}
			<div
				className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2"
				data-module-content
			>
				{/* Unassigned */}
				{unassignedCount > 0 && (
					<div className="rounded-lg border border-dashed border-black/[0.1] px-4 py-3 dark:border-white/[0.1]">
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2">
								<span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-black/20 text-[9px] text-black/30 dark:border-white/20 dark:text-white/30">
									?
								</span>
								<span className="text-[12px] font-medium text-black/50 dark:text-white/50">
									Unassigned
								</span>
							</div>
							<span className="font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold tabular-nums text-black/40 dark:text-white/40">
								{unassignedCount}
							</span>
						</div>
						{/* Quick actions */}
						<div className="flex flex-wrap gap-1.5">
							{stockableItems.some((i) => !i.sourceId) && (
								<button
									type="button"
									onClick={assignAllStockToWarehouse}
									className="rounded-full bg-[var(--color-primary)]/[0.08] px-2.5 py-1 text-[10px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/[0.14] transition-colors"
								>
									Auto-fill from stock
								</button>
							)}
							{activeSupplierIds.map((id) => {
								const sup = allSuppliers.find((s) => s.id === id)
								if (!sup) return null
								const initials = sup.name
									.split(' ')
									.map((w) => w[0])
									.slice(0, 2)
									.join('')
								return (
									<button
										key={id}
										type="button"
										onClick={() => assignAllUnassignedTo(id)}
										className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] font-medium text-black/50 hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-white/50 dark:hover:bg-white/[0.1] transition-colors"
									>
										All → {initials}
									</button>
								)
							})}
						</div>
					</div>
				)}

				{/* Warehouse card */}
				<SourceCard
					label="Warehouse"
					initials="W"
					count={warehouseCount}
					detail={`${stockableItems.length} items in stock`}
					variant="primary"
				/>

				{/* Supplier cards */}
				{activeSupplierIds.map((id) => {
					const sup = allSuppliers.find((s) => s.id === id)
					if (!sup) return null
					const group = sourceGroups.get(id)
					const count = group?.items.length ?? 0
					const initials = sup.name
						.split(' ')
						.map((w) => w[0])
						.slice(0, 2)
						.join('')

					return (
						<SourceCard
							key={id}
							label={sup.name}
							initials={initials}
							count={count}
							detail={`${sup.tier} · ${sup.score}/100`}
							variant="default"
						/>
					)
				})}

				{/* Add supplier */}
				<button
					type="button"
					onClick={() => setAddSupplierOpen(true)}
					className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/[0.08] px-3 py-3 text-[12px] text-black/40 transition-colors hover:border-[var(--color-primary)]/30 hover:text-[var(--color-primary)] dark:border-white/[0.08] dark:text-white/40"
				>
					<svg
						aria-hidden="true"
						width="12"
						height="12"
						viewBox="0 0 14 14"
						fill="none"
					>
						<path
							d="M7 3v8M3 7h8"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
					Add Supplier
				</button>
			</div>

			{/* Footer summary */}
			<div className="shrink-0 border-t border-black/[0.04] px-5 py-2.5 dark:border-white/[0.04]">
				<div className="flex flex-wrap items-center gap-3 text-[11px] text-black/40 dark:text-white/40">
					{warehouseCount > 0 && (
						<span>
							<span className="font-medium text-[var(--color-primary)]">
								{warehouseCount}
							</span>{' '}
							stock
						</span>
					)}
					{activeSupplierIds.map((id) => {
						const sup = allSuppliers.find((s) => s.id === id)
						const count = sourceGroups.get(id)?.items.length ?? 0
						if (!sup || count === 0) return null
						return (
							<span key={id}>
								<span className="font-medium text-[var(--color-text)]">
									{count}
								</span>{' '}
								{sup.name.split(' ')[0]}
							</span>
						)
					})}
					{unassignedCount > 0 && (
						<span>
							<span className="font-medium">{unassignedCount}</span> unassigned
						</span>
					)}
				</div>
			</div>

			{/* Add supplier modal — reuses SearchMenu */}
			<SearchMenu
				isOpen={addSupplierOpen}
				onClose={() => setAddSupplierOpen(false)}
				placeholder="Search suppliers..."
			>
				{(search) => {
					const results = searchSuppliers(search).filter(
						(s) => !activeSupplierIds.includes(s.id),
					)

					if (results.length === 0) {
						return (
							<div className="flex items-center justify-center py-12">
								<p className="text-[13px] text-[var(--color-text-subtle)]">
									{search ? 'No suppliers found' : 'No suppliers available'}
								</p>
							</div>
						)
					}

					return (
						<div className="flex flex-col py-1">
							{results.map((sup) => {
								const initials = sup.name
									.split(' ')
									.map((w) => w[0])
									.slice(0, 2)
									.join('')
								return (
									<button
										key={sup.id}
										type="button"
										onClick={() => {
											// Add this supplier and assign all unassigned items to it
											items.forEach((item, i) => {
												if (!item.sourceId) onAssignSource(i, sup.id)
											})
											setAddSupplierOpen(false)
										}}
										className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] lg:items-center"
									>
										<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
											<span className="text-[10px] font-semibold text-[var(--color-text-subtle)]">
												{initials}
											</span>
										</span>
										<div className="flex-1 min-w-0">
											<span className="break-words text-[13px] font-medium text-[var(--color-text)] lg:truncate">
												{sup.name}
											</span>
											<p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">
												{sup.tier} · {sup.score}/100
											</p>
										</div>
									</button>
								)
							})}
						</div>
					)
				}}
			</SearchMenu>
		</div>
	)
}

// ─── Source card ─────────────────────────────────────────

function SourceCard({
	label,
	initials,
	count,
	detail,
	variant,
}: {
	label: string
	initials: string
	count: number
	detail: string
	variant: 'primary' | 'default'
}) {
	return (
		<div className="rounded-lg bg-black/[0.02] px-4 py-3 dark:bg-white/[0.02]">
			<div className="flex items-center gap-2.5">
				<span
					className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
						variant === 'primary'
							? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
							: 'bg-black/[0.06] text-black/50 dark:bg-white/[0.08] dark:text-white/50'
					}`}
				>
					{initials}
				</span>
				<div className="flex-1 min-w-0">
					<span className="text-[12px] font-medium text-[var(--color-text)]">
						{label}
					</span>
					<p className="text-[10px] text-black/30 dark:text-white/30">
						{detail}
					</p>
				</div>
				<span
					className={`font-[family-name:var(--font-geist-mono)] text-[14px] font-semibold tabular-nums ${
						count > 0
							? variant === 'primary'
								? 'text-[var(--color-primary)]'
								: 'text-[var(--color-text)]'
							: 'text-black/20 dark:text-white/20'
					}`}
				>
					{count}
				</span>
			</div>
		</div>
	)
}
