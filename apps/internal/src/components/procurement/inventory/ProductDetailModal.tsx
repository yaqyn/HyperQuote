import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	ArrowLeft,
	CheckCircle2,
	ChevronDown,
	CircleAlert,
	FileText,
	Upload,
} from 'lucide-react'
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import {
	normalizeDecimalInput,
	PRICE_PROOF_ESSAY_MIN,
	sanitizeCost,
} from '../../../lib/inputs'
import type {
	PriceProofInput,
	QuoteFreshness,
} from '../../../lib/server/inventory'
import {
	getInventoryProductDetail,
	updateSupplierQuote,
} from '../../../lib/server/inventory'
import { EmployeeActionButton } from '../../shared/EmployeeControls'
import { SlidePanel } from '../../shared/SlidePanel'

interface ProductDetailModalProps {
	slug: string | null
	onClose: () => void
}

type SupplierTone = 'fresh' | 'attention'
type PricePanelStep = 'price' | 'proof'
type ProofMethod = 'pdf' | 'essay'

const TIER_LABEL = {
	preferred: 'Preferred',
	approved: 'Approved',
	conditional: 'Conditional',
	new: 'New',
} as const

const QUOTE_LABEL: Record<QuoteFreshness, string> = {
	confirmed: 'confirmed',
	reconfirm: 're-confirm',
	needs_quote: 'needs quote',
}

const QUOTE_TONE: Record<QuoteFreshness, SupplierTone> = {
	confirmed: 'fresh',
	reconfirm: 'attention',
	needs_quote: 'attention',
}

function formatRelative(iso: string | null): string {
	if (!iso) return '—'
	const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000
	if (hours < 1) return `${Math.round(hours * 60)}m ago`
	if (hours < 24) return `${Math.round(hours)}h ago`
	return `${Math.floor(hours / 24)}d ago`
}

function formatMoney(value: number): string {
	return value.toLocaleString('en-EG', { minimumFractionDigits: 2 })
}

function colorForTone(tone: SupplierTone): string {
	return tone === 'fresh'
		? 'var(--compendium-fresh)'
		: 'var(--compendium-attention)'
}

export function ProductDetailModal({ slug, onClose }: ProductDetailModalProps) {
	const isOpen = slug !== null
	const qc = useQueryClient()
	const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
		null,
	)
	const [draftCost, setDraftCost] = useState('')
	const [panelStep, setPanelStep] = useState<PricePanelStep>('price')
	const [proofMethod, setProofMethod] = useState<ProofMethod>('pdf')
	const [proofEssay, setProofEssay] = useState('')
	const [proofPdfName, setProofPdfName] = useState('')
	const [supplierMenuOpen, setSupplierMenuOpen] = useState(false)
	const [saveError, setSaveError] = useState<string | null>(null)

	const resetProof = useCallback(() => {
		setProofMethod('pdf')
		setProofEssay('')
		setProofPdfName('')
	}, [])

	const { data, isLoading } = useQuery({
		queryKey: ['inventory-product-detail', slug],
		queryFn: () => getInventoryProductDetail({ data: { slug: slug ?? '' } }),
		enabled: isOpen && !!slug,
		staleTime: 30_000,
	})

	useEffect(() => {
		if (!isOpen) {
			setSelectedSupplierId(null)
			setDraftCost('')
			setPanelStep('price')
			resetProof()
			setSupplierMenuOpen(false)
			setSaveError(null)
		}
	}, [isOpen, resetProof])

	useEffect(() => {
		if (!data) return
		setSelectedSupplierId((current) => {
			if (data.suppliers.some((supplier) => supplier.id === current)) {
				return current
			}
			return null
		})
	}, [data])

	const selectedSupplier = useMemo(() => {
		if (!data || !selectedSupplierId) return null
		return (
			data.suppliers.find((supplier) => supplier.id === selectedSupplierId) ??
			null
		)
	}, [data, selectedSupplierId])
	const selectedSupplierKey = selectedSupplier?.id ?? null
	const selectedSupplierCost = selectedSupplier?.rawCost ?? null

	useEffect(() => {
		if (selectedSupplierKey === null || selectedSupplierCost === null) return
		setDraftCost(String(selectedSupplierCost))
		setPanelStep('price')
		resetProof()
		setSupplierMenuOpen(false)
		setSaveError(null)
	}, [selectedSupplierKey, selectedSupplierCost, resetProof])

	const quoteMutation = useMutation({
		mutationFn: updateSupplierQuote,
		onSuccess: (result) => {
			if (!result.success) {
				setSaveError(result.error)
				return
			}
			qc.invalidateQueries({ queryKey: ['inventory-product-detail', slug] })
			qc.invalidateQueries({ queryKey: ['inventory-overview'] })
			qc.invalidateQueries({ queryKey: ['inventory-top-suppliers'] })
			qc.invalidateQueries({ queryKey: ['sales-outdated-prices'] })
			resetProof()
			setPanelStep('price')
			onClose()
		},
		onError: () => {
			setSaveError('Price could not be saved. Refresh and try again.')
		},
	})

	const bestSupplierId = useMemo(() => {
		if (!data || data.suppliers.length === 0) return null
		return [...data.suppliers].sort((a, b) => a.rawCost - b.rawCost)[0].id
	}, [data])

	const parsedDraft = sanitizeCost(draftCost)
	const priceChanged =
		!!selectedSupplier &&
		parsedDraft !== null &&
		parsedDraft !== selectedSupplier.rawCost
	const canContinueToProof =
		!!data &&
		!!selectedSupplier &&
		parsedDraft !== null &&
		priceChanged &&
		!quoteMutation.isPending
	const proofEssayLength = proofEssay.trim().length
	const proofEssayOk = proofEssayLength >= PRICE_PROOF_ESSAY_MIN
	const proofPdfOk = proofPdfName.trim().toLowerCase().endsWith('.pdf')
	const proofOk = proofMethod === 'pdf' ? proofPdfOk : proofEssayOk
	const canSave = canContinueToProof && panelStep === 'proof' && proofOk
	const saveBlockReason = !selectedSupplier
		? 'Choose a supplier first.'
		: parsedDraft === null
			? 'Enter a valid supplier cost.'
			: !priceChanged
				? 'Change the supplier cost before saving.'
				: panelStep === 'proof' && !proofOk
					? proofMethod === 'pdf'
						? 'Upload a PDF proof before saving this price.'
						: `Write at least ${PRICE_PROOF_ESSAY_MIN} characters of proof before saving.`
					: null

	const updateDraftCost = (value: string) => {
		setDraftCost(value)
		setSaveError(null)
	}

	const updateProofEssay = (value: string) => {
		setProofEssay(value)
		setSaveError(null)
	}

	const updateProofPdfName = (value: string) => {
		setProofPdfName(value)
		setSaveError(null)
	}

	const openProofStep = () => {
		if (!canContinueToProof) return
		setPanelStep('proof')
	}

	const saveQuote = () => {
		if (!data || !selectedSupplier || parsedDraft === null || !canSave) return
		setSaveError(null)
		const proof: PriceProofInput =
			proofMethod === 'pdf'
				? { kind: 'pdf', fileName: proofPdfName.trim() }
				: { kind: 'essay', text: proofEssay.trim() }
		quoteMutation.mutate({
			data: {
				slug: data.slug,
				supplierId: selectedSupplier.id,
				rawCost: parsedDraft,
				proof,
			},
		})
	}

	const pendingRequestCount = data?.pendingRequests.length ?? 0
	const mobileTitle = (
		<span className="flex min-w-0 items-center gap-1.5">
			<span className="min-w-0 truncate">{data?.name ?? 'Update price'}</span>
			{pendingRequestCount > 0 && (
				<CircleAlert
					aria-label={`${pendingRequestCount} sales request${pendingRequestCount === 1 ? '' : 's'} waiting`}
					size={15}
					strokeWidth={2.2}
					className="shrink-0 text-[var(--compendium-attention)]"
				/>
			)}
		</span>
	)

	return (
		<SlidePanel
			isOpen={isOpen}
			onClose={onClose}
			maxWidth={640}
			panelKey="product-panel"
			ariaLabel="Update supplier price"
			scope="procurement"
			mobileTitle={mobileTitle}
			mobileSubtitle={selectedSupplier?.name}
		>
			<div className="compendium-theme flex h-full flex-col bg-[var(--folio)] text-[var(--ink)]">
				{isLoading || !data ? (
					<div className="flex h-full items-center justify-center">
						<p className="font-[family-name:var(--font-archivo)] text-[13px] text-[var(--ink-mid)]">
							Loading product...
						</p>
					</div>
				) : (
					<>
						<PricePanelHeader data={data} />

						<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 sm:px-6">
							<div className={panelStep === 'proof' ? 'hidden lg:block' : ''}>
								{data.pendingRequests.length > 0 && (
									<div className="hidden lg:block">
										<PendingRequests requests={data.pendingRequests} />
									</div>
								)}

								<PanelSection title="Step 1 · Supplier" />
								<SupplierMenuButton
									suppliers={data.suppliers}
									unit={data.unit}
									selectedSupplier={selectedSupplier}
									bestSupplierId={bestSupplierId}
									isOpen={supplierMenuOpen}
									onToggle={() => setSupplierMenuOpen((open) => !open)}
									onSelect={(supplierId) => setSelectedSupplierId(supplierId)}
								/>

								{selectedSupplier && (
									<>
										<PanelSection title="Step 2 · Cost" />
										<QuoteWorkspace
											supplier={selectedSupplier}
											unit={data.unit}
											value={draftCost}
											onChange={updateDraftCost}
											parsedValue={parsedDraft}
										/>
									</>
								)}
							</div>

							{panelStep === 'proof' &&
								selectedSupplier &&
								parsedDraft !== null && (
									<div className="animate-price-proof-step-in">
										<ProofSubmissionStep
											productName={data.name}
											unit={data.unit}
											supplierName={selectedSupplier.name}
											oldCost={selectedSupplier.rawCost}
											newCost={parsedDraft}
											method={proofMethod}
											onMethodChange={(method) => {
												setProofMethod(method)
												setSaveError(null)
											}}
											pdfName={proofPdfName}
											onPdfNameChange={updateProofPdfName}
											essay={proofEssay}
											onEssayChange={updateProofEssay}
											essayLength={proofEssayLength}
											essayMin={PRICE_PROOF_ESSAY_MIN}
										/>
									</div>
								)}
						</div>

						<PricePanelFooter
							oldCost={selectedSupplier?.rawCost ?? 0}
							newCost={parsedDraft}
							step={panelStep}
							canContinue={canContinueToProof}
							canSave={canSave}
							saving={quoteMutation.isPending}
							blockReason={saveBlockReason}
							errorMessage={saveError}
							onBack={() => setPanelStep('price')}
							onContinue={openProofStep}
							onSave={saveQuote}
						/>
					</>
				)}
			</div>
		</SlidePanel>
	)
}

function PricePanelHeader({
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
		<header className="shrink-0 border-b border-[var(--rule-soft)] px-4 py-2.5 sm:px-6 lg:py-5">
			<div className="hidden gap-4 lg:flex">
				<img
					src={data.image}
					alt={data.name}
					className="h-16 w-16 shrink-0 rounded-md border border-[var(--rule-soft)] object-cover"
				/>
				<div className="min-w-0 flex-1">
					<p className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mid)]">
						Update price
					</p>
					<h2 className="mt-1 min-w-0 break-words font-[family-name:var(--font-archivo)] text-[20px] font-semibold leading-6 text-[var(--ink)]">
						{data.name}
					</h2>
					<p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[var(--ink-mid)]">
						<span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em]">
							{data.sku}
						</span>
						{data.brand && (
							<>
								<span aria-hidden="true" className="opacity-60">
									·
								</span>
								<span className="font-[family-name:var(--font-archivo)] text-[11px]">
									{data.brand}
								</span>
							</>
						)}
						{data.weight_kg && (
							<>
								<span aria-hidden="true" className="opacity-60">
									·
								</span>
								<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums">
									{data.weight_kg} kg
								</span>
							</>
						)}
					</p>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2 lg:mt-4">
				<PriceMetric
					label="Current cost"
					value={
						data.currentRawCost > 0 ? formatMoney(data.currentRawCost) : '—'
					}
					caption={`EGP / ${data.unit}`}
				/>
				<PriceMetric
					label="Sell-ready"
					value={formatMoney(data.currentSupplierCost)}
					caption={`Updated ${formatRelative(data.lastUpdatedAt)}`}
				/>
			</div>
		</header>
	)
}

function PriceMetric({
	label,
	value,
	caption,
}: {
	label: string
	value: string
	caption: string
}) {
	return (
		<div className="rounded-md border border-[var(--rule-soft)] px-3 py-2">
			<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-mid)]">
				{label}
			</span>
			<span className="mt-1 block font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold leading-none tabular-nums text-[var(--ink)]">
				{value}
			</span>
			<span className="mt-1 block font-[family-name:var(--font-archivo)] text-[10px] text-[var(--ink-mid)]">
				{caption}
			</span>
		</div>
	)
}

function PendingRequests({
	requests,
}: {
	requests: Array<{ id: string; customerContext: string; requestedAt: string }>
}) {
	return (
		<div className="mt-5 rounded-md border border-[var(--compendium-attention)]/30 bg-[var(--compendium-attention)]/[0.045] p-3">
			<span className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--compendium-attention)]">
				Sales waiting · {requests.length}
			</span>
			<p className="mt-1 font-[family-name:var(--font-archivo)] text-[12px] leading-5 text-[var(--ink-soft)]">
				{requests.map((request) => request.customerContext).join(', ')}
			</p>
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
	bestSupplierId,
	isOpen,
	onToggle,
	onSelect,
}: {
	suppliers: Array<{
		id: string
		name: string
		rawCost: number
		leadTimeDays: number
		minOrderQty: number
		lastQuotedAt: string
		quoteFreshness: QuoteFreshness
		tier: keyof typeof TIER_LABEL
		paymentTerms: string
		isPrimary: boolean
	}>
	unit: string
	selectedSupplier: {
		id: string
		name: string
		rawCost: number
		leadTimeDays: number
		minOrderQty: number
		lastQuotedAt: string
		quoteFreshness: QuoteFreshness
		tier: keyof typeof TIER_LABEL
		paymentTerms: string
		isPrimary: boolean
	} | null
	bestSupplierId: string | null
	isOpen: boolean
	onToggle: () => void
	onSelect: (supplierId: string) => void
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
						{selectedSupplier?.name ?? '(select a supplier)'}
					</span>
					{selectedSupplier && (
						<span className="mt-1 block truncate font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--ink-mid)]">
							{formatMoney(selectedSupplier.rawCost)} EGP/{unit} · MOQ{' '}
							{selectedSupplier.minOrderQty.toLocaleString('en-EG')} ·{' '}
							{selectedSupplier.leadTimeDays}d
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
							key={supplier.id}
							supplier={supplier}
							unit={unit}
							selected={supplier.id === selectedSupplier?.id}
							isBest={supplier.id === bestSupplierId}
							index={index}
							onSelect={() => onSelect(supplier.id)}
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
	isBest,
	index,
	onSelect,
}: {
	supplier: {
		id: string
		name: string
		rawCost: number
		minOrderQty: number
		lastQuotedAt: string
		quoteFreshness: QuoteFreshness
		tier: keyof typeof TIER_LABEL
		isPrimary: boolean
	}
	unit: string
	selected: boolean
	isBest: boolean
	index: number
	onSelect: () => void
}) {
	const tone = colorForTone(QUOTE_TONE[supplier.quoteFreshness])
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
							{supplier.name}
						</span>
						{supplier.isPrimary && <SupplierBadge>Primary</SupplierBadge>}
						{isBest && !supplier.isPrimary && (
							<SupplierBadge>Best</SupplierBadge>
						)}
					</div>
					<span className="mt-1 block truncate font-[family-name:var(--font-archivo)] text-[11px] text-[var(--ink-mid)]">
						{TIER_LABEL[supplier.tier]} ·{' '}
						{formatRelative(supplier.lastQuotedAt)}
					</span>
				</div>
				<div className="text-end">
					<span className="block font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--ink)]">
						{formatMoney(supplier.rawCost)}
					</span>
					<span
						className="mt-1 block font-[family-name:var(--font-archivo)] text-[10px] font-semibold"
						style={{ color: tone }}
					>
						{QUOTE_LABEL[supplier.quoteFreshness]} · MOQ{' '}
						{supplier.minOrderQty.toLocaleString('en-EG')} {unit}
					</span>
				</div>
			</button>
		</li>
	)
}

function SupplierBadge({ children }: { children: ReactNode }) {
	return (
		<span className="shrink-0 rounded-sm bg-black/[0.045] px-1.5 py-0.5 font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-mid)]">
			{children}
		</span>
	)
}

function QuoteWorkspace({
	supplier,
	unit,
	value,
	onChange,
	parsedValue,
}: {
	supplier: {
		id: string
		rawCost: number
		name: string
	}
	unit: string
	value: string
	onChange: (value: string) => void
	parsedValue: number | null
}) {
	const priceInputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		if (!supplier.id) return
		priceInputRef.current?.focus()
		priceInputRef.current?.select()
	}, [supplier.id])

	return (
		<div className="rounded-md border border-[var(--rule-soft)] p-3">
			<div className="grid gap-3">
				<PanelField label="New price" error={parsedValue === null}>
					<input
						ref={priceInputRef}
						type="text"
						value={value}
						onChange={(event) =>
							onChange(normalizeDecimalInput(event.target.value))
						}
						onBlur={() => {
							if (parsedValue !== null) onChange(String(parsedValue))
						}}
						inputMode="decimal"
						autoComplete="off"
						spellCheck={false}
						aria-label={`New supplier cost for ${supplier.name}`}
						placeholder="Type cost"
						className="w-full bg-transparent font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold tabular-nums text-[var(--ink)] caret-[var(--color-primary)] outline-none placeholder:text-[var(--ink-ghost)]"
					/>
					<div className="mt-1 font-[family-name:var(--font-archivo)] text-[10px] text-[var(--ink-mid)]">
						EGP / {unit}
					</div>
				</PanelField>
			</div>
		</div>
	)
}

function ProofSubmissionStep({
	productName,
	unit,
	supplierName,
	oldCost,
	newCost,
	method,
	onMethodChange,
	pdfName,
	onPdfNameChange,
	essay,
	onEssayChange,
	essayLength,
	essayMin,
}: {
	productName: string
	unit: string
	supplierName: string
	oldCost: number
	newCost: number
	method: ProofMethod
	onMethodChange: (method: ProofMethod) => void
	pdfName: string
	onPdfNameChange: (value: string) => void
	essay: string
	onEssayChange: (value: string) => void
	essayLength: number
	essayMin: number
}) {
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const delta = oldCost > 0 ? ((newCost - oldCost) / oldCost) * 100 : Number.NaN
	const deltaLabel =
		oldCost > 0 ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%` : 'new'

	return (
		<div className="pt-5">
			<div className="flex items-center gap-2">
				<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mid)]">
					Step 3 · Price proof
				</span>
				<span
					aria-hidden="true"
					className="h-px flex-1 bg-[var(--rule-soft)]"
				/>
			</div>

			<div className="mt-3 rounded-md border border-[var(--rule-soft)] bg-[var(--folio)] p-3">
				<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
					Proof summary
				</span>
				<h3 className="mt-2 break-words font-[family-name:var(--font-archivo)] text-[16px] font-semibold leading-5 text-[var(--ink)]">
					{productName}
				</h3>
				<p className="mt-1 break-words font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink-mid)]">
					{supplierName} · EGP / {unit}
				</p>
				<div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
					<ProofPriceColumn
						label="Current"
						value={formatMoney(oldCost)}
						muted
					/>
					<span
						aria-hidden="true"
						className="pb-1 font-[family-name:var(--font-geist-mono)] text-[14px] text-[var(--ink-mid)]"
					>
						→
					</span>
					<ProofPriceColumn label="New" value={formatMoney(newCost)} />
				</div>
				<div className="mt-3 border-t border-[var(--rule-soft)] pt-3">
					<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						Change
					</span>
					<span
						className="ms-2 font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums"
						style={{
							color:
								oldCost <= 0 || delta === 0
									? 'var(--ink-mid)'
									: delta < 0
										? 'var(--compendium-fresh)'
										: 'var(--compendium-attention)',
						}}
					>
						{deltaLabel}
					</span>
				</div>
			</div>

			<div className="mt-4 grid grid-cols-2 overflow-hidden rounded-md border border-[var(--rule-soft)]">
				<button
					type="button"
					onClick={() => onMethodChange('pdf')}
					aria-pressed={method === 'pdf'}
					className={`inline-flex min-h-11 items-center justify-center gap-2 border-e border-[var(--rule-soft)] px-3 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
						method === 'pdf'
							? 'bg-[var(--color-primary)]/[0.08] text-[var(--ink)]'
							: 'text-[var(--ink-mid)] hover:text-[var(--ink)]'
					}`}
				>
					<Upload size={14} strokeWidth={2.1} aria-hidden="true" />
					PDF
				</button>
				<button
					type="button"
					onClick={() => onMethodChange('essay')}
					aria-pressed={method === 'essay'}
					className={`inline-flex min-h-11 items-center justify-center gap-2 px-3 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
						method === 'essay'
							? 'bg-[var(--color-primary)]/[0.08] text-[var(--ink)]'
							: 'text-[var(--ink-mid)] hover:text-[var(--ink)]'
					}`}
				>
					<FileText size={14} strokeWidth={2.1} aria-hidden="true" />
					Essay
				</button>
			</div>

			{method === 'pdf' ? (
				<div className="mt-3 rounded-md border border-[var(--rule-soft)] p-3">
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="flex min-h-20 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[var(--rule)] px-3 text-center font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink-mid)] outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					>
						<Upload size={18} strokeWidth={2.1} aria-hidden="true" />
						<span className="font-semibold">
							{pdfName || 'Upload supplier PDF proof'}
						</span>
						<span className="text-[11px] text-[var(--ink-mid)]">
							PDF only. The selected filename is attached to this mock record.
						</span>
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept="application/pdf,.pdf"
						className="hidden"
						onChange={(event) => {
							const file = event.currentTarget.files?.[0]
							onPdfNameChange(file?.name ?? '')
							event.currentTarget.value = ''
						}}
					/>
				</div>
			) : (
				<div className="mt-3 rounded-md border border-[var(--rule-soft)] p-3">
					<div className="mb-2 flex items-baseline justify-between gap-3">
						<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
							Proof essay
						</span>
						<span
							className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums"
							style={{
								color:
									essayLength >= essayMin
										? 'var(--compendium-fresh)'
										: 'var(--ink-mid)',
							}}
						>
							{essayLength} / {essayMin}
						</span>
					</div>
					<textarea
						value={essay}
						onChange={(event) => onEssayChange(event.target.value)}
						rows={7}
						placeholder="Write the supplier contact, the source of the price, the commercial reason for the change, and anything finance should know before this reaches sales quotes."
						className="w-full resize-none rounded-md border border-[var(--rule-soft)] bg-[var(--folio)] px-3 py-2 font-[family-name:var(--font-archivo)] text-[13px] leading-5 text-[var(--ink)] outline-none placeholder:text-[var(--ink-ghost)] focus:border-[var(--color-primary)]/55"
					/>
				</div>
			)}
		</div>
	)
}

function ProofPriceColumn({
	label,
	value,
	muted,
}: {
	label: string
	value: string
	muted?: boolean
}) {
	return (
		<div className="min-w-0">
			<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
				{label}
			</span>
			<span
				className="mt-1 block break-words font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold leading-none tabular-nums"
				style={{ color: muted ? 'var(--ink-mid)' : 'var(--ink)' }}
			>
				{value}
			</span>
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
		<div
			className="rounded-md border bg-[var(--folio)] px-3 py-2"
			style={{
				borderColor: error ? 'var(--compendium-attention)' : 'var(--rule-soft)',
			}}
		>
			<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-mid)]">
				{label}
			</span>
			<div className="mt-1">{children}</div>
		</div>
	)
}

function PricePanelFooter({
	oldCost,
	newCost,
	step,
	canContinue,
	canSave,
	saving,
	blockReason,
	errorMessage,
	onBack,
	onContinue,
	onSave,
}: {
	oldCost: number
	newCost: number | null
	step: PricePanelStep
	canContinue: boolean
	canSave: boolean
	saving: boolean
	blockReason: string | null
	errorMessage: string | null
	onBack: () => void
	onContinue: () => void
	onSave: () => void
}) {
	const delta =
		newCost !== null && oldCost > 0 ? ((newCost - oldCost) / oldCost) * 100 : 0
	const isProofStep = step === 'proof'

	return (
		<footer className="shrink-0 border-t border-[var(--rule-soft)] bg-[var(--folio)] px-4 py-4 sm:px-6">
			<div className="flex flex-col gap-3">
				<div className="flex items-end justify-between gap-4">
					<div>
						<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
							Change
						</span>
						<span
							className="mt-1 block font-[family-name:var(--font-geist-mono)] text-[20px] font-semibold leading-none tabular-nums"
							style={{
								color:
									newCost === null || delta === 0
										? 'var(--ink-mid)'
										: delta < 0
											? 'var(--compendium-fresh)'
											: 'var(--compendium-attention)',
							}}
						>
							{newCost === null || oldCost <= 0
								? '—'
								: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}
						</span>
					</div>
					<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--ink)]">
						{newCost === null ? 'Invalid' : `${formatMoney(newCost)} EGP`}
					</span>
				</div>
				{errorMessage ? (
					<p className="font-[family-name:var(--font-archivo)] text-[12px] text-[var(--compendium-attention)]">
						{errorMessage}
					</p>
				) : (
					blockReason &&
					!saving && (
						<p className="font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink-mid)]">
							{blockReason}
						</p>
					)
				)}
				{isProofStep ? (
					<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
						<EmployeeActionButton
							tone="neutral"
							leading={<ArrowLeft size={14} strokeWidth={2.4} />}
							onClick={onBack}
							disabled={saving}
							aria-label="Back to price change"
						>
							Back
						</EmployeeActionButton>
						<EmployeeActionButton
							leading={<CheckCircle2 size={14} strokeWidth={2.4} />}
							onClick={onSave}
							disabled={!canSave}
							aria-disabled={!canSave}
							fullWidthOnMobile
						>
							{saving ? 'Submitting proof' : 'Submit proof & save'}
						</EmployeeActionButton>
					</div>
				) : (
					<EmployeeActionButton
						leading={<FileText size={14} strokeWidth={2.4} />}
						onClick={onContinue}
						disabled={!canContinue}
						aria-disabled={!canContinue}
						fullWidthOnMobile
						className={
							canContinue
								? 'transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0'
								: ''
						}
					>
						Submit proof
					</EmployeeActionButton>
				)}
			</div>
		</footer>
	)
}
