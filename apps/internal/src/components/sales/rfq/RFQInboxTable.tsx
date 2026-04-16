import { useCallback, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button as AriaButton } from 'react-aria-components'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import { getRFQQueue } from '../../../lib/server/sales-rfq'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { useSalesStore } from '../../../stores/sales'
import type { RFQ } from '../../../types/sales'
import { DeclineRFQDialog } from './DeclineRFQDialog'
import { OutdatedPricesCard } from '../home/OutdatedPricesCard'
import { ReportViewerModal } from '../../shared/ReportViewer'

// ─── Stage filter config ────────────────────────────────
// Submitted now merges new requests + awaiting clarification. The tab
// renders two section headers inside so the user still sees the split.
const STAGE_FILTERS = [
  { id: 'submitted' as const, label: 'Submitted' },
  { id: 'evaluated' as const, label: 'Evaluated' },
  { id: 'canceled' as const, label: 'Canceled' },
] as const

const SUBMITTED_STATUSES = ['submitted', 'assigned', 'awaiting_clarification'] as const
const EVALUATED_STATUSES = [
  'reviewing',
  'quoting',
  'quoted',
  'negotiating',
  'countered',
  'won',
] as const
const CANCELED_STATUSES = ['lost', 'declined', 'expired'] as const

const STAGE_FILTER_FN: Record<string, (rfq: RFQ) => boolean> = {
  submitted: (rfq) => (SUBMITTED_STATUSES as readonly string[]).includes(rfq.status),
  evaluated: (rfq) => (EVALUATED_STATUSES as readonly string[]).includes(rfq.status),
  canceled: (rfq) => (CANCELED_STATUSES as readonly string[]).includes(rfq.status),
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
  const [reportRfqId, setReportRfqId] = useState<string | null>(null)


  const rfqs = data?.rfqs ?? []

  const filteredRfqs = useMemo(() => {
    const stageFn = STAGE_FILTER_FN[rfqStageFilter] ?? (() => true)
    return rfqs.filter(stageFn).sort((a, b) => b.priorityScore - a.priorityScore)
  }, [rfqs, rfqStageFilter])

  // Submitted tab splits into two sections: new requests + awaiting clarification.
  const submittedSections = useMemo(() => {
    const newOnes = filteredRfqs.filter((r) => r.status === 'submitted' || r.status === 'assigned')
    const onHold = filteredRfqs.filter((r) => r.status === 'awaiting_clarification')
    return { newOnes, onHold }
  }, [filteredRfqs])

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
    // Open the quote builder. No status flip — Evaluate lives inside
    // the builder header as an explicit commit action after the rep
    // has reviewed, called the customer, edited items, gathered prices.
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

        <div className="me-3">
          <OutdatedPricesCard />
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
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5" data-module-content>
        {filteredRfqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-2">
            <p className="text-[13px] text-black/30 dark:text-white/30">No RFQs in this stage</p>
          </div>
        ) : rfqStageFilter === 'evaluated' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredRfqs.map((rfq) => {
              const sla = getSlaRemaining(rfq.slaDeadline)
              const previewItems = rfq.previewItems ?? []
              const extraCount = Math.max(0, rfq.lineItemCount - previewItems.length)
              return (
                <div
                  key={rfq.id}
                  className="relative aspect-square rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
                      <span className="text-[13px] font-semibold text-black/40 dark:text-white/40">
                        {rfq.customerName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {rfq.hasOutdatedPrices && (
                        <span
                          title="Contains items with outdated prices"
                          className="inline-flex items-center text-amber-500"
                        >
                          <AlertTriangle size={11} strokeWidth={2.5} />
                        </span>
                      )}
                      <span className="text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30">
                        {rfq.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Customer + contact + location */}
                  <div className="mt-3">
                    <p className="text-[13px] font-semibold text-[var(--color-text)] leading-tight line-clamp-1">
                      {rfq.customerName}
                    </p>
                    {rfq.contactName && (
                      <p className="mt-0.5 text-[11px] text-black/45 dark:text-white/45 truncate">
                        {rfq.contactName}
                      </p>
                    )}
                    {rfq.deliveryCity && (
                      <p className="mt-1 text-[10px] text-black/35 dark:text-white/35 truncate">
                        {rfq.deliveryCity}
                      </p>
                    )}
                  </div>

                  {/* Items preview */}
                  <div className="mt-3 flex-1 min-h-0 overflow-hidden">
                    <p className="text-[9px] uppercase tracking-widest text-black/25 dark:text-white/25 mb-1.5">Items</p>
                    <ul className="space-y-0.5">
                      {previewItems.map((item, i) => (
                        <li key={i} className="flex items-baseline gap-1.5 text-[11px] text-black/55 dark:text-white/55 truncate">
                          <span className="font-[family-name:var(--font-geist-mono)] text-[9px] tabular-nums text-black/25 dark:text-white/25">{i + 1}</span>
                          <span className="truncate">{item}</span>
                        </li>
                      ))}
                      {extraCount > 0 && (
                        <li className="text-[10px] text-black/35 dark:text-white/35 ps-3.5">
                          +{extraCount} more
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Footer: SLA + value */}
                  <div className="flex items-end justify-between pt-3 border-t border-black/[0.05] dark:border-white/[0.05]">
                    <span className={`font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ${sla.urgent ? 'text-[var(--color-primary)] font-medium' : 'text-black/30 dark:text-white/30'}`}>
                      {sla.text}
                    </span>
                    <p className="font-[family-name:var(--font-geist-mono)] text-[14px] font-semibold tabular-nums text-[var(--color-text)] leading-none">
                      {formatValue(rfq.estimatedValue)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : rfqStageFilter === 'submitted' ? (
          <div className="flex flex-col gap-5">
            <SubmittedSection
              label="New requests"
              rfqs={submittedSections.newOnes}
              onOpen={handleStartQuote}
            />
            <SubmittedSection
              label="Awaiting clarification"
              rfqs={submittedSections.onHold}
              onOpen={handleStartQuote}
            />
          </div>
        ) : rfqStageFilter === 'canceled' ? (
          <div className="grid gap-3">
            {filteredRfqs.map((rfq) => (
              <CanceledRow key={rfq.id} rfq={rfq} onOpenReport={setReportRfqId} />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredRfqs.map((rfq) => (
              <RfqRow key={rfq.id} rfq={rfq} onOpen={() => handleStartQuote(rfq)} />
            ))}
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

      <ReportViewerModal
        rfqId={reportRfqId}
        onClose={() => setReportRfqId(null)}
      />
    </div>
  )
}

// ─── Inline row templates ───────────────────────────────

function SubmittedSection({
  label,
  rfqs,
  onOpen,
}: {
  label: string
  rfqs: RFQ[]
  onOpen: (rfq: RFQ) => void
}) {
  if (rfqs.length === 0) return null
  return (
    <section>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50 dark:text-white/50">
          {label}
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/30 dark:text-white/30">
          {rfqs.length}
        </span>
        <span className="h-[1px] flex-1 bg-black/[0.06] dark:bg-white/[0.06]" />
      </div>
      <div className="grid gap-3">
        {rfqs.map((rfq) => (
          <RfqRow key={rfq.id} rfq={rfq} onOpen={() => onOpen(rfq)} />
        ))}
      </div>
    </section>
  )
}

function RfqRow({ rfq, onOpen }: { rfq: RFQ; onOpen: () => void }) {
  const sla = getSlaRemaining(rfq.slaDeadline)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-full text-start rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-5 py-4 transition-all outline-none cursor-pointer hover:border-black/[0.12] dark:hover:border-white/[0.12] hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:-translate-y-px"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06] group-hover:bg-[var(--color-primary)]/[0.08] transition-colors">
          <span className="text-[14px] font-semibold text-black/40 dark:text-white/40 group-hover:text-[var(--color-primary)] transition-colors">
            {rfq.customerName.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-[var(--color-text)] truncate">{rfq.customerName}</p>
            {rfq.hasOutdatedPrices && (
              <span
                title="Contains items with outdated prices — request update from inventory"
                className="inline-flex items-center text-amber-500 shrink-0"
              >
                <AlertTriangle size={12} strokeWidth={2.5} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className={`font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ${sla.urgent ? 'text-[var(--color-primary)] font-medium' : 'text-black/30 dark:text-white/30'}`}>
              {sla.text}
            </span>
          </div>
        </div>
        <ArrowRight size={18} strokeWidth={1.5} className="shrink-0 text-black/20 dark:text-white/20 group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  )
}

function CanceledRow({
  rfq,
  onOpenReport,
}: {
  rfq: RFQ
  onOpenReport: (rfqId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenReport(rfq.id)}
      className="group relative w-full text-start rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-5 py-4 transition-all outline-none cursor-pointer opacity-60 hover:opacity-100 hover:border-black/[0.12] dark:hover:border-white/[0.12]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
          <span className="text-[14px] font-semibold text-black/35 dark:text-white/35">
            {rfq.customerName.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[var(--color-text)] truncate">
            {rfq.customerName}
          </p>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-black/35 dark:text-white/35">
            {rfq.status.replace('_', ' ')}
          </div>
        </div>
        <span className="text-[10px] font-medium text-[var(--color-primary)] group-hover:underline">
          View report
        </span>
      </div>
    </button>
  )
}

