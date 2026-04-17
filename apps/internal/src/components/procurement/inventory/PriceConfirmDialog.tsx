import { ArrowRight, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
	isValidProof,
	MIN_PROOF_LENGTH,
	type ProofReason,
	proofNeededFor,
} from '../../../lib/inputs'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
	DispatchInputClass,
} from '../../shared/DispatchDialog'

interface PriceConfirmDialogProps {
	isOpen: boolean
	productName: string
	supplierName?: string
	unit: string
	oldCost: number
	newCost: number
	/** Called with the user-supplied proof text when the guard required one. */
	onConfirm: (proof?: string) => void
	onCancel: () => void
}

const PROOF_COPY: Record<
	NonNullable<ProofReason>,
	{ title: string; hint: string }
> = {
	decrease: {
		title: 'Lower price needs proof',
		hint: 'Dropping a cost without a paper trail is the #1 way the ledger drifts.',
	},
	'large-change': {
		title: 'Big jump needs proof',
		hint: 'This change is more than 25% in one go — record the negotiation or catch the typo.',
	},
}

export function PriceConfirmDialog({
	isOpen,
	productName,
	supplierName,
	unit,
	oldCost,
	newCost,
	onConfirm,
	onCancel,
}: PriceConfirmDialogProps) {
	const proofReason = proofNeededFor(oldCost, newCost)
	const [proof, setProof] = useState('')

	useEffect(() => {
		if (isOpen) setProof('')
	}, [isOpen])

	const proofOk = proofReason === null || isValidProof(proof)

	const [armed, setArmed] = useState(false)
	useEffect(() => {
		if (!isOpen) {
			setArmed(false)
			return
		}
		const timer = setTimeout(() => setArmed(true), 250)
		return () => clearTimeout(timer)
	}, [isOpen])

	const handleConfirm = () => {
		if (!proofOk) return
		onConfirm(proofReason ? proof.trim() : undefined)
	}

	const delta = newCost - oldCost
	const deltaPct = oldCost > 0 ? (delta / oldCost) * 100 : 0
	const isIncrease = delta > 0

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={onCancel}
			size="sm"
			eyebrow="Procurement · Price change"
			title={productName}
			caption={supplierName ? `via ${supplierName}` : undefined}
		>
			<DispatchBody>
				{/* Was → will be → delta */}
				<div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 px-4 py-4 border border-black/[0.1] dark:border-white/[0.12] bg-black/[0.02] dark:bg-white/[0.02]">
					<PriceCell
						label="Was"
						value={
							oldCost > 0
								? oldCost.toLocaleString('en-EG', { minimumFractionDigits: 2 })
								: '—'
						}
						muted
					/>
					<ArrowRight
						size={14}
						strokeWidth={2}
						className="text-[var(--color-text-subtle)]"
					/>
					<PriceCell
						label="Will be"
						value={newCost.toLocaleString('en-EG', {
							minimumFractionDigits: 2,
						})}
					/>
					<div className="border-s border-black/[0.08] h-8 dark:border-white/[0.1]" />
					<PriceCell
						label="Delta"
						value={
							oldCost === 0
								? 'new'
								: `${isIncrease ? '+' : ''}${deltaPct.toFixed(1)}%`
						}
						tone={oldCost === 0 ? 'muted' : isIncrease ? 'amber' : 'primary'}
						end
					/>
				</div>

				<p className="mt-3 font-[family-name:var(--font-archivo)] italic text-[12px] text-[var(--color-text-subtle)]">
					Sales will see the updated cost on any quote drafted after this
					moment. EGP / {unit}.
				</p>

				{proofReason && (
					<div className="mt-5 border border-[#D97706]/40 bg-[#D97706]/[0.05] p-4">
						<div className="flex items-start gap-3">
							<ShieldAlert
								size={14}
								strokeWidth={2}
								className="mt-0.5 shrink-0 text-[#D97706]"
							/>
							<div>
								<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[#D97706]">
									{PROOF_COPY[proofReason].title}
								</p>
								<p className="mt-1 font-[family-name:var(--font-archivo)] italic text-[12px] text-[var(--color-text-muted)] leading-relaxed">
									{PROOF_COPY[proofReason].hint}
								</p>
							</div>
						</div>
						<textarea
							value={proof}
							onChange={(e) => setProof(e.target.value)}
							placeholder="e.g. Ahmed @ Suez Cement confirmed by phone 11:45 — bulk discount applied…"
							rows={3}
							className={`${DispatchInputClass()} mt-3 resize-none`}
						/>
						<div className="mt-1 flex items-center justify-between font-[family-name:var(--font-plex-mono)] text-[9.5px] uppercase tracking-[0.16em]">
							<span className="text-[var(--color-text-subtle)]">
								Minimum {MIN_PROOF_LENGTH} characters
							</span>
							<span
								className={`tabular-nums ${
									proof.trim().length >= MIN_PROOF_LENGTH
										? 'text-[var(--color-primary)]'
										: 'text-[var(--color-text-subtle)]'
								}`}
							>
								{proof.trim().length} / {MIN_PROOF_LENGTH}
							</span>
						</div>
					</div>
				)}
			</DispatchBody>

			<DispatchFooter>
				<DispatchAction tone="ghost" onPress={onCancel}>
					Cancel
				</DispatchAction>
				<DispatchAction onPress={handleConfirm} isDisabled={!proofOk || !armed}>
					Confirm update
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}

function PriceCell({
	label,
	value,
	muted,
	tone,
	end,
}: {
	label: string
	value: string
	muted?: boolean
	tone?: 'muted' | 'amber' | 'primary'
	end?: boolean
}) {
	const valueColor =
		tone === 'amber'
			? 'text-[#D97706]'
			: tone === 'primary'
				? 'text-[var(--color-primary)]'
				: muted || tone === 'muted'
					? 'text-[var(--color-text-muted)]'
					: 'text-[var(--color-text)]'
	return (
		<div className={end ? 'text-end' : ''}>
			<p className="font-[family-name:var(--font-plex-mono)] text-[9.5px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
				{label}
			</p>
			<p
				className={`mt-1 font-[family-name:var(--font-plex-mono)] text-[15px] font-medium tabular-nums ${valueColor}`}
			>
				{value}
			</p>
		</div>
	)
}
