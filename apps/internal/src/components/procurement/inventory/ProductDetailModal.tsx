import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	Bell,
	Check,
	ChevronRight,
	Clock,
	Flame,
	Loader2,
	Pencil,
	Phone,
	Truck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { sanitizeCost } from '../../../lib/inputs'
import type { QuoteFreshness } from '../../../lib/server/inventory'
import {
	getInventoryProductDetail,
	updateSupplierQuote,
} from '../../../lib/server/inventory'
import { SlidePanel } from '../../shared/SlidePanel'
import { PriceConfirmDialog } from './PriceConfirmDialog'
import { SupplierProfileView } from './SupplierProfileView'

interface ProductDetailModalProps {
	slug: string | null
	onClose: () => void
}

const TIER_LABEL = {
	preferred: 'Preferred',
	approved: 'Approved',
	conditional: 'Conditional',
	new: 'New',
} as const

const TIER_TONE = {
	preferred:
		'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20',
	approved:
		'bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-[var(--color-primary)]/20',
	conditional:
		'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/25',
	new: 'bg-black/[0.06] text-black/60 dark:bg-white/[0.08] dark:text-white/60 ring-black/10 dark:ring-white/10',
} as const

const QUOTE_LABEL: Record<QuoteFreshness, string> = {
	confirmed: 'Confirmed',
	reconfirm: 'Re-confirm',
	needs_quote: 'Needs quote',
}

const QUOTE_TONE: Record<QuoteFreshness, string> = {
	confirmed:
		'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20',
	reconfirm:
		'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/25',
	needs_quote:
		'bg-black/[0.06] text-black/55 dark:bg-white/[0.08] dark:text-white/55 ring-black/10 dark:ring-white/10',
}

function formatRelative(iso: string | null): string {
	if (!iso) return '—'
	const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000
	if (hours < 1) return `${Math.round(hours * 60)}m ago`
	if (hours < 24) return `${Math.round(hours)}h ago`
	return `${Math.floor(hours / 24)}d ago`
}

// ─── Panel (slide-in side window) ────────────────────────

export function ProductDetailModal({ slug, onClose }: ProductDetailModalProps) {
	const isOpen = slug !== null
	const qc = useQueryClient()

	// Drill-down state — supplier row opens the full supplier profile inline.
	const [activeSupplier, setActiveSupplier] = useState<string | null>(null)

	// Pending confirmation for supplier price edits.
	const [pendingEdit, setPendingEdit] = useState<{
		supplierId: string
		supplierName: string
		oldCost: number
		newCost: number
	} | null>(null)

	useEffect(() => {
		if (!isOpen) {
			setActiveSupplier(null)
			setPendingEdit(null)
		}
	}, [isOpen])

	const { data, isLoading } = useQuery({
		queryKey: ['inventory-product-detail', slug],
		queryFn: () => getInventoryProductDetail({ data: { slug: slug ?? '' } }),
		enabled: isOpen && !!slug,
		staleTime: 30_000,
	})

	const quoteMutation = useMutation({
		mutationFn: updateSupplierQuote,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['inventory-product-detail', slug] })
			qc.invalidateQueries({ queryKey: ['inventory-overview'] })
			qc.invalidateQueries({ queryKey: ['inventory-top-suppliers'] })
			qc.invalidateQueries({ queryKey: ['sales-outdated-prices'] })
		},
	})

	// Queue the edit; the mutation fires only after the user confirms.
	const handleSaveQuote = (supplierId: string, rawCost: number) => {
		if (!slug || !data) return
		const supplier = data.suppliers.find((s) => s.id === supplierId)
		if (!supplier) return
		setPendingEdit({
			supplierId,
			supplierName: supplier.name,
			oldCost: supplier.rawCost,
			newCost: rawCost,
		})
	}

	const commitPendingEdit = (_proof?: string) => {
		// _proof will feed into the price_change_log accessor once that lands.
		if (!slug || !pendingEdit) return
		quoteMutation.mutate({
			data: {
				slug,
				supplierId: pendingEdit.supplierId,
				rawCost: pendingEdit.newCost,
			},
		})
		setPendingEdit(null)
	}

	const best = data?.suppliers
		? [...data.suppliers].sort((a, b) => a.rawCost - b.rawCost)[0]
		: null

	return (
		<>
			<PriceConfirmDialog
				isOpen={pendingEdit !== null}
				productName={data?.name ?? ''}
				supplierName={pendingEdit?.supplierName}
				unit={data?.unit ?? ''}
				oldCost={pendingEdit?.oldCost ?? 0}
				newCost={pendingEdit?.newCost ?? 0}
				onConfirm={commitPendingEdit}
				onCancel={() => setPendingEdit(null)}
			/>
			<SlidePanel
				isOpen={isOpen}
				onClose={onClose}
				maxWidth={620}
				panelKey="product-panel"
				ariaLabel="Product details"
				scope="procurement"
			>
				{isLoading || !data ? (
					<div className="flex h-full items-center justify-center">
						<Loader2
							size={20}
							strokeWidth={1.5}
							className="animate-spin text-[var(--color-text-subtle)]"
						/>
					</div>
				) : activeSupplier ? (
					<div className="flex h-full flex-col">
						<button
							type="button"
							onClick={() => setActiveSupplier(null)}
							className="mx-5 mt-4 mb-2 inline-flex w-fit items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text)]"
						>
							← back to product
						</button>
						<div className="flex-1 min-h-0 overflow-y-auto">
							<SupplierProfileView
								name={activeSupplier}
								onBack={() => setActiveSupplier(null)}
							/>
						</div>
					</div>
				) : (
					<div className="flex h-full flex-col min-h-0">
						{/* Compact image hero */}
						<div className="relative h-40 shrink-0 overflow-hidden">
							<img
								src={data.image}
								alt={data.name}
								className="absolute inset-0 h-full w-full object-cover"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
							<div className="absolute bottom-3 start-5 end-5">
								<div className="mb-1 flex items-center gap-2">
									<span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/75">
										{data.broadCategory}
									</span>
									<span className="h-px w-6 bg-white/40" />
									<span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-white/65">
										{data.sku}
									</span>
								</div>
								<h2 className="text-[19px] font-semibold leading-tight text-white">
									{data.name}
								</h2>
								<p className="mt-0.5 text-[11px] text-white/55">
									{data.name_ar}
								</p>
							</div>
						</div>

						{/* Scrollable body */}
						<div className="flex-1 min-h-0 overflow-y-auto">
							{/* Cost band */}
							<div className="border-b border-black/[0.05] px-5 py-4 dark:border-white/[0.06]">
								<div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
									Current supplier cost
								</div>
								<div className="mt-1 flex items-baseline gap-2">
									<span className="font-[family-name:var(--font-geist-mono)] text-[28px] font-semibold leading-none tabular-nums text-[var(--color-text)]">
										{data.currentRawCost > 0
											? data.currentRawCost.toLocaleString('en-EG', {
													minimumFractionDigits: 2,
												})
											: '—'}
									</span>
									<span className="text-[11px] text-[var(--color-text-subtle)]">
										EGP / {data.unit}
									</span>
								</div>
								<div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--color-text-subtle)]">
									<span>
										Sell-ready:{' '}
										{data.currentSupplierCost.toLocaleString('en-EG', {
											minimumFractionDigits: 2,
										})}{' '}
										EGP (incl. buffer)
									</span>
									{data.lastUpdatedAt && (
										<>
											<span>·</span>
											<span>updated {formatRelative(data.lastUpdatedAt)}</span>
										</>
									)}
								</div>
							</div>

							{/* Meta row */}
							<dl className="flex items-center gap-5 border-b border-black/[0.05] px-5 py-3 dark:border-white/[0.06]">
								<div>
									<dt className="text-[8px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
										Unit
									</dt>
									<dd className="mt-0.5 text-[11px] font-medium text-[var(--color-text)]">
										{data.unit}
									</dd>
								</div>
								<div className="h-8 w-px bg-black/[0.06] dark:bg-white/[0.07]" />
								<div>
									<dt className="text-[8px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
										Weight
									</dt>
									<dd className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] font-medium tabular-nums text-[var(--color-text)]">
										{data.weight_kg} kg
									</dd>
								</div>
								<div className="h-8 w-px bg-black/[0.06] dark:bg-white/[0.07]" />
								<div className="min-w-0">
									<dt className="text-[8px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
										Brand
									</dt>
									<dd className="mt-0.5 truncate text-[11px] font-medium text-[var(--color-text)]">
										{data.brand ?? '—'}
									</dd>
								</div>
							</dl>

							{/* Description + specs */}
							<div className="border-b border-black/[0.05] px-5 py-4 dark:border-white/[0.06]">
								<p className="text-[12px] leading-relaxed text-[var(--color-text-muted)]">
									{data.description}
								</p>
								<div className="mt-4">
									<div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
										Specifications
									</div>
									<dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
										{Object.entries(data.specifications).map(([k, v]) => (
											<div
												key={k}
												className="flex items-baseline justify-between gap-2 border-b border-dashed border-black/[0.05] pb-1 dark:border-white/[0.06]"
											>
												<dt className="text-[10px] capitalize text-[var(--color-text-subtle)]">
													{k.replace(/_/g, ' ')}
												</dt>
												<dd className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text)] text-end">
													{String(v)}
												</dd>
											</div>
										))}
									</dl>
								</div>
							</div>

							{/* Suppliers */}
							<div className="px-3 py-4">
								<div className="flex items-baseline justify-between px-2 pb-2">
									<div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
										Suppliers
									</div>
									<span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
										{data.suppliers.length}
									</span>
								</div>

								{data.pendingRequests.length > 0 && (
									<div className="mx-2 mb-3 flex items-center gap-1.5 rounded-md bg-red-500/[0.07] px-2.5 py-1.5 dark:bg-red-500/10">
										<Bell
											size={11}
											strokeWidth={2.5}
											className="shrink-0 text-red-500"
										/>
										<span className="text-[10px] text-red-700 dark:text-red-300">
											{data.pendingRequests.length} active request ·{' '}
											{data.pendingRequests
												.map((r) => r.customerContext)
												.join(', ')}
										</span>
									</div>
								)}

								<ul className="flex flex-col divide-y divide-black/[0.04] dark:divide-white/[0.05]">
									{data.suppliers.map((s) => (
										<SupplierRow
											key={s.id}
											supplier={s}
											unit={data.unit}
											isBest={best?.id === s.id}
											isSaving={
												quoteMutation.isPending &&
												quoteMutation.variables?.data.supplierId === s.id
											}
											onSave={(rawCost) => handleSaveQuote(s.id, rawCost)}
											onOpenProfile={() => setActiveSupplier(s.name)}
										/>
									))}
								</ul>
							</div>
						</div>

						{/* Footer */}
						<div className="mt-auto flex items-center justify-between border-t border-black/[0.05] bg-black/[0.015] px-5 py-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
							<span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-subtle)]">
								<Check
									size={10}
									strokeWidth={2.5}
									className="text-emerald-500"
								/>
								Price last saved {formatRelative(data.lastUpdatedAt)}
							</span>
							<button
								type="button"
								onClick={onClose}
								className="text-[10px] font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary)]/80"
							>
								Close
							</button>
						</div>
					</div>
				)}
			</SlidePanel>
		</>
	)
}

// ─── Supplier row (unchanged structure) ──────────────────

interface SupplierRowProps {
	supplier: {
		id: string
		name: string
		rawCost: number
		leadTimeDays: number
		minOrderQty: number
		lastQuotedAt: string
		quoteFreshness: QuoteFreshness
		tier: 'preferred' | 'approved' | 'conditional' | 'new'
		paymentTerms: string
		notes: string | null
		isPrimary: boolean
	}
	unit: string
	isBest: boolean
	isSaving: boolean
	onSave: (rawCost: number) => void
	onOpenProfile: () => void
}

function SupplierRow({
	supplier,
	unit,
	isBest,
	isSaving,
	onSave,
	onOpenProfile,
}: SupplierRowProps) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState('')

	const beginEdit = () => {
		setDraft(String(supplier.rawCost))
		setEditing(true)
	}
	const commit = () => {
		const v = sanitizeCost(draft)
		if (v !== null && v !== supplier.rawCost) {
			onSave(v)
		}
		setEditing(false)
	}
	const cancel = () => {
		setEditing(false)
		setDraft('')
	}

	return (
		<li
			className={`group relative rounded-xl px-3 py-3 ${
				supplier.isPrimary
					? 'bg-[var(--color-primary)]/[0.04] ring-1 ring-[var(--color-primary)]/15'
					: 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
			}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={onOpenProfile}
							className="group/name inline-flex items-center gap-1 truncate text-[12px] font-semibold text-[var(--color-text)] outline-none transition-colors hover:text-[var(--color-primary)]"
						>
							{supplier.name}
							<ChevronRight
								size={11}
								strokeWidth={2.5}
								className="text-[var(--color-text-subtle)] opacity-0 transition-opacity group-hover/name:opacity-100"
							/>
						</button>
						{supplier.isPrimary && (
							<span className="inline-flex items-center rounded-full bg-[var(--color-primary)]/15 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
								Current
							</span>
						)}
						{isBest && !supplier.isPrimary && (
							<span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
								<Flame size={8} strokeWidth={3} />
								Best
							</span>
						)}
						<span
							className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ring-1 ring-inset ${QUOTE_TONE[supplier.quoteFreshness]}`}
						>
							{QUOTE_LABEL[supplier.quoteFreshness]}
						</span>
					</div>
					<div className="mt-0.5 flex items-center gap-1.5">
						<span
							className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ring-1 ring-inset ${TIER_TONE[supplier.tier]}`}
						>
							{TIER_LABEL[supplier.tier]}
						</span>
						<span className="text-[10px] text-[var(--color-text-subtle)]">
							{supplier.paymentTerms}
						</span>
					</div>
				</div>

				<div className="shrink-0 text-end">
					<div className="mb-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
						Last price
					</div>
					{editing ? (
						<input
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							onBlur={commit}
							onKeyDown={(e) => {
								if (e.key === 'Enter') commit()
								if (e.key === 'Escape') cancel()
							}}
							className="w-24 bg-transparent text-end font-[family-name:var(--font-geist-mono)] text-[16px] font-semibold tabular-nums text-[var(--color-text)] outline-none border-b border-[var(--color-primary)]/50 pb-0.5"
						/>
					) : (
						<button
							type="button"
							onClick={beginEdit}
							disabled={isSaving}
							className="group/price inline-flex items-baseline gap-1 outline-none disabled:cursor-wait"
						>
							<span className="font-[family-name:var(--font-geist-mono)] text-[16px] font-semibold leading-none tabular-nums text-[var(--color-text)]">
								{isSaving ? (
									<Loader2
										size={14}
										strokeWidth={2.5}
										className="inline animate-spin text-[var(--color-primary)]"
									/>
								) : (
									supplier.rawCost.toLocaleString('en-EG', {
										minimumFractionDigits: 2,
									})
								)}
							</span>
							<Pencil
								size={10}
								strokeWidth={2}
								className="text-[var(--color-text-subtle)] opacity-0 transition-opacity group-hover/price:opacity-100"
							/>
						</button>
					)}
					<div className="mt-0.5 text-[9px] text-[var(--color-text-subtle)]">
						EGP / {unit}
					</div>
				</div>
			</div>

			<div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-[var(--color-text-subtle)]">
				<span className="inline-flex items-center gap-1">
					<Truck size={10} strokeWidth={2} />
					{supplier.leadTimeDays}d lead
				</span>
				<span className="inline-flex items-center gap-1">
					<Clock size={10} strokeWidth={2} />
					quoted {formatRelative(supplier.lastQuotedAt)}
				</span>
				<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
					MOQ {supplier.minOrderQty}
				</span>
				{supplier.quoteFreshness !== 'confirmed' && (
					<span className="inline-flex items-center gap-1 text-[var(--color-text-muted)]">
						<Phone size={10} strokeWidth={2} />
						call to re-confirm
					</span>
				)}
			</div>

			{supplier.notes && (
				<p className="mt-1.5 text-[10px] italic text-[var(--color-text-subtle)]">
					{supplier.notes}
				</p>
			)}
		</li>
	)
}
