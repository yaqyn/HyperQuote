import { CheckCircle2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
	isValidProof,
	MIN_PROOF_LENGTH,
	type ProofReason,
	proofNeededFor,
} from '../../../lib/inputs'
import {
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../../shared/DispatchDialog'
import { EmployeeActionButton } from '../../shared/EmployeeControls'

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
		title: 'a lower price needs a paper trail',
		hint: 'dropping a cost without evidence is the #1 way the ledger drifts. name the rep, paste the message, or describe the negotiation.',
	},
	'large-change': {
		title: 'a big jump needs a paper trail',
		hint: 'this change is more than 25% in one go. record the negotiation or catch the typo before you commit.',
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
			eyebrow="Compendium · Price change"
			title={productName}
			caption={supplierName ? `via ${supplierName}` : undefined}
		>
			<div className="compendium-theme bg-[var(--folio)] text-[var(--ink)]">
				<DispatchBody>
					{/* Was / will be / delta — editorial baseline, no cells. */}
					<div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-4 border-y border-[var(--rule-soft)] py-5">
						<PriceColumn
							label="was"
							value={
								oldCost > 0
									? oldCost.toLocaleString('en-EG', {
											minimumFractionDigits: 2,
										})
									: '—'
							}
							muted
						/>
						<span
							aria-hidden="true"
							className="pb-3 font-[family-name:var(--font-fraunces)] italic"
							style={{
								fontSize: '20px',
								color: 'var(--compendium-brand)',
							}}
						>
							→
						</span>
						<PriceColumn
							label="will be"
							value={newCost.toLocaleString('en-EG', {
								minimumFractionDigits: 2,
							})}
						/>
						<div aria-hidden="true" className="h-10 w-px bg-[var(--rule)]" />
						<PriceColumn
							label="delta"
							value={
								oldCost === 0
									? 'new'
									: `${isIncrease ? '+' : ''}${deltaPct.toFixed(1)}%`
							}
							tone={oldCost === 0 ? 'muted' : isIncrease ? 'aging' : 'fresh'}
						/>
					</div>

					<p
						className="mt-4 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
						style={{
							fontSize: '12px',
							letterSpacing: '0.002em',
						}}
					>
						sales will see the updated cost on any quote drafted after this
						moment. EGP / {unit}.
					</p>

					{proofReason && (
						<div className="mt-5 border-y-2 border-[var(--compendium-aging)] py-4">
							<p
								className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.22em]"
								style={{ color: 'var(--compendium-aging)' }}
							>
								{PROOF_COPY[proofReason].title}
							</p>
							<p
								className="mt-1.5 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
								style={{
									fontSize: '12.5px',
									lineHeight: 1.5,
									letterSpacing: '0.001em',
								}}
							>
								{PROOF_COPY[proofReason].hint}
							</p>
							<textarea
								value={proof}
								onChange={(e) => setProof(e.target.value)}
								placeholder="e.g. Ahmed @ Suez Cement confirmed by phone 11:45 — bulk discount applied"
								rows={3}
								className="mt-3 w-full resize-none bg-transparent font-[family-name:var(--font-fraunces)] text-[var(--ink)] outline-none"
								style={{
									fontSize: '13px',
									borderBottom: `1px solid ${
										proofOk ? 'var(--rule)' : 'var(--compendium-aging)'
									}`,
									paddingBottom: '6px',
								}}
							/>
							<div className="mt-2 flex items-baseline justify-between">
								<span
									className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
									style={{ fontSize: '10.5px' }}
								>
									minimum {MIN_PROOF_LENGTH} characters
								</span>
								<span
									className="font-[family-name:var(--font-geist-mono)] tabular-nums"
									style={{
										fontSize: '10.5px',
										color: proofOk
											? 'var(--compendium-fresh)'
											: 'var(--ink-mid)',
									}}
								>
									{proof.trim().length} / {MIN_PROOF_LENGTH}
								</span>
							</div>
						</div>
					)}
				</DispatchBody>

				<DispatchFooter>
					<EmployeeActionButton
						size="sm"
						tone="neutral"
						leading={<X size={13} strokeWidth={2.4} />}
						onClick={onCancel}
						fullWidthOnMobile
					>
						Cancel
					</EmployeeActionButton>
					<EmployeeActionButton
						size="sm"
						leading={<CheckCircle2 size={13} strokeWidth={2.4} />}
						onClick={handleConfirm}
						disabled={!proofOk || !armed}
						fullWidthOnMobile
					>
						Confirm update
					</EmployeeActionButton>
				</DispatchFooter>
			</div>
		</DispatchDialog>
	)
}

function PriceColumn({
	label,
	value,
	muted,
	tone,
}: {
	label: string
	value: string
	muted?: boolean
	tone?: 'muted' | 'aging' | 'fresh'
}) {
	const color =
		tone === 'aging'
			? 'var(--compendium-aging)'
			: tone === 'fresh'
				? 'var(--compendium-fresh)'
				: muted || tone === 'muted'
					? 'var(--ink-mid)'
					: 'var(--ink)'
	return (
		<div className="flex flex-col items-start">
			<span
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
				style={{ fontSize: '10.5px', letterSpacing: '0.02em' }}
			>
				{label}
			</span>
			<span
				className="mt-1 compendium-numeral font-[family-name:var(--font-fraunces)] leading-none"
				style={{
					fontSize: '22px',
					fontWeight: 500,
					letterSpacing: '-0.02em',
					color,
				}}
			>
				{value}
			</span>
		</div>
	)
}
