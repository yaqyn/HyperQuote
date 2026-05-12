import { useEffect, useState } from 'react'
import { requestApproval } from '../../../lib/server/sales-quotes'
import type { CustomerTier, MarginThresholds } from '../../../types/sales'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../../shared/EmployeeControls'
import { UnderlineTextArea } from '../../ui'

interface ApprovalWorkflowProps {
	quoteId: string
	marginPercent: number
	totalValue: number
	/** Reserved — tier-specific approval rules will read this once wired. */
	customerTier?: CustomerTier
	thresholds: MarginThresholds[]
	status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
	isApprover?: boolean
	layout?: 'inline' | 'footer'
	showRequestAction?: boolean
	onStatusChange?: (status: string) => void
	/** Called whenever send-blocking state changes. Parent uses this to disable/enable Send button. */
	onSendBlockedChange?: (blocked: boolean, reason: string | null) => void
}

type ApproverRole = 'none' | 'sales_manager' | 'vp_sales' | 'director' | 'ceo'

interface ApprovalChainEntry {
	role: string
	label: string
	required: boolean
	reason: string
}

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

export function ApprovalWorkflow({
	quoteId,
	marginPercent,
	totalValue,
	thresholds,
	status,
	isApprover = false,
	layout = 'inline',
	showRequestAction = true,
	onStatusChange,
	onSendBlockedChange,
}: ApprovalWorkflowProps) {
	const [justification, setJustification] = useState('')
	const [isSubmitting, setSubmitting] = useState(false)

	const { chain, highestRole, summaryLabel } = determineApprovalChain(
		marginPercent,
		totalValue,
		thresholds,
	)
	const needsApproval = chain.length > 0
	const sendBlocked = needsApproval && status !== 'approved'
	const isFooter = layout === 'footer'

	// Notify parent of send-blocked state
	useEffect(() => {
		onSendBlockedChange?.(
			sendBlocked,
			sendBlocked ? `Approval required: ${summaryLabel}` : null,
		)
	}, [sendBlocked, summaryLabel, onSendBlockedChange])

	const handleRequestApproval = async () => {
		if (!highestRole || highestRole === 'none' || isSubmitting) return
		setSubmitting(true)
		try {
			const approverRole =
				highestRole === 'director'
					? 'sales_manager'
					: (highestRole as string) === 'none'
						? 'sales_manager'
						: highestRole
			await requestApproval({
				data: {
					quoteId,
					approverRole: approverRole as 'sales_manager' | 'vp_sales' | 'ceo',
					justification: justification || undefined,
				},
			})
			onStatusChange?.('pending_approval')
		} catch (err) {
			console.error('Failed to request approval:', err)
		} finally {
			setSubmitting(false)
		}
	}

	// Auto-approved
	if (!needsApproval) {
		if (isFooter) return null

		return (
			<EmployeeStatusPill tone="success" leading={<ApprovalCheckIcon />}>
				Auto-approved
			</EmployeeStatusPill>
		)
	}

	// Approved
	if (status === 'approved') {
		if (isFooter) return null

		return (
			<EmployeeStatusPill tone="success" leading={<ApprovalCheckIcon />}>
				Approved
			</EmployeeStatusPill>
		)
	}

	// Pending
	if (status === 'pending_approval') {
		return (
			<div
				className={
					isFooter
						? 'flex flex-col gap-2 sm:flex-row sm:items-center'
						: 'flex flex-col gap-3 lg:flex-row lg:items-center'
				}
			>
				<EmployeeStatusPill tone="warning">
					Pending {chain[chain.length - 1]?.label ?? 'approver'} · escalates in
					2h
				</EmployeeStatusPill>

				{isApprover && (
					<div className="flex flex-wrap gap-2">
						<EmployeeActionButton
							size="sm"
							tone="success"
							onClick={() => onStatusChange?.('approved')}
						>
							Approve
						</EmployeeActionButton>
						<EmployeeActionButton
							size="sm"
							tone="danger"
							onClick={() => onStatusChange?.('rejected')}
						>
							Reject
						</EmployeeActionButton>
						<EmployeeActionButton
							size="sm"
							tone="neutral"
							onClick={() => onStatusChange?.('changes_requested')}
						>
							Changes
						</EmployeeActionButton>
					</div>
				)}
			</div>
		)
	}

	// Needs approval -- approver + reason, justification, submit.
	return (
		<div
			className={
				isFooter ? 'flex flex-col gap-2 lg:flex-row lg:items-end' : 'space-y-3'
			}
		>
			<EmployeeStatusPill tone="warning">{summaryLabel}</EmployeeStatusPill>
			{!isFooter && (
				<div className="flex flex-wrap items-center gap-2">
					{chain.map((entry, i) => (
						<span key={entry.role} className="flex items-center gap-1">
							<span className="text-[13px] font-medium">{entry.label}</span>
							<span className="text-[12px] text-[var(--color-text-subtle)]">
								({entry.reason})
							</span>
							{i < chain.length - 1 && (
								<svg
									width="10"
									height="10"
									viewBox="0 0 10 10"
									fill="none"
									className="text-[var(--color-text-subtle)]"
									aria-hidden="true"
								>
									<path
										d="M3.5 2l3.5 3-3.5 3"
										stroke="currentColor"
										strokeWidth="1.25"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							)}
						</span>
					))}
				</div>
			)}

			{showRequestAction && (
				<>
					<div className={isFooter ? 'min-w-[220px] flex-1' : undefined}>
						<UnderlineTextArea
							label="Justification"
							placeholder="Strategic account, competitor priced at..."
							value={justification}
							onChange={setJustification}
							rows={1}
						/>
					</div>
					<EmployeeActionButton
						onClick={handleRequestApproval}
						disabled={isSubmitting}
						aria-busy={isSubmitting}
						tone="primary"
						size="sm"
						fullWidthOnMobile={isFooter}
					>
						{isSubmitting ? 'Requesting approval' : 'Request approval'}
					</EmployeeActionButton>
				</>
			)}
		</div>
	)
}

function ApprovalCheckIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M3.5 7l2.5 2.5L10.5 5"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}
