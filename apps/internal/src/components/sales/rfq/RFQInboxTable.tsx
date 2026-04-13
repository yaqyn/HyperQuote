import { useCallback, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button as AriaButton } from 'react-aria-components'
import { ArrowRight } from 'lucide-react'
import { getRFQQueue, autoAssignRFQ } from '../../../lib/server/sales-rfq'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { useSalesStore } from '../../../stores/sales'
import type { RFQ } from '../../../types/sales'
import { DeclineRFQDialog } from './DeclineRFQDialog'

// ─── Stage filter config ────────────────────────────────
const STAGE_FILTERS = [
  { id: 'inbox' as const, label: 'Inbox' },
  { id: 'in-progress' as const, label: 'Active' },
  { id: 'sent' as const, label: 'Sent' },
  { id: 'negotiating' as const, label: 'Counter' },
  { id: 'closed' as const, label: 'Closed' },
] as const

const STAGE_STATUS_MAP: Record<string, string[]> = {
  inbox: ['submitted', 'assigned'],
  'in-progress': ['reviewing', 'quoting', 'awaiting_clarification'],
  sent: ['quoted'],
  negotiating: ['negotiating', 'countered'],
  closed: ['won', 'lost', 'declined', 'expired'],
}

const STAGE_FILTER_FN: Record<string, (rfq: RFQ) => boolean> = {
  inbox: (rfq) => STAGE_STATUS_MAP.inbox.includes(rfq.status),
  'in-progress': (rfq) => STAGE_STATUS_MAP['in-progress'].includes(rfq.status),
  sent: (rfq) => STAGE_STATUS_MAP.sent.includes(rfq.status),
  negotiating: (rfq) => STAGE_STATUS_MAP.negotiating.includes(rfq.status),
  closed: (rfq) => STAGE_STATUS_MAP.closed.includes(rfq.status),
}

// ─── Helpers ────────────────────────────────────────────

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`
  return String(v)
}

function getAge(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return `${Math.floor(ms / 60_000)}m`
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function getSlaRemaining(slaDeadline: string): { text: string; urgent: boolean } {
  const ms = new Date(slaDeadline).getTime() - Date.now()
  if (ms <= 0) return { text: 'overdue', urgent: true }
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const days = Math.floor(hours / 24)
  if (days >= 1) return { text: `${days}d ${hours % 24}h`, urgent: false }
  if (hours >= 1) return { text: `${hours}h ${minutes}m`, urgent: hours < 2 }
  return { text: `${minutes}m`, urgent: true }
}

// ─── Component ──────────────────────────────────────────

interface RFQInboxTableProps {
  onCreateQuote?: () => void
}

export function RFQInboxTable({ onCreateQuote }: RFQInboxTableProps) {
  const queryClient = useQueryClient()
  const rfqStageFilter = useSalesStore((s) => s.rfqStageFilter)
  const setRfqStageFilter = useSalesStore((s) => s.setRfqStageFilter)
  const setEditingRfqId = useSalesStore((s) => s.setEditingRfqId)

  const { data, isLoading } = useQuery({
    queryKey: ['rfq-queue', {}],
    queryFn: () => getRFQQueue({ data: { page: 1, limit: 50 } }),
    staleTime: 30_000,
  })

  const { data: pipelineData } = useQuery({
    queryKey: ['sales-pipeline-summary'],
    queryFn: () => getSalesPipeline({ data: {} }),
    staleTime: 60_000,
  })

  const [showDecline, setShowDecline] = useState(false)
  const [declineRfqId, setDeclineRfqId] = useState<string | null>(null)

  const claimMutation = useMutation({
    mutationFn: (rfqId: string) => autoAssignRFQ({ data: { rfqId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
    },
  })

  const rfqs = data?.rfqs ?? []

  const filteredRfqs = useMemo(() => {
    const stageFn = STAGE_FILTER_FN[rfqStageFilter] ?? (() => true)
    return rfqs.filter(stageFn).sort((a, b) => b.priorityScore - a.priorityScore)
  }, [rfqs, rfqStageFilter])

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const stage of STAGE_FILTERS) {
      const fn = STAGE_FILTER_FN[stage.id] ?? (() => true)
      counts[stage.id] = rfqs.filter(fn).length
    }
    return counts
  }, [rfqs])

  const pipelineSummary = useMemo(() => {
    const stages = pipelineData?.stages ?? []
    const deals = pipelineData?.deals ?? []
    const activeStages = stages.filter((s: any) => s.id !== 'won' && s.id !== 'lost_expired')
    const totalPipeline = activeStages.reduce((sum: number, s: any) => sum + s.totalValue, 0)
    const weightedForecast = deals
      .filter((d: any) => d.stage !== 'won' && d.stage !== 'lost_expired')
      .reduce((sum: number, d: any) => sum + d.dealValue * (d.winProbability / 100), 0)
    const activeDeals = deals.filter((d: any) => d.stage !== 'won' && d.stage !== 'lost_expired').length
    const wonDeals = deals.filter((d: any) => d.stage === 'won').length
    const totalClosed = deals.filter((d: any) => d.stage === 'won' || d.stage === 'lost_expired').length
    const winRate = totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 100) : 0
    return { totalPipeline, weightedForecast, activeDeals, winRate }
  }, [pipelineData])

  const listRef = useRef<HTMLDivElement>(null)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'j' || e.key === 'k') {
        e.preventDefault()
      }
    },
    [],
  )

  const handleStartQuote = (rfq: RFQ) => {
    if (!rfq.assignedRep) {
      claimMutation.mutate(rfq.id)
    }
    setEditingRfqId(rfq.id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      className="flex flex-col h-full focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Header bar */}
      <div className="shrink-0 flex items-center px-6 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
        {/* Stage filters */}
        <div className="flex items-center gap-1">
          {STAGE_FILTERS.map((stage) => {
            const count = stageCounts[stage.id] ?? 0
            const isActive = rfqStageFilter === stage.id
            return (
              <AriaButton
                key={stage.id}
                onPress={() => setRfqStageFilter(stage.id)}
                className={`shrink-0 cursor-pointer outline-none rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-black/40 dark:text-white/40 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] hover:text-black/60 dark:hover:text-white/60'
                }`}
              >
                {stage.label}
                {count > 0 && (
                  <span className={`font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ms-1 ${isActive ? 'text-white/60' : 'opacity-40'}`}>
                    {count}
                  </span>
                )}
              </AriaButton>
            )
          })}
        </div>

        <div className="flex-1" />

        {/* Pipeline metrics */}
        <div className="flex items-center gap-5 me-5">
          {[
            { value: formatValue(pipelineSummary.totalPipeline), label: 'Pipeline' },
            { value: formatValue(pipelineSummary.weightedForecast), label: 'Forecast' },
            { value: String(pipelineSummary.activeDeals), label: 'Deals' },
            { value: `${pipelineSummary.winRate}%`, label: 'Win' },
          ].map((m) => (
            <div key={m.label} className="text-end">
              <p className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
                {m.value}
              </p>
              <p className="text-[8px] uppercase tracking-widest text-black/25 dark:text-white/25">
                {m.label}
              </p>
            </div>
          ))}
        </div>

        {/* Create Quote */}
        {onCreateQuote && (
          <button
            type="button"
            onClick={onCreateQuote}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[12px] font-medium text-white hover:bg-[var(--color-primary)]/90 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            New Quote
          </button>
        )}
      </div>

      {/* RFQ list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3" data-module-content>
        {filteredRfqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-2">
            <p className="text-[13px] text-black/30 dark:text-white/30">No RFQs in this stage</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filteredRfqs.map((rfq) => {
              const sla = getSlaRemaining(rfq.slaDeadline)
              const isClosed = ['won', 'lost', 'declined', 'expired'].includes(rfq.status)

              return (
                <button
                  key={rfq.id}
                  type="button"
                  onClick={() => !isClosed && handleStartQuote(rfq)}
                  disabled={isClosed}
                  className={`group w-full text-start rounded-xl px-5 py-4 transition-all outline-none ${
                    isClosed
                      ? 'opacity-40 cursor-default'
                      : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Customer initial */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                      <span className="text-[14px] font-semibold text-black/30 dark:text-white/30">
                        {rfq.customerName.charAt(0)}
                      </span>
                    </div>

                    {/* Customer + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="text-[14px] font-semibold text-[var(--color-text)] truncate">{rfq.customerName}</p>
                        <span className="shrink-0 text-[10px] text-black/25 dark:text-white/25">{getAge(rfq.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-black/35 dark:text-white/35">
                          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{rfq.lineItemCount}</span> items
                        </span>
                        <span className={`font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ${sla.urgent ? 'text-[var(--color-primary)] font-medium' : 'text-black/25 dark:text-white/25'}`}>
                          {sla.text}
                        </span>
                      </div>
                    </div>

                    {/* Value */}
                    <div className="shrink-0 text-end me-2">
                      <p className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-[var(--color-text)]">
                        {formatValue(rfq.estimatedValue)}
                      </p>
                    </div>

                    {/* Arrow */}
                    {!isClosed && (
                      <ArrowRight size={16} strokeWidth={1.5} className="shrink-0 text-black/15 dark:text-white/15 group-hover:text-[var(--color-primary)] transition-colors" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Decline Dialog */}
      {declineRfqId && (
        <DeclineRFQDialog
          rfqId={declineRfqId}
          isOpen={showDecline}
          onClose={() => { setShowDecline(false); setDeclineRfqId(null) }}
        />
      )}
    </div>
  )
}
