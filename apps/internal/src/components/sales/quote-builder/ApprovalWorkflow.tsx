import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TextArea } from 'react-aria-components'
import type { MarginThresholds, CustomerTier } from '../../../types/sales'
import { requestApproval } from '../../../lib/server/sales-quotes'

interface ApprovalWorkflowProps {
  quoteId: string
  marginPercent: number
  totalValue: number
  customerTier: CustomerTier
  thresholds: MarginThresholds[]
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  isApprover?: boolean
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
): { chain: ApprovalChainEntry[]; highestRole: ApproverRole; summaryLabel: string } {
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

  const rolePriority: ApproverRole[] = ['none', 'sales_manager', 'director', 'vp_sales', 'ceo']
  const highestRole = rolePriority.indexOf(marginRole) > rolePriority.indexOf(valueRole)
    ? marginRole
    : valueRole

  const summaryLabel = rolePriority.indexOf(marginRole) > rolePriority.indexOf(valueRole)
    ? marginSummary
    : (valueSummary || marginSummary)

  if (highestRole === 'none') return { chain: [], highestRole, summaryLabel: 'No approval needed' }

  const neededIndex = rolePriority.indexOf(highestRole)

  if (neededIndex >= 1) {
    chain.push({
      role: 'sales_manager',
      label: 'Sales Manager',
      required: true,
      reason: marginPercent < ref.target
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
      reason: marginPercent < ref.absoluteMin
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
  customerTier,
  thresholds,
  status,
  isApprover = false,
  onStatusChange,
  onSendBlockedChange,
}: ApprovalWorkflowProps) {
  const { t } = useTranslation('internal')
  const [justification, setJustification] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { chain, highestRole, summaryLabel } = determineApprovalChain(marginPercent, totalValue, thresholds)
  const needsApproval = chain.length > 0
  const sendBlocked = needsApproval && status !== 'approved'

  // Notify parent of send-blocked state
  useEffect(() => {
    onSendBlockedChange?.(
      sendBlocked,
      sendBlocked ? `Approval required: ${summaryLabel}` : null,
    )
  }, [sendBlocked, summaryLabel, onSendBlockedChange])

  const handleRequestApproval = async () => {
    if (!highestRole || highestRole === 'none') return
    setSubmitting(true)
    try {
      const approverRole = highestRole === 'director' ? 'sales_manager' : (highestRole as string) === 'none' ? 'sales_manager' : highestRole
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

  // Auto-approved -- single green line
  if (!needsApproval) {
    return (
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-green-700 dark:text-green-400">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3.5 7l2.5 2.5L10.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Auto-approved
      </p>
    )
  }

  // Approved -- single green line
  if (status === 'approved') {
    return (
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-green-700 dark:text-green-400">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3.5 7l2.5 2.5L10.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Approved
      </p>
    )
  }

  // Pending -- compact with approver actions
  if (status === 'pending_approval') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-500" />
          <span className="text-[12px] font-medium text-yellow-700 dark:text-yellow-300">
            Pending {chain[chain.length - 1]?.label ?? 'approver'}
          </span>
        </div>

        <span className="text-[10px] text-[var(--color-text-subtle)]">
          Auto-escalates in 2h
        </span>

        {isApprover && (
          <>
            <Button
              className="rounded-md bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-medium text-white outline-none transition-colors
                data-[hovered]:bg-[var(--color-primary)]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50"
              onPress={() => onStatusChange?.('approved')}
            >
              Approve
            </Button>
            <Button
              className="rounded-md border border-black/[0.08] px-2.5 py-1 text-[11px] font-medium outline-none transition-colors
                data-[hovered]:bg-black/[0.03] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                dark:border-white/[0.08] dark:data-[hovered]:bg-white/[0.06]"
              onPress={() => onStatusChange?.('rejected')}
            >
              Reject
            </Button>
            <Button
              className="rounded-md border border-black/[0.08] px-2.5 py-1 text-[11px] font-medium outline-none transition-colors
                data-[hovered]:bg-black/[0.03] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                dark:border-white/[0.08] dark:data-[hovered]:bg-white/[0.06]"
              onPress={() => onStatusChange?.('changes_requested')}
            >
              Changes
            </Button>
          </>
        )}
      </div>
    )
  }

  // Needs approval -- compact card: approver + reason on one line, justify + button below
  return (
    <div className="space-y-2">
      {/* Approver chain on one line */}
      <div className="flex items-center gap-2">
        {chain.map((entry, i) => (
          <span key={entry.role} className="flex items-center gap-1">
            <span className="text-[12px] font-medium">{entry.label}</span>
            <span className="text-[10px] text-[var(--color-text-subtle)]">({entry.reason})</span>
            {i < chain.length - 1 && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[var(--color-text-subtle)]" aria-hidden="true">
                <path d="M3.5 2l3.5 3-3.5 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        ))}
      </div>

      {/* Justification + submit on one row */}
      <div className="flex gap-2">
        <TextArea
          aria-label="Justification"
          className="flex-1 rounded-md border border-black/[0.08] bg-transparent px-2 py-1.5 text-[12px] outline-none transition-colors
            placeholder:text-black/20 focus:border-[var(--color-primary)] dark:border-white/[0.08] dark:placeholder:text-white/20"
          placeholder="Strategic account, competitor priced at..."
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={1}
        />
        <Button
          className="shrink-0 rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-[12px] font-medium text-white outline-none transition-colors
            data-[hovered]:bg-[var(--color-primary)]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
            data-[disabled]:opacity-50"
          onPress={handleRequestApproval}
          isDisabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Request Approval'}
        </Button>
      </div>
    </div>
  )
}
