import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
	preferred: 'preferred',
	approved: 'approved',
	conditional: 'conditional',
	new: 'new',
} as const

const QUOTE_LABEL: Record<QuoteFreshness, string> = {
	confirmed: 'confirmed',
	reconfirm: 're-confirm',
	needs_quote: 'needs quote',
}

const QUOTE_TONE: Record<QuoteFreshness, string> = {
	confirmed: 'var(--compendium-fresh)',
	reconfirm: 'var(--compendium-aging)',
	needs_quote: 'var(--compendium-stale)',
}

function formatRelative(iso: string | null): string {
	if (!iso) return '—'
	const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000
	if (hours < 1) return `${Math.round(hours * 60)}m ago`
	if (hours < 24) return `${Math.round(hours)}h ago`
	return `${Math.floor(hours / 24)}d ago`
}

function toRoman(n: number): string {
	const map: [number, string][] = [
		[10, 'X'],
		[9, 'IX'],
		[5, 'V'],
		[4, 'IV'],
		[1, 'I'],
	]
	let out = ''
	let rest = n
	for (const [val, letters] of map) {
		while (rest >= val) {
			out += letters
			rest -= val
		}
	}
	return out
}

// ─── Panel ───────────────────────────────────────────────

export function ProductDetailModal({ slug, onClose }: ProductDetailModalProps) {
	const isOpen = slug !== null
	const qc = useQueryClient()

	const [activeSupplier, setActiveSupplier] = useState<string | null>(null)
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
				maxWidth={640}
				panelKey="product-panel"
				ariaLabel="Product details"
				scope="procurement"
			>
				<div className="compendium-theme flex h-full flex-col bg-[var(--folio)] text-[var(--ink)]">
					{isLoading || !data ? (
						<div className="flex h-full items-center justify-center">
							<p
								className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
								style={{ fontSize: '13px' }}
							>
								turning to the plate…
							</p>
						</div>
					) : activeSupplier ? (
						<div className="flex h-full flex-col">
							<button
								type="button"
								onClick={() => setActiveSupplier(null)}
								className="group mx-8 mt-6 mb-2 inline-flex w-fit items-baseline gap-1.5 outline-none"
							>
								<span
									aria-hidden="true"
									className="transition-transform group-hover:-translate-x-[3px]"
									style={{
										fontFamily: 'var(--font-fraunces)',
										fontStyle: 'italic',
										fontSize: '14px',
										color: 'var(--compendium-brand)',
									}}
								>
									←
								</span>
								<span
									className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)] transition-colors group-hover:text-[var(--ink)]"
									style={{ fontSize: '12px' }}
								>
									back to the plate
								</span>
							</button>
							<div className="flex-1 min-h-0 overflow-y-auto">
								<SupplierProfileView
									name={activeSupplier}
									onBack={() => setActiveSupplier(null)}
								/>
							</div>
						</div>
					) : (
						<>
							<ProductMasthead data={data} />

							<div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
								<SectionRule label="Description" />
								<p
									className="mt-3 font-[family-name:var(--font-fraunces)] text-[var(--ink-soft)]"
									style={{
										fontSize: '13.5px',
										lineHeight: 1.55,
										letterSpacing: '-0.003em',
									}}
								>
									{data.description}
								</p>

								<SectionRule label="Specifications" />
								<dl className="mt-2 grid grid-cols-2 gap-x-6">
									{Object.entries(data.specifications).map(([k, v]) => (
										<div
											key={k}
											className="flex items-baseline justify-between gap-2 border-b border-[var(--rule-soft)] py-1.5"
										>
											<dt
												className="font-[family-name:var(--font-fraunces)] italic capitalize text-[var(--ink-mid)]"
												style={{ fontSize: '11px' }}
											>
												{k.replace(/_/g, ' ')}
											</dt>
											<dd
												className="font-[family-name:var(--font-geist-mono)] tabular-nums text-end text-[var(--ink)]"
												style={{ fontSize: '11px' }}
											>
												{String(v)}
											</dd>
										</div>
									))}
								</dl>

								<SectionRule label={`Suppliers · ${data.suppliers.length}`} />

								{data.pendingRequests.length > 0 && (
									<div
										className="mt-3 border-y border-[var(--compendium-stale)] py-2"
										style={{
											borderTopWidth: '2px',
											borderBottomWidth: '1px',
										}}
									>
										<p
											className="font-[family-name:var(--font-fraunces)] italic"
											style={{
												fontSize: '11.5px',
												color: 'var(--compendium-stale)',
												letterSpacing: '0.003em',
											}}
										>
											sales is waiting · {data.pendingRequests.length} request
											{data.pendingRequests.length === 1 ? '' : 's'} —{' '}
											{data.pendingRequests
												.map((r) => r.customerContext)
												.join(', ')}
										</p>
									</div>
								)}

								<ol className="mt-2 flex flex-col">
									{data.suppliers.map((s, idx) => (
										<SupplierEntry
											key={s.id}
											index={idx}
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
								</ol>
							</div>

							{/* Footer */}
							<div className="shrink-0 border-t border-[var(--rule)] px-8 py-4">
								<div className="flex items-baseline justify-between">
									<span
										className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
										style={{ fontSize: '11px' }}
									>
										last price saved {formatRelative(data.lastUpdatedAt)}
									</span>
									<button
										type="button"
										onClick={onClose}
										className="group inline-flex items-baseline gap-1.5 outline-none"
									>
										<span
											className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)] transition-colors group-hover:text-[var(--ink)]"
											style={{ fontSize: '12px' }}
										>
											close the plate
										</span>
										<span
											aria-hidden="true"
											className="transition-transform group-hover:translate-x-[3px]"
											style={{
												fontFamily: 'var(--font-fraunces)',
												fontStyle: 'italic',
												fontSize: '13px',
												color: 'var(--compendium-brand)',
											}}
										>
											→
										</span>
									</button>
								</div>
							</div>
						</>
					)}
				</div>
			</SlidePanel>
		</>
	)
}

// ─── Masthead ────────────────────────────────────────────

function ProductMasthead({
	data,
}: {
	data: {
		name: string
		name_ar: string
		sku: string
		unit: string
		brand: string | null
		weight_kg: number | null
		broadCategory: string
		image: string
		currentRawCost: number
		currentSupplierCost: number
		lastUpdatedAt: string | null
	}
}) {
	return (
		<header className="shrink-0 border-b border-[var(--rule)] px-8 pt-7 pb-6">
			{/* Eyebrow */}
			<div className="flex items-baseline gap-2">
				<span
					className="font-[family-name:var(--font-fraunces)] italic leading-none text-[var(--compendium-brand)]"
					style={{ fontSize: '11px', letterSpacing: '0.02em' }}
				>
					Plate
				</span>
				<span
					className="font-[family-name:var(--font-fraunces)] italic leading-none text-[var(--ink-mid)]"
					style={{ fontSize: '10.5px' }}
				>
					· {data.broadCategory}
				</span>
			</div>

			{/* Title + image */}
			<div className="mt-2 flex items-start gap-5">
				<div className="min-w-0 flex-1">
					<h2
						className="font-[family-name:var(--font-fraunces)] leading-[1.06] text-[var(--ink)]"
						style={{
							fontSize: '26px',
							fontWeight: 500,
							letterSpacing: '-0.02em',
						}}
					>
						{data.name}
					</h2>
					<p
						className="mt-1 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
						style={{ fontSize: '13px', letterSpacing: '-0.003em' }}
					>
						{data.name_ar}
					</p>
					<div
						className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[var(--ink-mid)]"
						style={{ fontSize: '11px' }}
					>
						<span className="font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.1em]">
							{data.sku}
						</span>
						{data.brand && (
							<>
								<span className="opacity-60">·</span>
								<span className="font-[family-name:var(--font-fraunces)] italic">
									{data.brand}
								</span>
							</>
						)}
						{data.weight_kg && (
							<>
								<span className="opacity-60">·</span>
								<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
									{data.weight_kg} kg
								</span>
							</>
						)}
					</div>
				</div>

				{/* Vignette — framed product plate, old-atlas style */}
				<div
					className="shrink-0 overflow-hidden"
					style={{
						width: '96px',
						height: '96px',
						border: '1px solid var(--rule)',
						padding: '4px',
						background: 'var(--folio-deep)',
					}}
				>
					<img
						src={data.image}
						alt={data.name}
						className="h-full w-full object-cover"
						style={{ filter: 'saturate(0.85) contrast(0.97)' }}
					/>
				</div>
			</div>

			{/* Cost band */}
			<div className="mt-6 flex items-end justify-between gap-6 border-t border-[var(--rule-soft)] pt-5">
				<div className="flex flex-col">
					<span
						className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
						style={{ fontSize: '10.5px', letterSpacing: '0.02em' }}
					>
						current supplier cost
					</span>
					<span
						className="compendium-numeral mt-1 font-[family-name:var(--font-fraunces)] leading-none text-[var(--ink)]"
						style={{
							fontSize: '40px',
							fontWeight: 500,
							letterSpacing: '-0.035em',
						}}
					>
						{data.currentRawCost > 0
							? data.currentRawCost.toLocaleString('en-EG', {
									minimumFractionDigits: 2,
								})
							: '—'}
					</span>
					<span
						className="mt-1 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
						style={{ fontSize: '11px' }}
					>
						EGP per {data.unit}
					</span>
				</div>

				<div className="flex flex-col items-end gap-0.5">
					<span
						className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
						style={{ fontSize: '10.5px' }}
					>
						sell-ready (incl. buffer)
					</span>
					<span
						className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--ink-soft)]"
						style={{ fontSize: '15px' }}
					>
						{data.currentSupplierCost.toLocaleString('en-EG', {
							minimumFractionDigits: 2,
						})}
					</span>
					{data.lastUpdatedAt && (
						<span
							className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
							style={{ fontSize: '10.5px' }}
						>
							updated {formatRelative(data.lastUpdatedAt)}
						</span>
					)}
				</div>
			</div>
		</header>
	)
}

// ─── Section rule ────────────────────────────────────────

function SectionRule({ label }: { label: string }) {
	return (
		<div className="mt-6 flex items-baseline gap-2">
			<span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-mid)]">
				{label}
			</span>
			<span aria-hidden="true" className="h-px flex-1 bg-[var(--rule-soft)]" />
		</div>
	)
}

// ─── Supplier entry ──────────────────────────────────────

interface SupplierEntryProps {
	index: number
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

function SupplierEntry({
	index,
	supplier,
	unit,
	isBest,
	isSaving,
	onSave,
	onOpenProfile,
}: SupplierEntryProps) {
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

	const freshTone = QUOTE_TONE[supplier.quoteFreshness]

	return (
		<li
			className="relative grid border-t border-[var(--rule-soft)] py-4"
			style={{
				gridTemplateColumns: '22px 1fr auto',
				columnGap: '20px',
			}}
		>
			<div className="pt-1">
				<span
					className="font-[family-name:var(--font-fraunces)] italic leading-none text-[var(--ink-ghost)]"
					style={{ fontSize: '11px' }}
				>
					{toRoman(index + 1)}
				</span>
			</div>

			<div className="min-w-0">
				<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
					<button
						type="button"
						onClick={onOpenProfile}
						className="group/name inline-flex items-baseline gap-1 text-start outline-none"
					>
						<span
							className="font-[family-name:var(--font-fraunces)] leading-[1.12] text-[var(--ink)] transition-colors group-hover/name:text-[var(--compendium-brand)]"
							style={{
								fontSize: '16px',
								fontWeight: 500,
								letterSpacing: '-0.012em',
							}}
						>
							{supplier.name}
						</span>
						<span
							aria-hidden="true"
							className="opacity-0 transition-opacity group-hover/name:opacity-100"
							style={{
								fontFamily: 'var(--font-fraunces)',
								fontStyle: 'italic',
								fontSize: '12px',
								color: 'var(--compendium-brand)',
							}}
						>
							→
						</span>
					</button>
					{supplier.isPrimary && (
						<span
							className="font-[family-name:var(--font-fraunces)] italic"
							style={{ fontSize: '10.5px', color: 'var(--compendium-brand)' }}
						>
							· primary
						</span>
					)}
					{isBest && !supplier.isPrimary && (
						<span
							className="font-[family-name:var(--font-fraunces)] italic"
							style={{ fontSize: '10.5px', color: 'var(--compendium-fresh)' }}
						>
							· best price
						</span>
					)}
				</div>

				<p
					className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[var(--ink-mid)]"
					style={{ fontSize: '10.5px' }}
				>
					<span className="font-[family-name:var(--font-fraunces)] italic">
						{TIER_LABEL[supplier.tier]}
					</span>
					<span className="opacity-60">·</span>
					<span className="font-[family-name:var(--font-fraunces)] italic">
						{supplier.paymentTerms}
					</span>
					<span className="opacity-60">·</span>
					<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
						{supplier.leadTimeDays}d lead
					</span>
					<span className="opacity-60">·</span>
					<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
						MOQ {supplier.minOrderQty}
					</span>
					<span className="opacity-60">·</span>
					<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
						quoted {formatRelative(supplier.lastQuotedAt)}
					</span>
					<span className="opacity-60">·</span>
					<span
						className="font-[family-name:var(--font-fraunces)] italic"
						style={{ color: freshTone }}
					>
						{QUOTE_LABEL[supplier.quoteFreshness]}
					</span>
				</p>

				{supplier.notes && (
					<p
						className="mt-1 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
						style={{ fontSize: '10.5px' }}
					>
						{supplier.notes}
					</p>
				)}
			</div>

			<div className="flex flex-col items-end pt-1">
				{editing ? (
					<input
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onBlur={commit}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault()
								e.stopPropagation()
								commit()
							}
							if (e.key === 'Escape') cancel()
						}}
						// biome-ignore lint/a11y/noAutofocus: intentional focus on inline edit open
						autoFocus
						className="w-28 bg-transparent text-end font-[family-name:var(--font-fraunces)] tabular-nums text-[var(--ink)] outline-none"
						style={{
							fontSize: '22px',
							fontWeight: 500,
							letterSpacing: '-0.02em',
							borderBottom: '1px solid var(--compendium-brand)',
							paddingBottom: '1px',
						}}
					/>
				) : (
					<button
						type="button"
						onClick={beginEdit}
						disabled={isSaving}
						className="group/price inline-flex items-baseline gap-1.5 outline-none disabled:cursor-wait"
					>
						<span
							className="compendium-numeral font-[family-name:var(--font-fraunces)] leading-none text-[var(--ink)]"
							style={{
								fontSize: '22px',
								fontWeight: 500,
								letterSpacing: '-0.02em',
							}}
						>
							{isSaving
								? '…'
								: supplier.rawCost.toLocaleString('en-EG', {
										minimumFractionDigits: 2,
									})}
						</span>
						<span
							aria-hidden="true"
							className="text-[10px] opacity-0 transition-opacity group-hover/price:opacity-100"
							style={{ color: 'var(--ink-mid)' }}
						>
							✎
						</span>
					</button>
				)}
				<span
					className="mt-0.5 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
					style={{ fontSize: '10.5px' }}
				>
					EGP / {unit}
				</span>
			</div>
		</li>
	)
}
