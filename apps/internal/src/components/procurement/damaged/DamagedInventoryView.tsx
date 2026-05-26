import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	ArchiveX,
	Banknote,
	CheckCircle2,
	PackageX,
	RotateCcw,
	ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
	normalizeDecimalInput,
	normalizeIntegerInput,
	sanitizeCost,
} from '../../../lib/inputs'
import {
	INTERNAL_LIVE_REFETCH_MS,
	INTERNAL_LIVE_STALE_MS,
} from '../../../lib/internal-live-query'
import {
	type DamagedInventoryOverview,
	disposeDamagedInventory,
	getDamagedInventoryOverview,
	type InventoryDamageApproverView,
	type InventoryDamageLotView,
	recordInventoryDamage,
	reverseInventoryDamage,
	sellDamagedInventory,
} from '../../../lib/server/damaged-inventory'
import type { UploadedProofDocument } from '../../../lib/server/proofs'
import { useProcurementStore } from '../../../stores/procurement'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchField,
	DispatchFooter,
	DispatchInputClass,
	DispatchSection,
} from '../../shared/DispatchDialog'
import {
	EmployeeActionButton,
	EmployeeSearchField,
	EmployeeStatusPill,
} from '../../shared/EmployeeControls'
import { formatDecimalEgp } from '../../shared/formatters'
import { ProofUploadField } from '../../shared/ProofUploadField'
import { filterProcurementProducts } from '../productFilters'

type DamageAction = 'sell' | 'dispose' | 'reverse'

const ACTION_COPY: Record<
	DamageAction,
	{
		icon: typeof Banknote
		proofType: 'stock_change' | 'finance_in' | 'other'
		title: string
	}
> = {
	sell: {
		icon: Banknote,
		proofType: 'finance_in',
		title: 'Sell damaged stock',
	},
	dispose: {
		icon: ArchiveX,
		proofType: 'stock_change',
		title: 'Dispose damaged stock',
	},
	reverse: {
		icon: RotateCcw,
		proofType: 'stock_change',
		title: 'Reverse damage',
	},
}

const STATUS_TONE: Record<
	InventoryDamageLotView['status'],
	'success' | 'warning' | 'danger' | 'neutral'
> = {
	closed: 'neutral',
	disposed: 'danger',
	open: 'warning',
	reversed: 'success',
	sold: 'success',
}

function money(value: number): string {
	return `EGP ${formatDecimalEgp(value)}`
}

function quantity(value: number, unit: string): string {
	return `${value.toLocaleString('en-EG', { maximumFractionDigits: 3 })} ${unit}`
}

function parsePositiveDecimal(raw: string): number | null {
	const normalized = normalizeDecimalInput(raw)
	if (!normalized) return null
	const parsed = Number(normalized)
	if (!Number.isFinite(parsed) || parsed <= 0) return null
	return parsed
}

function parsePercent(raw: string): number | null {
	const normalized = normalizeDecimalInput(raw)
	if (!normalized) return null
	const parsed = Number(normalized)
	if (!Number.isFinite(parsed)) return null
	return parsed >= 0 && parsed <= 100 ? parsed : null
}

function proofPayload(proof: UploadedProofDocument | null) {
	if (!proof) return null
	return {
		proofDocumentId: proof.id,
		proofPath: proof.proofPath,
	}
}

function invalidateDamageQueries(
	queryClient: ReturnType<typeof useQueryClient>,
) {
	for (const queryKey of [
		['inventory-damage'],
		['stock-overview'],
		['inventory-overview'],
		['finance-accounting'],
		['internal-search'],
		['internal-search-table'],
		['internal-search-module-summary'],
		['internal-search-executive-brief'],
		['internal-search-activity-feed'],
	]) {
		queryClient.invalidateQueries({ queryKey })
	}
}

export function DamagedInventoryView() {
	const activeCategory = useProcurementStore((s) => s.activeCategory)
	const queryClient = useQueryClient()
	const [search, setSearch] = useState('')
	const [recordOpen, setRecordOpen] = useState(false)
	const [actionState, setActionState] = useState<{
		action: DamageAction
		lotId: string
	} | null>(null)

	const { data, isError, isLoading } = useQuery({
		queryKey: ['inventory-damage'],
		queryFn: () => getDamagedInventoryOverview({ data: {} }),
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})

	const filteredLots = useMemo(() => {
		if (!data) return []
		return filterProcurementProducts(
			data.lots,
			activeCategory,
			search,
			(lot) => [lot.damageNumber, lot.reason, lot.status],
		)
	}, [activeCategory, data, search])

	const actionLot =
		actionState && data
			? (data.lots.find((lot) => lot.id === actionState.lotId) ?? null)
			: null

	if (isError) {
		return (
			<div className="flex h-full items-center justify-center px-6 text-center">
				<div className="max-w-sm rounded-md border border-red-600/20 bg-red-600/[0.04] px-4 py-3">
					<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-red-700 dark:text-red-300">
						Damaged stock could not load.
					</p>
					<p className="mt-1 text-[12px] text-[var(--color-text-subtle)]">
						Refresh before changing stock or accounting records.
					</p>
				</div>
			</div>
		)
	}

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="font-[family-name:var(--font-archivo)] text-[13px] text-[var(--ink-mid)]">
					Loading damaged stock...
				</p>
			</div>
		)
	}

	return (
		<div className="animate-folio-turn relative h-full overflow-y-auto">
			<div className="mx-auto flex max-w-[1120px] flex-col px-4 pt-4 pb-16 sm:px-6 lg:px-8">
				<DamageToolbar
					search={search}
					setSearch={setSearch}
					onRecord={() => setRecordOpen(true)}
				/>
				<DamageSummary totals={data.totals} />

				{filteredLots.length > 0 ? (
					<ol className="mt-4 grid gap-3 lg:gap-4">
						{filteredLots.map((lot) => (
							<DamageLotCard
								key={lot.id}
								lot={lot}
								onAction={(action) => setActionState({ action, lotId: lot.id })}
							/>
						))}
					</ol>
				) : (
					<div className="mt-8 rounded-md border border-[var(--rule-soft)] bg-[var(--folio)] px-4 py-8 text-center">
						<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--ink)]">
							No damaged stock records.
						</p>
					</div>
				)}
			</div>

			<RecordDamageDialog
				data={data}
				isOpen={recordOpen}
				onClose={() => setRecordOpen(false)}
				onSaved={() => invalidateDamageQueries(queryClient)}
			/>
			<DamageActionDialog
				action={actionState?.action ?? null}
				approvers={data.approvers}
				currentEmployeeId={data.currentEmployeeId}
				lot={actionLot}
				onClose={() => setActionState(null)}
				onSaved={() => invalidateDamageQueries(queryClient)}
			/>
		</div>
	)
}

function DamageToolbar({
	onRecord,
	search,
	setSearch,
}: {
	onRecord: () => void
	search: string
	setSearch: (value: string) => void
}) {
	return (
		<div className="flex flex-col gap-3 pb-2 md:flex-row md:items-center">
			<EmployeeSearchField
				value={search}
				onChange={setSearch}
				label="Search damaged stock"
				placeholder="Search product, SKU, damage no., or reason"
				className="md:flex-1"
			/>
			<EmployeeActionButton
				tone="danger"
				size="sm"
				leading={<PackageX aria-hidden="true" size={14} />}
				onClick={onRecord}
				fullWidthOnMobile
			>
				Record damage
			</EmployeeActionButton>
		</div>
	)
}

function DamageSummary({
	totals,
}: {
	totals: DamagedInventoryOverview['totals']
}) {
	const rows = [
		['Open lots', totals.openLots.toString()],
		['Remaining NRV', money(totals.remainingCarryingValue)],
		['Write-downs', money(totals.writeDownAmount)],
		['Recovered', money(totals.recoveredIncome)],
	]
	return (
		<div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
			{rows.map(([label, value]) => (
				<div
					key={label}
					className="rounded-md border border-[var(--rule-soft)] bg-[var(--folio)] px-3 py-3"
				>
					<p className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						{label}
					</p>
					<p className="mt-1 break-words font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-[var(--ink)]">
						{value}
					</p>
				</div>
			))}
		</div>
	)
}

function DamageLotCard({
	lot,
	onAction,
}: {
	lot: InventoryDamageLotView
	onAction: (action: DamageAction) => void
}) {
	const canAct = lot.remainingQuantity > 0
	const activity = lot.transactions.slice(0, 3)

	return (
		<li className="rounded-md border border-[var(--rule-soft)] bg-[var(--folio)]">
			<div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
				<div className="min-w-0">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<h3 className="break-words font-[family-name:var(--font-archivo)] text-[15px] font-semibold text-[var(--ink)]">
									{lot.productName}
								</h3>
								<EmployeeStatusPill
									tone={STATUS_TONE[lot.status]}
									className="px-2 py-1 text-[10px]"
								>
									{lot.status}
								</EmployeeStatusPill>
							</div>
							<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--ink-mid)]">
								{lot.damageNumber} · {lot.sku}
							</p>
						</div>
						<div className="text-left sm:text-right">
							<p className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-[var(--ink)]">
								{money(lot.remainingCarryingValue)}
							</p>
							<p className="mt-0.5 font-[family-name:var(--font-archivo)] text-[11px] text-[var(--ink-mid)]">
								remaining NRV
							</p>
						</div>
					</div>

					<div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
						<DamageMetric
							label="Remaining"
							value={quantity(lot.remainingQuantity, lot.unit)}
						/>
						<DamageMetric
							label="Original"
							value={quantity(lot.originalQuantity, lot.unit)}
						/>
						<DamageMetric
							label="Unit cost"
							value={money(lot.originalUnitCost)}
						/>
						<DamageMetric
							label="Write-down"
							value={money(lot.writeDownAmount)}
						/>
					</div>

					<p className="mt-4 break-words font-[family-name:var(--font-bricolage)] text-[12.5px] leading-relaxed text-[var(--ink-soft)]">
						{lot.reason}
					</p>

					{activity.length > 0 && (
						<div className="mt-4 divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)]">
							{activity.map((transaction) => (
								<div
									key={transaction.id}
									className="grid gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
								>
									<span className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink)]">
										{transaction.transactionType}{' '}
										{quantity(transaction.quantity, lot.unit)}
										{transaction.counterpartyName
											? ` · ${transaction.counterpartyName}`
											: ''}
									</span>
									<span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--ink-mid)]">
										{money(transaction.amount || transaction.carryingAmount)}
									</span>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="flex flex-col gap-2 lg:border-l lg:border-[var(--rule-soft)] lg:pl-4">
					<EmployeeActionButton
						tone="success"
						size="sm"
						leading={<Banknote aria-hidden="true" size={14} />}
						onClick={() => onAction('sell')}
						disabled={!canAct}
						fullWidthOnMobile
						className="w-full"
					>
						Sell
					</EmployeeActionButton>
					<EmployeeActionButton
						tone="neutral"
						size="sm"
						leading={<ArchiveX aria-hidden="true" size={14} />}
						onClick={() => onAction('dispose')}
						disabled={!canAct}
						fullWidthOnMobile
						className="w-full"
					>
						Dispose
					</EmployeeActionButton>
					<EmployeeActionButton
						tone="primary"
						size="sm"
						leading={<RotateCcw aria-hidden="true" size={14} />}
						onClick={() => onAction('reverse')}
						disabled={!canAct}
						fullWidthOnMobile
						className="w-full"
					>
						Reverse
					</EmployeeActionButton>
				</div>
			</div>
		</li>
	)
}

function DamageMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<p className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--ink-mid)]">
				{label}
			</p>
			<p className="mt-1 break-words font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold tabular-nums text-[var(--ink)]">
				{value}
			</p>
		</div>
	)
}

function RecordDamageDialog({
	data,
	isOpen,
	onClose,
	onSaved,
}: {
	data: DamagedInventoryOverview
	isOpen: boolean
	onClose: () => void
	onSaved: () => void
}) {
	const [productId, setProductId] = useState('')
	const [quantityText, setQuantityText] = useState('')
	const [recoveryPercentText, setRecoveryPercentText] = useState('50')
	const [reason, setReason] = useState('')
	const [proof, setProof] = useState<UploadedProofDocument | null>(null)
	const [error, setError] = useState<string | null>(null)

	const selectedProduct =
		data.products.find((product) => product.productId === productId) ??
		data.products[0] ??
		null
	const quantityValue = parsePositiveDecimal(quantityText)
	const recoveryPercent = parsePercent(recoveryPercentText)
	const estimatedUnitValue =
		selectedProduct && recoveryPercent !== null
			? (selectedProduct.unitCost * recoveryPercent) / 100
			: 0
	const estimatedLoss =
		selectedProduct && quantityValue !== null
			? Math.max(
					0,
					quantityValue * selectedProduct.unitCost -
						quantityValue * estimatedUnitValue,
				)
			: 0

	useEffect(() => {
		if (!isOpen) return
		setProductId(data.products[0]?.productId ?? '')
		setQuantityText('')
		setRecoveryPercentText('50')
		setReason('')
		setProof(null)
		setError(null)
	}, [data.products, isOpen])

	const mutation = useMutation({
		mutationFn: recordInventoryDamage,
		onSuccess: (result) => {
			if (!result.success) {
				setError(result.error)
				return
			}
			onSaved()
			onClose()
		},
		onError: () => {
			setError('Damage could not be recorded. Refresh and try again.')
		},
	})

	const proofData = proofPayload(proof)
	const canSubmit =
		!!selectedProduct &&
		quantityValue !== null &&
		quantityValue <= selectedProduct.availableQuantity &&
		recoveryPercent !== null &&
		reason.trim().length >= 5 &&
		proofData !== null &&
		!mutation.isPending

	const submit = () => {
		if (!selectedProduct || quantityValue === null || !proofData) return
		if (quantityValue > selectedProduct.availableQuantity) {
			setError('Damage quantity is above available stock.')
			return
		}
		if (recoveryPercent === null) {
			setError('Recovery percent must be between 0 and 100.')
			return
		}
		setError(null)
		mutation.mutate({
			data: {
				productId: selectedProduct.productId,
				proofDocumentId: proofData.proofDocumentId,
				proofPath: proofData.proofPath,
				quantity: quantityValue,
				reason,
				recoveryPercent,
			},
		})
	}

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={onClose}
			title="Record damage"
			eyebrow="Inventory"
			size="lg"
			dismissDisabled={mutation.isPending}
		>
			<DispatchBody className="space-y-5">
				<div className="rounded-md border border-[var(--color-border)] bg-black/[0.015] p-4 dark:bg-white/[0.025]">
					<div className="flex items-start gap-3">
						<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
							<PackageX aria-hidden="true" size={18} />
						</span>
						<div className="min-w-0">
							<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
								Move stock out of sellable inventory
							</p>
							<p className="mt-1 font-[family-name:var(--font-bricolage)] text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
								This creates a damaged lot, lowers sellable stock, estimates the
								write-down, and keeps the lot available for sale, disposal, or
								approved reversal.
							</p>
						</div>
					</div>
				</div>

				<DispatchSection label="Stock and valuation" />
				<div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(12rem,0.8fr)]">
					<DispatchField label="Product" required>
						<select
							value={selectedProduct?.productId ?? productId}
							onChange={(event) => setProductId(event.target.value)}
							className={DispatchInputClass()}
						>
							{data.products.map((product) => (
								<option key={product.productId} value={product.productId}>
									{product.name} · {product.sku}
								</option>
							))}
						</select>
					</DispatchField>
					<DispatchField label="Units damaged" required>
						<input
							value={quantityText}
							onChange={(event) =>
								setQuantityText(normalizeDecimalInput(event.target.value))
							}
							inputMode="decimal"
							className={DispatchInputClass()}
							placeholder="0"
						/>
					</DispatchField>
				</div>

				{selectedProduct && (
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						<DamageMetric
							label="Available"
							value={quantity(
								selectedProduct.availableQuantity,
								selectedProduct.unit,
							)}
						/>
						<DamageMetric
							label="Reserved"
							value={quantity(
								selectedProduct.reservedQuantity,
								selectedProduct.unit,
							)}
						/>
						<DamageMetric
							label="Unit cost"
							value={money(selectedProduct.unitCost)}
						/>
						<DamageMetric label="Loss est." value={money(estimatedLoss)} />
					</div>
				)}

				<div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
					<DispatchField label="Recovery value" required>
						<div className="rounded-md border border-black/[0.1] bg-black/[0.015] p-2 dark:border-white/[0.12] dark:bg-white/[0.025]">
							<div className="flex min-h-10 items-center px-2">
								<input
									value={recoveryPercentText}
									onChange={(event) =>
										setRecoveryPercentText(
											normalizeIntegerInput(event.target.value).slice(0, 3),
										)
									}
									inputMode="numeric"
									className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold text-[var(--color-text)] outline-none"
									placeholder="50"
								/>
								<span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--color-text-muted)]">
									%
								</span>
							</div>
							<div className="mt-2 grid grid-cols-4 gap-1.5">
								{['0', '25', '50', '75'].map((value) => (
									<button
										key={value}
										type="button"
										onClick={() => setRecoveryPercentText(value)}
										className={`h-8 rounded-md border font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold ${
											recoveryPercentText === value
												? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-surface)]'
												: 'border-black/[0.08] text-[var(--color-text-muted)] hover:border-black/[0.18] dark:border-white/[0.1]'
										}`}
									>
										{value}%
									</button>
								))}
							</div>
						</div>
					</DispatchField>
					<DispatchField label="Reason" required>
						<textarea
							value={reason}
							onChange={(event) => setReason(event.target.value)}
							className={`${DispatchInputClass()} min-h-32 resize-y`}
							placeholder="Water leak in bay A"
						/>
					</DispatchField>
				</div>

				<ProofUploadField
					label="Damage proof"
					value={proof}
					onChange={(next) => {
						setProof(next)
						setError(null)
					}}
					panel="inventory"
					proofType="stock_change"
					relatedEntityId={selectedProduct?.productId}
					relatedEntityType="inventory_damage"
					title={
						selectedProduct
							? `Inventory damage proof · ${selectedProduct.name}`
							: 'Inventory damage proof'
					}
				/>

				{error && (
					<p className="rounded-md border border-red-600/20 bg-red-600/[0.04] px-3 py-2 font-[family-name:var(--font-archivo)] text-[12px] text-red-700 dark:text-red-300">
						{error}
					</p>
				)}
			</DispatchBody>
			<DispatchFooter
				leading={
					quantityValue && selectedProduct
						? `${quantity(quantityValue, selectedProduct.unit)} at ${money(estimatedUnitValue)} NRV/unit`
						: undefined
				}
			>
				<DispatchAction tone="ghost" onPress={onClose}>
					Cancel
				</DispatchAction>
				<DispatchAction onPress={submit} isDisabled={!canSubmit}>
					{mutation.isPending ? 'Recording' : 'Record'}
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}

function DamageActionDialog({
	action,
	approvers,
	currentEmployeeId,
	lot,
	onClose,
	onSaved,
}: {
	action: DamageAction | null
	approvers: InventoryDamageApproverView[]
	currentEmployeeId: string | null
	lot: InventoryDamageLotView | null
	onClose: () => void
	onSaved: () => void
}) {
	const [quantityText, setQuantityText] = useState('')
	const [unitPriceText, setUnitPriceText] = useState('')
	const [counterpartyName, setCounterpartyName] = useState('')
	const [paymentStatus, setPaymentStatus] = useState<'paid' | 'receivable'>(
		'paid',
	)
	const [reason, setReason] = useState('')
	const [managerEmployeeId, setManagerEmployeeId] = useState('')
	const [managerPassword, setManagerPassword] = useState('')
	const [proof, setProof] = useState<UploadedProofDocument | null>(null)
	const [error, setError] = useState<string | null>(null)

	const isOpen = action !== null && lot !== null
	const quantityValue = parsePositiveDecimal(quantityText)
	const unitSalePrice = sanitizeCost(unitPriceText)
	const proofData = proofPayload(proof)
	const selectedApprover =
		approvers.find((approver) => approver.id === managerEmployeeId) ?? null

	useEffect(() => {
		if (!isOpen || !lot) return
		setQuantityText(
			String(Math.min(lot.remainingQuantity, lot.originalQuantity)),
		)
		setUnitPriceText(
			action === 'sell' ? String(Math.max(lot.carryingUnitValue, 1)) : '',
		)
		setCounterpartyName('')
		setPaymentStatus('paid')
		setReason('')
		setManagerEmployeeId(
			approvers.find((approver) => approver.id !== currentEmployeeId)?.id ?? '',
		)
		setManagerPassword('')
		setProof(null)
		setError(null)
	}, [action, approvers, currentEmployeeId, isOpen, lot])

	const sellMutation = useMutation({
		mutationFn: sellDamagedInventory,
		onSuccess: handleSuccess,
		onError: () => setError('Damaged stock sale could not be recorded.'),
	})
	const disposeMutation = useMutation({
		mutationFn: disposeDamagedInventory,
		onSuccess: handleSuccess,
		onError: () => setError('Damaged stock disposal could not be recorded.'),
	})
	const reverseMutation = useMutation({
		mutationFn: reverseInventoryDamage,
		onSuccess: handleSuccess,
		onError: () => setError('Damage reversal could not be recorded.'),
	})

	function handleSuccess(result: { error?: string; success: boolean }) {
		if (!result.success) {
			setError(result.error ?? 'Action could not be recorded.')
			return
		}
		onSaved()
		onClose()
	}

	const pending =
		sellMutation.isPending ||
		disposeMutation.isPending ||
		reverseMutation.isPending
	const validQuantity =
		!!lot && quantityValue !== null && quantityValue <= lot.remainingQuantity
	const canSell =
		action === 'sell' &&
		validQuantity &&
		unitSalePrice !== null &&
		counterpartyName.trim().length >= 2 &&
		proofData !== null
	const canDispose =
		action === 'dispose' &&
		validQuantity &&
		reason.trim().length >= 5 &&
		proofData !== null
	const canReverse =
		action === 'reverse' &&
		validQuantity &&
		reason.trim().length >= 5 &&
		Boolean(managerEmployeeId) &&
		managerEmployeeId !== currentEmployeeId &&
		managerPassword.trim().length > 0 &&
		proofData !== null
	const canSubmit = !pending && (canSell || canDispose || canReverse)
	const title = action ? ACTION_COPY[action].title : 'Damage action'
	const ActionIcon = action ? ACTION_COPY[action].icon : CheckCircle2

	const submit = () => {
		if (!lot || !action || !proofData || quantityValue === null) return
		if (quantityValue > lot.remainingQuantity) {
			setError('Action quantity is above remaining damaged stock.')
			return
		}
		setError(null)

		if (action === 'sell') {
			if (unitSalePrice === null) return
			sellMutation.mutate({
				data: {
					counterpartyName,
					lotId: lot.id,
					paymentStatus,
					proofDocumentId: proofData.proofDocumentId,
					proofPath: proofData.proofPath,
					quantity: quantityValue,
					unitSalePrice,
				},
			})
			return
		}

		if (action === 'dispose') {
			disposeMutation.mutate({
				data: {
					lotId: lot.id,
					proofDocumentId: proofData.proofDocumentId,
					proofPath: proofData.proofPath,
					quantity: quantityValue,
					reason,
				},
			})
			return
		}

		reverseMutation.mutate({
			data: {
				lotId: lot.id,
				managerEmployeeId,
				managerPassword,
				proofDocumentId: proofData.proofDocumentId,
				proofPath: proofData.proofPath,
				quantity: quantityValue,
				reason,
			},
		})
	}

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={onClose}
			title={title}
			eyebrow={lot?.damageNumber}
			size="lg"
			dismissDisabled={pending}
		>
			{lot && action && (
				<>
					<DispatchBody className="space-y-5">
						<div className="flex items-start gap-3 rounded-md border border-[var(--color-border)] px-3 py-3">
							<ActionIcon
								aria-hidden="true"
								size={18}
								className="mt-0.5 shrink-0 text-[var(--color-primary)]"
							/>
							<div className="min-w-0">
								<p className="break-words font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
									{lot.productName}
								</p>
								<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--color-text-muted)]">
									{quantity(lot.remainingQuantity, lot.unit)} remaining ·{' '}
									{money(lot.carryingUnitValue)} NRV/unit
								</p>
							</div>
						</div>

						<DispatchSection label="Quantity" />
						<DispatchField label="Units" required>
							<input
								value={quantityText}
								onChange={(event) =>
									setQuantityText(normalizeDecimalInput(event.target.value))
								}
								inputMode="decimal"
								className={DispatchInputClass()}
							/>
						</DispatchField>

						{action === 'sell' && (
							<div className="grid gap-4 md:grid-cols-3">
								<DispatchField label="Unit sale price" required>
									<input
										value={unitPriceText}
										onChange={(event) =>
											setUnitPriceText(
												normalizeDecimalInput(event.target.value),
											)
										}
										inputMode="decimal"
										className={DispatchInputClass()}
									/>
								</DispatchField>
								<DispatchField label="Customer" required>
									<input
										value={counterpartyName}
										onChange={(event) =>
											setCounterpartyName(event.target.value)
										}
										className={DispatchInputClass()}
										placeholder="Buyer name"
									/>
								</DispatchField>
								<DispatchField label="Payment" required>
									<select
										value={paymentStatus}
										onChange={(event) =>
											setPaymentStatus(
												event.target.value === 'receivable'
													? 'receivable'
													: 'paid',
											)
										}
										className={DispatchInputClass()}
									>
										<option value="paid">Paid</option>
										<option value="receivable">Receivable</option>
									</select>
								</DispatchField>
							</div>
						)}

						{action !== 'sell' && (
							<DispatchField label="Reason" required>
								<textarea
									value={reason}
									onChange={(event) => setReason(event.target.value)}
									className={`${DispatchInputClass()} min-h-24 resize-y`}
									placeholder={
										action === 'dispose'
											? 'Material cannot be recovered'
											: 'Damage count corrected after inspection'
									}
								/>
							</DispatchField>
						)}

						{action === 'reverse' && (
							<>
								<DispatchSection label="Approval" />
								<div className="grid gap-4 md:grid-cols-2">
									<DispatchField label="Manager" required>
										<select
											value={managerEmployeeId}
											onChange={(event) =>
												setManagerEmployeeId(event.target.value)
											}
											className={DispatchInputClass()}
										>
											<option value="">Select manager</option>
											{approvers
												.filter((approver) => approver.id !== currentEmployeeId)
												.map((approver) => (
													<option key={approver.id} value={approver.id}>
														{approver.name} · {approver.roleLabel}
													</option>
												))}
										</select>
									</DispatchField>
									<DispatchField label="Manager password" required>
										<input
											type="password"
											value={managerPassword}
											onChange={(event) =>
												setManagerPassword(event.target.value)
											}
											className={DispatchInputClass()}
											placeholder="Password"
										/>
									</DispatchField>
								</div>
								{selectedApprover && (
									<EmployeeStatusPill
										tone="neutral"
										leading={<ShieldCheck aria-hidden="true" size={13} />}
										className="px-2 py-1 text-[11px]"
									>
										{selectedApprover.name}
									</EmployeeStatusPill>
								)}
							</>
						)}

						<ProofUploadField
							label={`${action} proof`}
							value={proof}
							onChange={(next) => {
								setProof(next)
								setError(null)
							}}
							panel="inventory"
							proofType={ACTION_COPY[action].proofType}
							relatedEntityId={lot.id}
							relatedEntityType={`inventory_damage_${action}`}
							title={`${ACTION_COPY[action].title} · ${lot.damageNumber}`}
						/>

						{error && (
							<p className="rounded-md border border-red-600/20 bg-red-600/[0.04] px-3 py-2 font-[family-name:var(--font-archivo)] text-[12px] text-red-700 dark:text-red-300">
								{error}
							</p>
						)}
					</DispatchBody>
					<DispatchFooter
						leading={
							quantityValue
								? `${quantity(quantityValue, lot.unit)} · ${money(
										quantityValue * lot.carryingUnitValue,
									)} carrying`
								: undefined
						}
					>
						<DispatchAction tone="ghost" onPress={onClose}>
							Cancel
						</DispatchAction>
						<DispatchAction onPress={submit} isDisabled={!canSubmit}>
							{pending ? 'Saving' : 'Save'}
						</DispatchAction>
					</DispatchFooter>
				</>
			)}
		</DispatchDialog>
	)
}
