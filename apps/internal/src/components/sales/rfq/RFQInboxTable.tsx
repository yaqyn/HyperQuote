import { useCallback, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { getRFQQueue, autoAssignRFQ } from '../../../lib/server/sales-rfq'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { useSalesStore } from '../../../stores/sales'
import type { RFQ } from '../../../types/sales'
import { RFQPreviewPane } from './RFQPreviewPane'

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

const TAB_FILTERS: Record<string, (rfq: RFQ) => boolean> = {
  all: () => true,
  my: (rfq) => rfq.assignedRep !== null,
  unassigned: (rfq) => rfq.assignedRep === null,
  'needs-clarification': (rfq) => rfq.status === 'awaiting_clarification',
  urgent: (rfq) => rfq.priorityScore > 75,
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

function getSlaRemaining(slaDeadline: string): { text: string; color: string } {
  const ms = new Date(slaDeadline).getTime() - Date.now()
  if (ms <= 0) return { text: 'OVERDUE', color: 'text-red-500 font-semibold' }
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours >= 2) return { text: `${hours}h ${minutes}m`, color: 'text-green-600 dark:text-green-400' }
  if (hours >= 1) return { text: `${hours}h ${minutes}m`, color: 'text-yellow-600 dark:text-yellow-400' }
  return { text: `${minutes}m`, color: 'text-red-500' }
}

function getPriorityDot(score: number): string {
  if (score > 75) return 'bg-red-500'
  if (score > 50) return 'bg-yellow-500'
  if (score > 25) return 'bg-[var(--color-primary)]'
  return 'bg-black/10 dark:bg-white/10'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    submitted: 'New',
    assigned: 'Assigned',
    reviewing: 'Reviewing',
    awaiting_clarification: 'Clarification',
    quoting: 'Quoting',
    quoted: 'Quoted',
    declined: 'Declined',
    expired: 'Expired',
  }
  return map[status] ?? status
}

// ─── Component ──────────────────────────────────────────

export function RFQInboxTable() {
  const queryClient = useQueryClient()
  const rfqStageFilter = useSalesStore((s) => s.rfqStageFilter)
  const setRfqStageFilter = useSalesStore((s) => s.setRfqStageFilter)
  const rfqInboxTab = useSalesStore((s) => s.rfqInboxTab)
  const setRfqInboxTab = useSalesStore((s) => s.setRfqInboxTab)
  const selectedRfqId = useSalesStore((s) => s.selectedRfqId)
  const setSelectedRfqId = useSalesStore((s) => s.setSelectedRfqId)

  const { data, isLoading } = useQuery({
    queryKey: ['rfq-queue', {}],
    queryFn: () => getRFQQueue({ data: { page: 1, limit: 50 } }),
    staleTime: 30_000,
  })

  // Pipeline summary data
  const { data: pipelineData } = useQuery({
    queryKey: ['sales-pipeline-summary'],
    queryFn: () => getSalesPipeline({ data: {} }),
    staleTime: 60_000,
  })

  const claimMutation = useMutation({
    mutationFn: (rfqId: string) => autoAssignRFQ({ data: { rfqId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
    },
  })

  const rfqs = data?.rfqs ?? []

  const filteredRfqs = useMemo(() => {
    const stageFn = STAGE_FILTER_FN[rfqStageFilter] ?? (() => true)
    const stageFiltered = rfqs.filter(stageFn)
    if (rfqStageFilter === 'inbox') {
      const subFn = TAB_FILTERS[rfqInboxTab] ?? TAB_FILTERS.all
      return stageFiltered.filter(subFn).sort((a, b) => b.priorityScore - a.priorityScore)
    }
    return stageFiltered.sort((a, b) => b.priorityScore - a.priorityScore)
  }, [rfqs, rfqStageFilter, rfqInboxTab])

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const stage of STAGE_FILTERS) {
      const fn = STAGE_FILTER_FN[stage.id] ?? (() => true)
      counts[stage.id] = rfqs.filter(fn).length
    }
    return counts
  }, [rfqs])

  // Pipeline summary numbers
  const pipelineSummary = useMemo(() => {
    const stages = pipelineData?.stages ?? []
    const deals = pipelineData?.deals ?? []
    const activeStages = stages.filter((s) => s.id !== 'won' && s.id !== 'lost_expired')
    const totalPipeline = activeStages.reduce((sum, s) => sum + s.totalValue, 0)
    const weightedForecast = deals
      .filter((d) => d.stage !== 'won' && d.stage !== 'lost_expired')
      .reduce((sum, d) => sum + d.dealValue * (d.winProbability / 100), 0)
    const activeDeals = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost_expired').length
    const wonDeals = deals.filter((d) => d.stage === 'won').length
    const totalClosed = deals.filter((d) => d.stage === 'won' || d.stage === 'lost_expired').length
    const winRate = totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 100) : 0
    return { totalPipeline, weightedForecast, activeDeals, winRate }
  }, [pipelineData])

  const listRef = useRef<HTMLDivElement>(null)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'j' && e.key !== 'k') return
      e.preventDefault()
      const rows = filteredRfqs
      if (rows.length === 0) return
      const currentIndex = rows.findIndex((r) => r.id === selectedRfqId)
      let nextIndex: number
      if (e.key === 'j') {
        nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1
      }
      setSelectedRfqId(rows[nextIndex].id)
    },
    [selectedRfqId, filteredRfqs, setSelectedRfqId],
  )

  const inboxSubTabs = useMemo(() => {
    const stageFiltered = rfqs.filter(STAGE_FILTER_FN.inbox ?? (() => true))
    return [
      { id: 'all' as const, label: 'All', count: stageFiltered.length },
      { id: 'unassigned' as const, label: 'Unassigned', count: stageFiltered.filter((r) => !r.assignedRep).length },
      { id: 'urgent' as const, label: 'Urgent', count: stageFiltered.filter((r) => r.priorityScore > 75).length },
      { id: 'needs-clarification' as const, label: 'Clarify', count: stageFiltered.filter((r) => r.status === 'awaiting_clarification').length },
      { id: 'my' as const, label: 'Mine', count: stageFiltered.filter((r) => r.assignedRep !== null).length },
    ]
  }, [rfqs])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left panel — inbox list */}
      <div
        ref={listRef}
        className="flex flex-col w-full md:w-[380px] md:shrink-0 md:border-r md:border-black/[0.04] md:dark:border-white/[0.04] focus:outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Header — stage filters + metrics unified */}
        <div className="shrink-0 px-4 pt-3 pb-2 overflow-hidden">
          {/* Stage filters as primary navigation */}
          <div className="flex items-center justify-between mb-3">
            {STAGE_FILTERS.map((stage) => {
              const count = stageCounts[stage.id] ?? 0
              const isActive = rfqStageFilter === stage.id
              return (
                <Button
                  key={stage.id}
                  onPress={() => setRfqStageFilter(stage.id)}
                  className={`shrink-0 cursor-pointer outline-none transition-all duration-150 ${
                    isActive
                      ? 'text-[var(--color-text)]'
                      : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)]'
                  }`}
                >
                  <span className={`text-[12px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                    {stage.label}
                  </span>
                  {count > 0 && (
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ml-1 opacity-40">
                      {count}
                    </span>
                  )}
                  {isActive && (
                    <div className="mt-1 h-[2px] rounded-full bg-[var(--color-primary)]" />
                  )}
                </Button>
              )
            })}
          </div>

          {/* Metrics */}
          <div className="flex items-center justify-between">
            {[
              { value: formatValue(pipelineSummary.totalPipeline), label: 'pipeline' },
              { value: formatValue(pipelineSummary.weightedForecast), label: 'forecast' },
              { value: String(pipelineSummary.activeDeals), label: 'deals' },
              { value: `${pipelineSummary.winRate}%`, label: 'win rate' },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <p className="font-[family-name:var(--font-geist-mono)] text-[13px] font-medium tabular-nums text-[var(--color-text)]">
                  {m.value}
                </p>
                <p className="text-[8px] uppercase tracking-widest text-[var(--color-text-subtle)]">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* RFQ list */}
        <div className="flex-1 min-h-0 overflow-y-auto" data-module-content>
          {filteredRfqs.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-[13px] text-[var(--color-text-subtle)]">No RFQs match this filter</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredRfqs.map((rfq) => {
                const isSelected = rfq.id === selectedRfqId
                const sla = getSlaRemaining(rfq.slaDeadline)
                return (
                  <button
                    key={rfq.id}
                    type="button"
                    onClick={() => setSelectedRfqId(rfq.id)}
                    className={`group w-full text-left px-4 py-2.5 cursor-pointer outline-none transition-colors ${
                      isSelected
                        ? 'bg-[var(--color-primary)]/[0.04]'
                        : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.015]'
                    }`}
                  >
                    {/* Line 1: customer + value */}
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${getPriorityDot(rfq.priorityScore)}`} />
                        <span className="text-[13px] font-medium text-[var(--color-text)] truncate">
                          {rfq.customerName}
                        </span>
                      </div>
                      <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)] ml-2">
                        {formatValue(rfq.estimatedValue)}
                      </span>
                    </div>
                    {/* Line 2: meta */}
                    <div className="flex items-center justify-between pl-[22px]">
                      <span className="text-[10px] text-[var(--color-text-subtle)]">
                        {rfq.lineItemCount} items · {getAge(rfq.createdAt)}
                      </span>
                      <span className={`font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ${sla.color}`}>
                        {sla.text}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — preview */}
      <div className="hidden md:flex flex-col flex-1 min-w-0">
        {/* Animated content */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {selectedRfqId ? (
              <motion.div
                key={selectedRfqId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="w-full h-full"
              >
                <RFQPreviewPane rfqId={selectedRfqId} />
              </motion.div>
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <p className="text-[13px] text-[var(--color-text-subtle)]">Select an RFQ</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Fixed action bar — outside animation */}
        {selectedRfqId && (
          <div className="shrink-0 px-8 py-4 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center gap-3">
            <Button
              onPress={() => {
                const store = useSalesStore.getState()
                store.setEditingRfqId(selectedRfqId)
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--color-primary)] text-white text-[13px] font-medium cursor-pointer outline-none hover:opacity-90 transition-opacity"
            >
              Start Quote
              <ArrowRight size={14} strokeWidth={1.5} />
            </Button>
            <Button
              onPress={() => claimMutation.mutate(selectedRfqId)}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-[var(--color-text)] bg-black/[0.04] dark:bg-white/[0.06] cursor-pointer outline-none hover:bg-black/[0.07] dark:hover:bg-white/[0.09] transition-colors"
            >
              Claim
            </Button>
            <div className="flex-1" />
            <Button
              onPress={() => {}}
              className="px-4 py-2 rounded-lg text-[13px] text-[var(--color-text-subtle)] cursor-pointer outline-none hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all"
            >
              Decline
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium tabular-nums text-[var(--color-text)]">
        {value}
      </p>
      <p className="text-[9px] text-[var(--color-text-subtle)] uppercase tracking-wider">
        {label}
      </p>
    </div>
  )
}
