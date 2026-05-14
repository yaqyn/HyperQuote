import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
	isValidProof,
	MIN_PROOF_LENGTH,
	normalizeDecimalInput,
	normalizeIntegerInput,
	sanitizeCost,
	sanitizeIntQty,
} from '../../../lib/inputs'
import {
	createDeal,
	getRefillProductDetail,
	type StockStatus,
	type StockSupplierOffer,
} from '../../../lib/server/stock'
import { EmployeeActionButton } from '../../shared/EmployeeControls'
import { SlidePanel } from '../../shared/SlidePanel'

interface RefillPanelProps {
	productSlug: string | null
	onClose: () => void
}

interface RefillDraft {
	productSlug: string
	unit: string
	listedCost: number
	agreedQty: number
	agreedRawCost: number
	minOrderQty: number
}

const STATUS_LABEL: Record<StockStatus, string> = {
	healthy: 'healthy',
	low: 'running low',
	critical: 'critical',
	out: 'out of stock',
}

const STATUS_TONE: Record<StockStatus, string> = {
	healthy: 'var(--compendium-fresh)',
	low: 'var(--compendium-attention)',
	critical: 'var(--compendium-attention)',
	out: 'var(--compendium-attention)',
}

const TIER_LABELS: Record<string, string> = {
	preferred: 'Preferred',
	approved: 'Approved',
	conditional: 'Conditional',
	new: 'New',
	blocked: 'Blocked',
}

function formatHours(hours: number): string {
	if (hours < 24) return `${hours}h ago`
	const days = Math.round(hours / 24)
	if (days < 30) return `${days}d ago`
	return `${Math.round(days / 30)}mo ago`
}

function formatMoney(value: number): string {
	return value.toLocaleString('en-EG', { minimumFractionDigits: 2 })
}

export function RefillPanel({ productSlug, onClose }: RefillPanelProps) {
	const qc = useQueryClient()
	const isOpen = productSlug !== null

	const { data, isLoading } = useQuery({
		queryKey: ['refill-product', productSlug],
		queryFn: () =>
			getRefillProductDetail({ data: { slug: productSlug ?? '' } }),
		enabled: isOpen && !!productSlug,
	})

	const [selectedSupplierRowId, setSelectedSupplierRowId] = useState<
		string | null
	>(null)
	const [draft, setDraft] = useState<RefillDraft | null>(null)
	const [notes, setNotes] = useState('')
	const [supplierMenuOpen, setSupplierMenuOpen] = useState(false)

	const selectedSupplier = useMemo(() => {
		if (!data) return null
		return (
			data.suppliers.find((s) => s.rowId === selectedSupplierRowId) ??
			data.suppliers[0] ??
			null
		)
	}, [data, selectedSupplierRowId])

	useEffect(() => {
		if (!isOpen || !data) return
		const first = data.suppliers[0]
		setSelectedSupplierRowId(first?.rowId ?? null)
		setNotes('')
		setSupplierMenuOpen(false)
		if (!first) {
			setDraft(null)
			return
		}
		setDraft(buildPrimaryDraft(data, first))
	}, [isOpen, data])

	const mutation = useMutation({
		mutationFn: createDeal,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['stock-overview'] })
			qc.invalidateQueries({ queryKey: ['refill-product', productSlug] })
			qc.invalidateQueries({ queryKey: ['inventory-overview'] })
			qc.invalidateQueries({ queryKey: ['inventory-top-suppliers'] })
			qc.invalidateQueries({ queryKey: ['finance-inbox'] })
			onClose()
		},
	})

	const total = draft ? draft.agreedQty * draft.agreedRawCost : 0
	const priceDropped = draft ? draft.agreedRawCost < draft.listedCost : false
	const moqOverride =
		draft !== null && draft.agreedQty > 0 && draft.agreedQty < draft.minOrderQty
	const notesRequired = priceDropped || moqOverride
	const notesOk = !notesRequired || isValidProof(notes)
	const canSubmit =
		!!selectedSupplier &&
		!!draft &&
		draft.agreedQty > 0 &&
		draft.agreedRawCost >= 0 &&
		notesOk &&
		!mutation.isPending

	const selectSupplier = (supplier: StockSupplierOffer) => {
		if (!data) return
		setSelectedSupplierRowId(supplier.rowId)
		setDraft(buildPrimaryDraft(data, supplier))
		setNotes('')
		setSupplierMenuOpen(false)
	}

	const updateDraft = (patch: Partial<RefillDraft>) => {
		setDraft((current) => (current ? { ...current, ...patch } : current))
	}

	const submitDeal = () => {
		if (!selectedSupplier || !draft || !canSubmit) return
		mutation.mutate({
			data: {
				supplierName: selectedSupplier.supplierName,
				items: [
					{
						productSlug: draft.productSlug,
						agreedQty: draft.agreedQty,
						agreedRawCost: draft.agreedRawCost,
					},
				],
				notes: notes.trim() || undefined,
			},
		})
	}

	return (
		<SlidePanel
			isOpen={isOpen}
			onClose={onClose}
			maxWidth={620}
			panelKey="refill-panel"
			ariaLabel="Refill stock"
			scope="procurement"
			mobileTitle={data?.name ?? 'Refill stock'}
			mobileSubtitle={selectedSupplier?.supplierName}
		>
			<div className="compendium-theme flex h-full flex-col bg-[var(--folio)] text-[var(--ink)]">
				{isLoading || !data ? (
					<div className="flex h-full items-center justify-center">
						<p className="font-[family-name:var(--font-archivo)] text-[13px] text-[var(--ink-mid)]">
							Loading refill...
						</p>
					</div>
				) : (
					<>
						<RefillHeader data={data} />

						<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 sm:px-6">
							<PanelSection title="Step 1 · Supplier" />
							{data.suppliers.length === 0 ? (
								<EmptyPanelNote>
									No supplier carries this material yet. Add a supplier quote
									before creating a refill deal.
								</EmptyPanelNote>
							) : (
								<SupplierMenuButton
									suppliers={data.suppliers}
									unit={data.unit}
									selectedSupplier={selectedSupplier}
									isOpen={supplierMenuOpen}
									onToggle={() => setSupplierMenuOpen((open) => !open)}
									onSelect={selectSupplier}
								/>
							)}

							{selectedSupplier && draft && (
								<>
									<PanelSection title="Step 2 · Qty & Cost" />
									<DealEditor draft={draft} onUpdate={updateDraft} />

									{notesRequired && (
										<ProofBox
											value={notes}
											onChange={setNotes}
											priceDropped={priceDropped}
											moqOverride={moqOverride}
											valid={notesOk}
										/>
									)}
								</>
							)}
						</div>

						<RefillFooter
							quantity={draft?.agreedQty ?? 0}
							unit={draft?.unit ?? data.unit}
							total={total}
							canSubmit={canSubmit}
							saving={mutation.isPending}
							notesRequired={notesRequired}
							notesOk={notesOk}
							onSubmit={submitDeal}
						/>
					</>
				)}
			</div>
		</SlidePanel>
	)
}

function buildPrimaryDraft(
	data: {
		slug: string
		unit: string
		suggestedQty: number
	},
	supplier: StockSupplierOffer,
): RefillDraft {
	return {
		productSlug: data.slug,
		unit: data.unit,
		listedCost: supplier.rawCost,
		agreedQty: data.suggestedQty,
		agreedRawCost: supplier.rawCost,
		minOrderQty: supplier.minOrderQty,
	}
}

function RefillHeader({
	data,
}: {
	data: {
		name: string
		sku: string
		unit: string
		stockLevel: number
		lowStockThreshold: number
		status: StockStatus
		suggestedQty: number
	}
}) {
	const tone = STATUS_TONE[data.status]
	return (
		<header className="shrink-0 border-b border-[var(--rule-soft)] px-4 py-2.5 sm:px-6 lg:py-4">
			<div className="hidden min-w-0 flex-wrap items-center justify-between gap-3 lg:flex">
				<div className="min-w-0">
					<p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[var(--ink-mid)]">
						<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em]">
							Refill
						</span>
						<span aria-hidden="true" className="opacity-50">
							·
						</span>
						<span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.08em]">
							{data.sku}
						</span>
						<span aria-hidden="true" className="opacity-50">
							·
						</span>
						<span
							className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold"
							style={{ color: tone }}
						>
							{STATUS_LABEL[data.status]}
						</span>
					</p>
					<h2 className="mt-1 min-w-0 break-words font-[family-name:var(--font-archivo)] text-[18px] font-semibold leading-6 text-[var(--ink)] sm:text-[20px]">
						{data.name}
					</h2>
				</div>
			</div>

			<div className="grid grid-cols-2 overflow-hidden rounded-md border border-[var(--rule-soft)] divide-x divide-[var(--rule-soft)] lg:mt-3 lg:grid-cols-3">
				<StockMetric
					label="Available"
					value={data.stockLevel}
					unit={data.unit}
					tone={tone}
				/>
				<StockMetric
					label="Minimum"
					value={data.lowStockThreshold}
					unit={data.unit}
				/>
				<StockMetric
					label="Suggested"
					value={data.suggestedQty}
					unit={data.unit}
					className="hidden lg:block"
				/>
			</div>
		</header>
	)
}

function StockMetric({
	label,
	value,
	unit,
	tone,
	className = '',
}: {
	label: string
	value: number
	unit: string
	tone?: string
	className?: string
}) {
	return (
		<div className={`min-w-0 px-2 py-2 sm:px-3 ${className}`}>
			<span className="block truncate font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-mid)] sm:text-[10px]">
				{label}
			</span>
			<div className="mt-1 flex min-w-0 items-baseline gap-1">
				<strong
					className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold leading-none tabular-nums text-[var(--ink)] sm:text-[18px]"
					style={tone ? { color: tone } : undefined}
				>
					{value.toLocaleString('en-EG')}
				</strong>
				<span className="truncate font-[family-name:var(--font-archivo)] text-[10px] font-semibold text-[var(--ink-mid)] sm:text-[11px]">
					{unit}
				</span>
			</div>
		</div>
	)
}

function PanelSection({ title }: { title: string }) {
	return (
		<div className="mt-5 mb-2 flex items-center gap-2">
			<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mid)]">
				{title}
			</span>
			<span aria-hidden="true" className="h-px flex-1 bg-[var(--rule-soft)]" />
		</div>
	)
}

function SupplierMenuButton({
	suppliers,
	unit,
	selectedSupplier,
	isOpen,
	onToggle,
	onSelect,
}: {
	suppliers: StockSupplierOffer[]
	unit: string
	selectedSupplier: StockSupplierOffer | null
	isOpen: boolean
	onToggle: () => void
	onSelect: (supplier: StockSupplierOffer) => void
}) {
	return (
		<div className="rounded-md border border-[var(--rule-soft)]">
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={isOpen}
				className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x border-x-transparent px-3 py-3 text-start transition-colors hover:border-x-[var(--ink-ghost)]"
			>
				<div className="min-w-0">
					<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						Supplier
					</span>
					<span className="mt-1 block truncate font-[family-name:var(--font-archivo)] text-[15px] font-semibold text-[var(--ink)]">
						{selectedSupplier?.supplierName ?? 'Choose supplier'}
					</span>
					{selectedSupplier && (
						<span className="mt-1 block truncate font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--ink-mid)]">
							{formatMoney(selectedSupplier.rawCost)} EGP/{unit} · MOQ{' '}
							{selectedSupplier.minOrderQty.toLocaleString('en-EG')} ·{' '}
							{selectedSupplier.leadTimeDays}d lead
						</span>
					)}
				</div>
				<ChevronDown
					aria-hidden="true"
					size={16}
					strokeWidth={1.8}
					className={`text-[var(--ink-mid)] transition-transform ${
						isOpen ? 'rotate-180' : ''
					}`}
				/>
			</button>

			{isOpen && (
				<ol className="max-h-[280px] overflow-y-auto border-t border-[var(--rule-soft)]">
					{suppliers.map((supplier, index) => (
						<SupplierMenuOption
							key={supplier.rowId}
							supplier={supplier}
							unit={unit}
							selected={supplier.rowId === selectedSupplier?.rowId}
							index={index}
							onSelect={() => onSelect(supplier)}
						/>
					))}
				</ol>
			)}
		</div>
	)
}

function SupplierMenuOption({
	supplier,
	unit,
	selected,
	index,
	onSelect,
}: {
	supplier: StockSupplierOffer
	unit: string
	selected: boolean
	index: number
	onSelect: () => void
}) {
	return (
		<li className="border-b border-[var(--rule-soft)] last:border-b-0">
			<button
				type="button"
				onClick={onSelect}
				aria-pressed={selected}
				className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-x border-x-transparent px-3 py-2.5 text-start transition-colors hover:border-x-[var(--ink-ghost)] ${
					selected
						? 'bg-[var(--color-primary)]/[0.07]'
						: index % 2 === 0
							? 'bg-[var(--folio)]'
							: 'bg-black/[0.018]'
				}`}
			>
				<div className="min-w-0">
					<div className="flex min-w-0 items-center gap-2">
						<span className="truncate font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--ink)]">
							{supplier.supplierName}
						</span>
						{supplier.isPrimary && (
							<span className="shrink-0 rounded-sm bg-black/[0.045] px-1.5 py-0.5 font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-mid)]">
								Primary
							</span>
						)}
					</div>
					<span className="mt-1 block truncate font-[family-name:var(--font-archivo)] text-[11px] text-[var(--ink-mid)]">
						{TIER_LABELS[supplier.tier] ?? supplier.tier} ·{' '}
						{formatHours(supplier.lastQuotedAtHoursAgo)}
					</span>
				</div>
				<div className="text-end">
					<span className="block font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--ink)]">
						{formatMoney(supplier.rawCost)}
					</span>
					<span className="mt-1 block font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--ink-mid)]">
						MOQ {supplier.minOrderQty.toLocaleString('en-EG')} {unit}
					</span>
				</div>
			</button>
		</li>
	)
}

function DealEditor({
	draft,
	onUpdate,
}: {
	draft: RefillDraft
	onUpdate: (patch: Partial<RefillDraft>) => void
}) {
	const lineTotal = draft.agreedQty * draft.agreedRawCost
	const priceDropped = draft.agreedRawCost < draft.listedCost
	const moqOverride = draft.agreedQty > 0 && draft.agreedQty < draft.minOrderQty

	return (
		<div className="rounded-md border border-[var(--rule-soft)] p-3">
			<div className="grid gap-3 sm:grid-cols-2">
				<PanelField label={`Quantity · ${draft.unit}`} error={moqOverride}>
					<input
						type="text"
						inputMode="numeric"
						value={draft.agreedQty}
						onChange={(event) => {
							const next = sanitizeIntQty(
								normalizeIntegerInput(event.target.value),
							)
							onUpdate({ agreedQty: next ?? 0 })
						}}
						className="w-full bg-transparent font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold tabular-nums text-[var(--ink)] outline-none"
					/>
				</PanelField>
				<PanelField label="Unit cost · EGP" error={priceDropped}>
					<input
						type="text"
						inputMode="decimal"
						value={draft.agreedRawCost}
						onChange={(event) => {
							const next = sanitizeCost(
								normalizeDecimalInput(event.target.value),
							)
							onUpdate({ agreedRawCost: next ?? 0 })
						}}
						className="w-full bg-transparent font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold tabular-nums text-[var(--ink)] outline-none"
					/>
				</PanelField>
			</div>

			<div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-[var(--rule-soft)] pt-3">
				<div className="font-[family-name:var(--font-archivo)] text-[11px] leading-5 text-[var(--ink-mid)]">
					MOQ {draft.minOrderQty.toLocaleString('en-EG')} {draft.unit}
					{priceDropped && (
						<span className="ms-2 text-[var(--compendium-fresh)]">
							below listed {formatMoney(draft.listedCost)}
						</span>
					)}
					{moqOverride && (
						<span className="ms-2 text-[var(--compendium-attention)]">
							below MOQ
						</span>
					)}
				</div>
				<div className="text-end">
					<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-mid)]">
						Total
					</span>
					<span className="mt-1 block font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold tabular-nums text-[var(--ink)]">
						{formatMoney(lineTotal)}
					</span>
				</div>
			</div>
		</div>
	)
}

function ProofBox({
	value,
	onChange,
	priceDropped,
	moqOverride,
	valid,
}: {
	value: string
	onChange: (value: string) => void
	priceDropped: boolean
	moqOverride: boolean
	valid: boolean
}) {
	const reason = [
		priceDropped ? 'lower agreed cost' : null,
		moqOverride ? 'MOQ override' : null,
	]
		.filter(Boolean)
		.join(' and ')

	return (
		<div className="mt-5 rounded-md border border-[var(--compendium-attention)]/35 bg-[var(--compendium-attention)]/[0.045] p-3">
			<div className="flex items-baseline justify-between gap-3">
				<span className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--compendium-attention)]">
					Proof required
				</span>
				<span
					className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums"
					style={{
						color: valid ? 'var(--compendium-fresh)' : 'var(--ink-mid)',
					}}
				>
					{value.trim().length} / {MIN_PROOF_LENGTH}
				</span>
			</div>
			<p className="mt-1 font-[family-name:var(--font-archivo)] text-[12px] leading-5 text-[var(--ink-soft)]">
				Record the supplier name, message, or negotiation reason for {reason}.
			</p>
			<textarea
				value={value}
				onChange={(event) => onChange(event.target.value)}
				rows={3}
				placeholder="Ahmed confirmed by phone; approved exception for this refill."
				className="mt-3 w-full resize-none rounded-md border border-[var(--rule-soft)] bg-[var(--folio)] px-3 py-2 font-[family-name:var(--font-archivo)] text-[13px] leading-5 text-[var(--ink)] outline-none placeholder:text-[var(--ink-ghost)] focus:border-[var(--compendium-attention)]/55"
			/>
		</div>
	)
}

function PanelField({
	label,
	error,
	children,
}: {
	label: string
	error?: boolean
	children: ReactNode
}) {
	return (
		<div className="block">
			<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-mid)]">
				{label}
			</span>
			<div
				className="mt-1 rounded-md border bg-[var(--folio)] px-3 py-2"
				style={{
					borderColor: error
						? 'var(--compendium-attention)'
						: 'var(--rule-soft)',
				}}
			>
				{children}
			</div>
		</div>
	)
}

function RefillFooter({
	quantity,
	unit,
	total,
	canSubmit,
	saving,
	notesRequired,
	notesOk,
	onSubmit,
}: {
	quantity: number
	unit: string
	total: number
	canSubmit: boolean
	saving: boolean
	notesRequired: boolean
	notesOk: boolean
	onSubmit: () => void
}) {
	return (
		<footer className="shrink-0 border-t border-[var(--rule-soft)] bg-[var(--folio)] px-4 py-4 sm:px-6">
			<div className="flex flex-col gap-3">
				<div className="flex items-end justify-between gap-4">
					<div>
						<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
							Deal total
						</span>
						<span className="mt-1 block font-[family-name:var(--font-geist-mono)] text-[20px] font-semibold leading-none tabular-nums text-[var(--ink)]">
							{formatMoney(total)} EGP
						</span>
					</div>
					<span className="font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink-mid)]">
						{quantity.toLocaleString('en-EG')} {unit}
					</span>
				</div>
				{notesRequired && !notesOk && (
					<p className="font-[family-name:var(--font-archivo)] text-[12px] text-[var(--compendium-attention)]">
						Add proof before sending this deal.
					</p>
				)}
				<EmployeeActionButton
					leading={<CheckCircle2 size={14} strokeWidth={2.4} />}
					onClick={onSubmit}
					disabled={!canSubmit}
					fullWidthOnMobile
				>
					{saving ? 'Sending to finance' : 'Send to finance'}
				</EmployeeActionButton>
			</div>
		</footer>
	)
}

function EmptyPanelNote({ children }: { children: ReactNode }) {
	return (
		<div className="p-3 font-[family-name:var(--font-archivo)] text-[12px] leading-5 text-[var(--ink-soft)]">
			{children}
		</div>
	)
}
