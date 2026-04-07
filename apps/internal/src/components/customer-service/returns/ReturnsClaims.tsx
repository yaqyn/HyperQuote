import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { getReturnsClaims } from '../../../lib/server/customer-service'
import type { ClaimTier, ClaimStatus, ReturnStatus } from '../../../types/customer-service'

/**
 * Returns & Claims — "The Cases"
 * Compact case list: RMA # (mono) + customer + reason tag + amount (mono) + status.
 * Expandable for details. Return flow as horizontal dot chain.
 */
export function ReturnsClaims() {
  const { t } = useTranslation('customer-service')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['cs', 'returns-claims'],
    queryFn: () => getReturnsClaims(),
    staleTime: 15_000,
  })

  if (!data) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  // Merge claims and returns into a single case list
  const cases = [
    ...data.claims.map((c) => ({
      id: c.id,
      type: 'claim' as const,
      number: c.id,
      customer: c.customerName,
      reason: t(`tierLabel.${c.claimTier}`, c.claimTier),
      amount: `${c.damagePercent}%`,
      status: c.status,
      statusLabel: t(`claimStatus.${claimStatusToI18nKey(c.status)}`, c.status),
      tier: c.claimTier,
      created: c.createdAt,
      raw: c,
    })),
    ...data.returns.map((r) => ({
      id: r.id,
      type: 'return' as const,
      number: r.rmaNumber,
      customer: r.customerName,
      reason: `${r.items.length} items`,
      amount: '',
      status: r.status,
      statusLabel: t(`returnStatus.${returnStatusToI18nKey(r.status)}`, r.status),
      tier: null as ClaimTier | null,
      created: r.createdAt,
      raw: r,
    })),
  ]

  return (
    <div className="p-5 space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          onPress={() => console.log('[CS] New damage claim')}
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity outline-none"
        >
          {t('returns.newClaim', 'New Claim')}
        </Button>
        <Button
          onPress={() => console.log('[CS] New RMA')}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors outline-none"
        >
          {t('returns.newRma', 'New RMA')}
        </Button>
      </div>

      {/* Case list */}
      <div className="flex flex-col">
        {cases.map((item) => {
          const isExpanded = expandedId === item.id

          return (
            <div key={item.id} className="border-b border-[var(--color-border)]/50">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 -mx-0 text-start cursor-pointer transition-colors
                  hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                {/* RMA / Claim # */}
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-subtle)] w-20 shrink-0">
                  {item.number}
                </span>

                {/* Customer */}
                <span className="text-sm text-[var(--color-text)] w-32 shrink-0 truncate">
                  {item.customer}
                </span>

                {/* Reason tag */}
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium shrink-0 ${
                  item.tier
                    ? tierTag(item.tier)
                    : 'bg-black/[0.04] dark:bg-white/[0.04] text-[var(--color-text-muted)]'
                }`}>
                  {item.reason}
                </span>

                {/* Amount */}
                {item.amount && (
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text)] shrink-0">
                    {item.amount}
                  </span>
                )}

                <span className="flex-1" />

                {/* Age */}
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-subtle)] shrink-0">
                  {formatRelativeTime(item.created)}
                </span>

                {/* Status dot + label */}
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${caseStatusDot(item.status)}`} />
              </button>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-4 pt-1">
                      {item.type === 'claim' && (
                        <ClaimFlowChain status={item.raw.status as ClaimStatus} t={t} />
                      )}
                      {item.type === 'return' && (
                        <ReturnFlowChain status={item.raw.status as ReturnStatus} t={t} />
                      )}

                      {/* Resolution */}
                      {item.type === 'claim' && (item.raw as any).resolution && (
                        <div className="mt-3 text-sm text-[var(--color-text-muted)]">
                          <span className="text-[var(--color-text-subtle)]">{t('returns.resolution', 'Resolution')}:</span>{' '}
                          <span className="font-medium text-[var(--color-text)]">
                            {t(`resolutionType.${camelCase((item.raw as any).resolution)}`, (item.raw as any).resolution)}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {cases.length === 0 && (
          <div className="py-12 text-center text-sm text-[var(--color-text-subtle)]">
            {t('returns.noCases', 'No active cases')}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Flow chains (horizontal dot chain) ─────────────────

const CLAIM_STEPS: Array<{ key: ClaimStatus; label: string }> = [
  { key: 'reported', label: 'Reported' },
  { key: 'under_review', label: 'Review' },
  { key: 'inspection_scheduled', label: 'Inspect' },
  { key: 'resolution_proposed', label: 'Proposed' },
  { key: 'settled', label: 'Settled' },
]

const RETURN_STEPS: Array<{ key: ReturnStatus; label: string }> = [
  { key: 'requested', label: 'Requested' },
  { key: 'rma_issued', label: 'RMA Issued' },
  { key: 'received', label: 'Received' },
  { key: 'inspected', label: 'Inspected' },
  { key: 'credit_issued', label: 'Credit' },
]

function ClaimFlowChain({ status, t }: { status: ClaimStatus; t: (k: string, f: string) => string }) {
  const currentIdx = CLAIM_STEPS.findIndex((s) => s.key === status)
  return <FlowChain steps={CLAIM_STEPS} currentIdx={currentIdx} t={t} prefix="claimStatus" />
}

function ReturnFlowChain({ status, t }: { status: ReturnStatus; t: (k: string, f: string) => string }) {
  const currentIdx = RETURN_STEPS.findIndex((s) => s.key === status)
  return <FlowChain steps={RETURN_STEPS} currentIdx={currentIdx} t={t} prefix="returnStatus" />
}

function FlowChain({
  steps,
  currentIdx,
  t,
  prefix,
}: {
  steps: Array<{ key: string; label: string }>
  currentIdx: number
  t: (k: string, f: string) => string
  prefix: string
}) {
  return (
    <div className="flex items-center gap-0.5">
      {steps.map((step, idx) => {
        const isComplete = idx <= currentIdx
        const isCurrent = idx === currentIdx

        return (
          <div key={step.key} className="flex items-center">
            {/* Dot */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  isCurrent
                    ? 'bg-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                    : isComplete
                      ? 'bg-[var(--color-primary)]'
                      : 'bg-black/10 dark:bg-white/10'
                }`}
              />
              <span className={`text-[10px] whitespace-nowrap ${
                isComplete ? 'text-[var(--color-text)]' : 'text-[var(--color-text-subtle)]'
              }`}>
                {step.label}
              </span>
            </div>
            {/* Line */}
            {idx < steps.length - 1 && (
              <div className={`w-6 h-px mx-0.5 mb-4 ${isComplete ? 'bg-[var(--color-primary)]' : 'bg-black/10 dark:bg-white/10'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

function tierTag(tier: ClaimTier): string {
  const map: Record<ClaimTier, string> = {
    minor: 'bg-green-500/10 text-green-700 dark:text-green-400',
    moderate: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    major: 'bg-red-500/10 text-red-700 dark:text-red-400',
  }
  return map[tier]
}

function caseStatusDot(status: string): string {
  if (status === 'settled' || status === 'credit_issued') return 'bg-green-500'
  if (status === 'reported' || status === 'requested') return 'bg-[var(--color-primary)]'
  return 'bg-amber-500'
}

function claimStatusToI18nKey(status: ClaimStatus): string {
  const map: Record<ClaimStatus, string> = {
    reported: 'reported',
    under_review: 'underReview',
    inspection_scheduled: 'inspectionScheduled',
    resolution_proposed: 'resolutionProposed',
    settled: 'settled',
  }
  return map[status]
}

function returnStatusToI18nKey(status: ReturnStatus): string {
  const map: Record<ReturnStatus, string> = {
    requested: 'requested',
    rma_issued: 'rmaIssued',
    received: 'received',
    inspected: 'inspected',
    credit_issued: 'creditIssued',
  }
  return map[status]
}

function camelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
