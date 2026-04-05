import { useState } from 'react'
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
): { chain: ApprovalChainEntry[]; highestRole: ApproverRole } {
  const ref = thresholds[0] ?? { target: 18, floor: 12, absoluteMin: 8 }
  const chain: ApprovalChainEntry[] = []

  // Margin-based routing
  let marginRole: ApproverRole = 'none'
  if (marginPercent < 0) {
    marginRole = 'ceo' // Negative margin blocked but if somehow reached
  } else if (marginPercent < ref.absoluteMin) {
    marginRole = 'ceo'
  } else if (marginPercent < ref.floor) {
    marginRole = 'vp_sales'
  } else if (marginPercent < ref.target) {
    marginRole = 'sales_manager'
  }

  // Value-based routing (EGP)
  let valueRole: ApproverRole = 'none'
  if (totalValue > 50_000_000) {
    valueRole = 'ceo'
  } else if (totalValue > 10_000_000) {
    valueRole = 'director'
  } else if (totalValue > 2_500_000) {
    valueRole = 'sales_manager'
  }

  // Highest required approval wins
  const rolePriority: ApproverRole[] = ['none', 'sales_manager', 'director', 'vp_sales', 'ceo']
  const highestRole = rolePriority.indexOf(marginRole) > rolePriority.indexOf(valueRole)
    ? marginRole
    : valueRole

  // Build chain from lowest to highest needed
  if (highestRole === 'none') return { chain: [], highestRole }

  const neededIndex = rolePriority.indexOf(highestRole)

  if (neededIndex >= 1) {
    chain.push({
      role: 'sales_manager',
      label: 'Sales Manager',
      required: true,
      reason: marginPercent < ref.target
        ? `Margin ${marginPercent}% below target ${ref.target}%`
        : `Value EGP ${(totalValue / 1_000_000).toFixed(1)}M requires manager sign-off`,
    })
  }
  if (neededIndex >= 2) {
    chain.push({
      role: 'director',
      label: 'Director',
      required: true,
      reason: `Value exceeds EGP 10M threshold`,
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
        ? `Margin ${marginPercent}% below absolute minimum ${ref.absoluteMin}%`
        : `Value exceeds EGP 50M threshold`,
    })
  }

  return { chain, highestRole }
}

/**
 * ApprovalWorkflow (Step 8).
 * Routes based on margin + value thresholds. Highest required approval wins.
 * Escalation tracked server-side at 2h.
 */
export function ApprovalWorkflow({
  quoteId,
  marginPercent,
  totalValue,
  customerTier,
  thresholds,
  status,
  isApprover = false,
  onStatusChange,
}: ApprovalWorkflowProps) {
  const { t } = useTranslation('internal')
  const [justification, setJustification] = useState('')
  const [urgencyNote, setUrgencyNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { chain, highestRole } = determineApprovalChain(marginPercent, totalValue, thresholds)
  const needsApproval = chain.length > 0

  const handleRequestApproval = async () => {
    if (!highestRole || highestRole === 'none') return
    setSubmitting(true)
    try {
      const approverRole = highestRole === 'director' ? 'sales_manager' : highestRole === 'none' ? 'sales_manager' : highestRole
      await requestApproval({
        data: {
          quoteId,
          approverRole: approverRole as 'sales_manager' | 'vp_sales' | 'ceo',
          justification: justification || undefined,
          urgencyNote: urgencyNote || undefined,
        },
      })
      onStatusChange?.('pending_approval')
    } catch (err) {
      console.error('Failed to request approval:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // If no approval needed
  if (!needsApproval) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 8l3 3 5-5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-medium text-green-800 dark:text-green-300">
            Auto-approved
          </span>
        </div>
        <p className="mt-1 text-xs text-green-700/70 dark:text-green-400/70">
          Margin at/above target and value within rep authority. No approval needed.
        </p>
      </div>
    )
  }

  // Pending approval state
  if (status === 'pending_approval') {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/20">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
          Pending Approval
        </p>
        <p className="mt-1 text-xs text-yellow-700/70 dark:text-yellow-400/70">
          Waiting for {chain[chain.length - 1]?.label ?? 'approver'} to review.
        </p>
        <p className="mt-2 text-xs text-yellow-700/60 dark:text-yellow-400/60">
          Escalation: If not approved within 2h, escalates to {
            chain.length > 1 ? chain[chain.length - 1].label : 'next level'
          }.
        </p>

        {/* Approver actions (rendered if current user IS the approver) */}
        {isApprover && (
          <div className="mt-3 flex items-center gap-2">
            <Button
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white outline-none transition-colors
                data-[hovered]:bg-green-700 data-[focus-visible]:ring-2 data-[focus-visible]:ring-green-500/50"
              onPress={() => onStatusChange?.('approved')}
            >
              Approve
            </Button>
            <Button
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white outline-none transition-colors
                data-[hovered]:bg-red-700 data-[focus-visible]:ring-2 data-[focus-visible]:ring-red-500/50"
              onPress={() => onStatusChange?.('rejected')}
            >
              Reject
            </Button>
            <Button
              className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium outline-none transition-colors
                data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                dark:border-white/10 dark:data-[hovered]:bg-white/10"
              onPress={() => onStatusChange?.('changes_requested')}
            >
              Request Changes
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Approval required -- show chain + submit form
  return (
    <div className="flex flex-col gap-4">
      {/* Approval chain */}
      <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
        <p className="mb-3 text-sm font-medium text-black/70 dark:text-white/70">
          Required Approvals
        </p>
        <div className="flex flex-col gap-2">
          {chain.map((entry, i) => (
            <div
              key={entry.role}
              className="flex items-start gap-2 rounded-md bg-black/[0.02] p-2 dark:bg-white/[0.02]"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-black/20 font-[family-name:var(--font-geist-mono)] text-[9px] dark:border-white/20">
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-medium">{entry.label}</p>
                <p className="text-[10px] text-black/40 dark:text-white/40">{entry.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Justification + urgency */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-black/50 dark:text-white/50" htmlFor="approval-justification">
          Justification (optional)
        </label>
        <TextArea
          id="approval-justification"
          className="rounded-md border border-black/10 bg-transparent p-2 text-sm outline-none transition-colors
            focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30
            dark:border-white/10"
          placeholder="e.g., Strategic account, competitor priced at EGP X"
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-black/50 dark:text-white/50" htmlFor="urgency-note">
          Urgency Note (optional)
        </label>
        <TextArea
          id="urgency-note"
          className="rounded-md border border-black/10 bg-transparent p-2 text-sm outline-none transition-colors
            focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30
            dark:border-white/10"
          placeholder="e.g., Customer deciding today"
          value={urgencyNote}
          onChange={(e) => setUrgencyNote(e.target.value)}
          rows={1}
        />
      </div>

      <Button
        className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white outline-none transition-colors
          data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
          data-[disabled]:opacity-50"
        onPress={handleRequestApproval}
        isDisabled={submitting}
      >
        {submitting ? 'Submitting...' : t('sales.quoteBuilder.actions.requestApproval')}
      </Button>

      <p className="text-xs text-black/30 dark:text-white/30">
        Escalation: If not approved within 2h, automatically escalates to the next level.
      </p>
    </div>
  )
}
