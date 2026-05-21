import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
	getSalesApprovers,
	validateSalesApproverCredential,
} from '../../../lib/server/sales-quotes'
import type { MarginThresholds } from '../../../types/sales'

interface ApprovalWorkflowProps {
	marginPercent: number
	totalValue: number
	thresholds: MarginThresholds[]
	status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
	className?: string
	onStatusChange?: (status: string) => void
	/** Called whenever send-blocking state changes. Parent uses this to disable/enable Send button. */
	onSendBlockedChange?: (blocked: boolean, reason: string | null) => void
	onSignatureChange?: (state: ApprovalSignatureState) => void
}

export interface ApprovalSignatureState {
	needsApproval: boolean
	managerName?: string
	managerSigned: boolean
}

type ApproverRole = 'none' | 'sales_manager' | 'vp_sales' | 'director' | 'ceo'

interface ApprovalChainEntry {
	role: string
	label: string
	required: boolean
	reason: string
}

type SecurityMethod = 'password' | 'qr'

function determineApprovalChain(
	marginPercent: number,
	totalValue: number,
	thresholds: MarginThresholds[],
): {
	chain: ApprovalChainEntry[]
	highestRole: ApproverRole
	summaryLabel: string
} {
	const ref = thresholds[0] ?? { target: 18, floor: 12, absoluteMin: 8 }
	const chain: ApprovalChainEntry[] = []

	let marginRole: ApproverRole = 'none'
	let marginSummary = ''
	if (marginPercent < 0) {
		marginRole = 'ceo'
		marginSummary = 'CEO approval required (strategic deal)'
	} else if (marginPercent < ref.absoluteMin) {
		marginRole = 'ceo'
		marginSummary = 'CEO approval required (strategic deal)'
	} else if (marginPercent < ref.floor) {
		marginRole = 'vp_sales'
		marginSummary = 'VP Sales approval required'
	} else if (marginPercent < ref.target) {
		marginRole = 'sales_manager'
		marginSummary = 'Sales Manager approval required'
	}

	let valueRole: ApproverRole = 'none'
	let valueSummary = ''
	if (totalValue > 50_000_000) {
		valueRole = 'ceo'
		valueSummary = 'Sales Manager + Director + CEO'
	} else if (totalValue > 10_000_000) {
		valueRole = 'director'
		valueSummary = 'Sales Manager + Director'
	} else if (totalValue > 2_500_000) {
		valueRole = 'sales_manager'
		valueSummary = 'Sales Manager sign-off'
	}

	const rolePriority: ApproverRole[] = [
		'none',
		'sales_manager',
		'director',
		'vp_sales',
		'ceo',
	]
	const highestRole =
		rolePriority.indexOf(marginRole) > rolePriority.indexOf(valueRole)
			? marginRole
			: valueRole

	const summaryLabel =
		rolePriority.indexOf(marginRole) > rolePriority.indexOf(valueRole)
			? marginSummary
			: valueSummary || marginSummary

	if (highestRole === 'none')
		return { chain: [], highestRole, summaryLabel: 'No approval needed' }

	const neededIndex = rolePriority.indexOf(highestRole)

	if (neededIndex >= 1) {
		chain.push({
			role: 'sales_manager',
			label: 'Sales Manager',
			required: true,
			reason:
				marginPercent < ref.target
					? `Margin ${marginPercent}% below target ${ref.target}%`
					: `Value EGP ${(totalValue / 1_000_000).toFixed(1)}M`,
		})
	}
	if (neededIndex >= 2) {
		chain.push({
			role: 'director',
			label: 'Director',
			required: true,
			reason: 'Value exceeds EGP 10M',
		})
	}
	if (neededIndex >= 3) {
		chain.push({
			role: 'vp_sales',
			label: 'VP Sales',
			required: true,
			reason: `Margin ${marginPercent}% below floor ${ref.floor}%`,
		})
	}
	if (neededIndex >= 4) {
		chain.push({
			role: 'ceo',
			label: 'CEO',
			required: true,
			reason:
				marginPercent < ref.absoluteMin
					? `Margin ${marginPercent}% below minimum ${ref.absoluteMin}%`
					: 'Value exceeds EGP 50M',
		})
	}

	return { chain, highestRole, summaryLabel }
}

function SignatureSlot({
	label,
	name,
	helper,
	signed,
	side,
}: {
	label: string
	name?: string
	helper: string
	signed: boolean
	side: 'left' | 'right'
}) {
	const isRight = side === 'right'
	return (
		<div
			className={`min-w-0 ${isRight ? 'md:ms-auto md:text-right' : 'md:me-auto'}`}
		>
			<div
				className={`flex min-h-24 items-end border-b border-[var(--color-text-muted)] pb-3 ${
					isRight ? 'justify-start md:justify-end' : 'justify-start'
				}`}
			>
				{signed && name ? (
					<span className="break-words font-[family-name:var(--font-literata)] text-[24px] italic leading-tight text-[var(--color-text)]">
						{name}
					</span>
				) : (
					<span className="font-[family-name:var(--font-archivo)] text-[11px] italic text-[var(--color-text-subtle)]">
						pending signature
					</span>
				)}
			</div>
			<p className="mt-2 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase text-[var(--color-text)]">
				{label}
			</p>
			<p className="mt-1 break-words font-[family-name:var(--font-archivo)] text-[11px] italic leading-5 text-[var(--color-text-subtle)]">
				{helper}
			</p>
		</div>
	)
}

export function QuoteSignatureSection({
	preparedByName,
	needsApproval,
	managerName,
	managerSigned,
}: {
	preparedByName: string
	needsApproval: boolean
	managerName?: string
	managerSigned: boolean
}) {
	return (
		<section
			aria-label="Report signatures"
			className="px-4 pb-2 pt-8 sm:px-6 lg:px-8"
		>
			<div className="border-t border-[var(--color-border)] pt-7">
				<p className="font-[family-name:var(--font-literata)] text-[18px] font-medium text-[var(--color-text)]">
					Final Signatures
				</p>
			</div>
			<div className="mt-10 grid gap-12 md:grid-cols-2">
				<SignatureSlot
					label="Prepared by"
					name={preparedByName}
					helper="Signed by the employee preparing this HyperQuote sheet."
					signed
					side="left"
				/>
				{needsApproval && (
					<SignatureSlot
						label="Manager approval"
						name={managerName}
						helper={
							managerName
								? `Approving manager: ${managerName}`
								: 'The approving manager signs here before finance receives the quote.'
						}
						signed={managerSigned}
						side="right"
					/>
				)}
			</div>
		</section>
	)
}

export function ApprovalWorkflow({
	marginPercent,
	totalValue,
	thresholds,
	status,
	className = '',
	onStatusChange,
	onSendBlockedChange,
	onSignatureChange,
}: ApprovalWorkflowProps) {
	const [selectedApproverId, setSelectedApproverId] = useState('')
	const [securityMethod, setSecurityMethod] =
		useState<SecurityMethod>('password')
	const [credentialToken, setCredentialToken] = useState('')
	const [approvalError, setApprovalError] = useState<string | null>(null)

	const { chain, summaryLabel } = determineApprovalChain(
		marginPercent,
		totalValue,
		thresholds,
	)
	const needsApproval = chain.length > 0
	const sendBlocked = needsApproval && status !== 'approved'
	const { data: approversData, isPending: approversPending } = useQuery({
		queryKey: ['sales-approvers'],
		queryFn: () => getSalesApprovers({ data: {} }),
		staleTime: 5 * 60_000,
		enabled: needsApproval,
	})
	const approvers = approversData?.approvers ?? []
	const selectedApprover = approvers.find((a) => a.id === selectedApproverId)
	const showApproverScrollCue = approvers.length > 4
	const credentialReady = credentialToken.trim().length > 0
	const approveMutation = useMutation({
		mutationFn: () => {
			if (!selectedApprover) throw new Error('Select an approving manager')
			return validateSalesApproverCredential({
				data: {
					approverId: selectedApprover.id,
					securityMethod,
					securityToken: credentialToken.trim(),
				},
			})
		},
		onSuccess: (result) => {
			if (!result.success) {
				setApprovalError(result.error)
				return
			}
			setCredentialToken('')
			setApprovalError(null)
			onStatusChange?.('approved')
		},
		onError: (error: Error) => setApprovalError(error.message),
	})
	const canApprove =
		!!selectedApprover && credentialReady && !approveMutation.isPending

	// Notify parent of send-blocked state
	useEffect(() => {
		onSendBlockedChange?.(
			sendBlocked,
			sendBlocked ? `Approval required: ${summaryLabel}` : null,
		)
	}, [sendBlocked, summaryLabel, onSendBlockedChange])

	const managerName = selectedApprover?.name
	const managerSigned = needsApproval && status === 'approved'
	const approvalRoleLabel = chain[chain.length - 1]?.label ?? 'Manager'

	useEffect(() => {
		onSignatureChange?.({
			needsApproval,
			managerName,
			managerSigned,
		})
	}, [managerName, managerSigned, needsApproval, onSignatureChange])

	if (!needsApproval) return null

	return (
		<div className={className}>
			<section aria-label="Manager approval">
				<div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<div className="min-w-0">
						<p className="font-[family-name:var(--font-literata)] text-[18px] font-medium text-[var(--color-text)]">
							Manager Sign-off
						</p>
						<p className="mt-2 break-words font-[family-name:var(--font-archivo)] text-[12px] leading-6 text-[var(--color-text-muted)]">
							{status === 'approved'
								? `Approved${managerName ? ` by ${managerName}` : ''}.`
								: status === 'rejected'
									? 'Approval was rejected.'
									: `${approvalRoleLabel} review is required before this sheet can be sent to finance.`}
						</p>
						<p className="mt-2 break-words font-[family-name:var(--font-archivo)] text-[11px] italic leading-5 text-[var(--color-text-subtle)]">
							{summaryLabel}
							{chain.length > 0
								? ` · ${chain.map((entry) => entry.reason).join(' · ')}`
								: ''}
						</p>
					</div>

					{status === 'approved' || status === 'rejected' ? (
						<div className="rounded-md border border-[var(--color-border)] px-4 py-4">
							<p className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase text-[var(--color-text)]">
								{status === 'approved'
									? 'Approval recorded'
									: 'Approval closed'}
							</p>
							<p className="mt-2 font-[family-name:var(--font-literata)] text-[18px] italic text-[var(--color-text)]">
								{managerName ?? 'No manager selected'}
							</p>
						</div>
					) : (
						<div className="grid min-w-0 gap-4">
							<fieldset className="min-w-0">
								<legend className="mb-2 font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase text-[var(--color-text-subtle)]">
									Approving manager
								</legend>
								<div className="relative overflow-hidden rounded-md">
									<div className="grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
										{approversPending && (
											<p className="rounded-md border border-[var(--color-border)] px-3 py-3 font-[family-name:var(--font-archivo)] text-[12px] italic text-[var(--color-text-subtle)] sm:col-span-2">
												Loading managers...
											</p>
										)}
										{!approversPending && approvers.length === 0 && (
											<p className="rounded-md border border-[var(--color-border)] px-3 py-3 font-[family-name:var(--font-archivo)] text-[12px] italic text-[var(--color-text-subtle)] sm:col-span-2">
												No managers available.
											</p>
										)}
										{approvers.map((approver) => {
											const selected = selectedApproverId === approver.id
											return (
												<button
													key={approver.id}
													type="button"
													onClick={() => {
														setSelectedApproverId(approver.id)
														setApprovalError(null)
													}}
													className={`min-w-0 rounded-md border px-3 py-3 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
														selected
															? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.07]'
															: 'border-[var(--color-border)] hover:bg-black/[0.018] dark:hover:bg-white/[0.025]'
													}`}
													aria-pressed={selected}
												>
													<span className="block break-words font-[family-name:var(--font-literata)] text-[15px] font-medium leading-5 text-[var(--color-text)]">
														{approver.name}
													</span>
													<span className="mt-1 block font-[family-name:var(--font-archivo)] text-[10px] italic text-[var(--color-text-subtle)]">
														{selected
															? 'selected signatory'
															: approvalRoleLabel}
													</span>
												</button>
											)
										})}
									</div>
									{showApproverScrollCue && (
										<>
											<div
												aria-hidden="true"
												className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-[var(--color-surface)] to-transparent shadow-[inset_0_12px_16px_-18px_rgba(0,0,0,0.95)]"
											/>
											<div
												aria-hidden="true"
												className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[var(--color-surface)] to-transparent shadow-[inset_0_-14px_18px_-18px_rgba(0,0,0,0.95)]"
											/>
										</>
									)}
								</div>
							</fieldset>

							<div className="rounded-md border border-[var(--color-border)] p-3">
								<div className="grid grid-cols-2 gap-1 border-b border-[var(--color-border)] pb-3">
									{(['password', 'qr'] as const).map((method) => (
										<button
											key={method}
											type="button"
											onClick={() => {
												setSecurityMethod(method)
												setCredentialToken('')
												setApprovalError(null)
											}}
											className={`h-9 rounded-sm px-2 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
												securityMethod === method
													? 'bg-[var(--color-text)] text-[var(--color-surface)]'
													: 'text-[var(--color-text-muted)] hover:bg-black/[0.035] hover:text-[var(--color-text)] dark:hover:bg-white/[0.04]'
											}`}
										>
											{method === 'password' ? 'Password seal' : 'QR scan'}
										</button>
									))}
								</div>

								{securityMethod === 'password' ? (
									<label className="mt-3 block">
										<span className="font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase text-[var(--color-text-subtle)]">
											Manager password
										</span>
										<input
											type="password"
											value={credentialToken}
											onChange={(event) => {
												setCredentialToken(event.target.value)
												setApprovalError(null)
											}}
											placeholder="Type password to sign"
											autoComplete="off"
											className="mt-2 h-11 w-full min-w-0 border-0 border-b border-[var(--color-border)] bg-transparent px-0 font-[family-name:var(--font-archivo)] text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] focus-visible:border-[var(--color-primary)]"
										/>
									</label>
								) : (
									<label className="mt-3 block">
										<span className="font-[family-name:var(--font-archivo)] text-[9px] font-semibold uppercase text-[var(--color-text-subtle)]">
											Manager badge token
										</span>
										<input
											type="text"
											value={credentialToken}
											onChange={(event) => {
												setCredentialToken(event.target.value)
												setApprovalError(null)
											}}
											placeholder="Scan configured badge"
											autoComplete="off"
											className="mt-2 h-11 w-full min-w-0 border-0 border-b border-[var(--color-border)] bg-transparent px-0 font-[family-name:var(--font-archivo)] text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] focus-visible:border-[var(--color-primary)]"
										/>
									</label>
								)}
								{approvalError && (
									<p className="mt-3 font-[family-name:var(--font-archivo)] text-[11px] text-red-600 dark:text-red-400">
										{approvalError}
									</p>
								)}
							</div>

							<button
								type="button"
								disabled={!canApprove}
								onClick={() => approveMutation.mutate()}
								className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-transparent bg-[var(--color-text)] px-4 py-2 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase text-[var(--color-surface)] outline-none transition-colors hover:bg-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:bg-transparent disabled:text-[var(--color-text-subtle)]"
							>
								{approveMutation.isPending
									? 'Checking manager'
									: 'Sign manager approval'}
							</button>
						</div>
					)}
				</div>
			</section>
		</div>
	)
}
