import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trackInquiryResponses, remindSuppliers } from '../../../lib/server/procurement-inquiries'
import { useProcurementStore } from '../../../stores/procurement'
import { ResponseStatusBadge } from './ResponseStatusBadge'
import { DeadlineCountdown } from '../shared/DeadlineCountdown'
import type { ResponseTrackingRow } from '../../../types/procurement'

interface ResponseTrackerProps {
  inquiryId: string
}

// ─── Status Dot Chain ────────────────────────────────────

const STATUS_SEQUENCE = ['sent', 'opened', 'responded'] as const

function StatusDotChain({ current }: { current: string }) {
  const currentIdx = STATUS_SEQUENCE.indexOf(current as typeof STATUS_SEQUENCE[number])

  return (
    <div className="flex items-center gap-0.5">
      {STATUS_SEQUENCE.map((step, idx) => {
        const reached = idx <= currentIdx
        return (
          <div key={step} className="flex items-center gap-0.5">
            <div
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                reached
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-black/[0.08] dark:bg-white/[0.08]'
              }`}
            />
            {idx < STATUS_SEQUENCE.length - 1 && (
              <div
                className={`h-px w-2 transition-colors ${
                  idx < currentIdx
                    ? 'bg-[var(--color-primary)]'
                    : 'bg-black/[0.08] dark:bg-white/[0.08]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Response Row ────────────────────────────────────────

function ResponseRow({
  row,
  onRemind,
  isPending,
}: {
  row: ResponseTrackingRow
  onRemind: () => void
  isPending: boolean
}) {
  const { t } = useTranslation('internal')
  const [expanded, setExpanded] = useState(false)

  const canRemind = row.status === 'sent' || row.status === 'opened'

  return (
    <div className="group">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 py-2.5 text-start outline-none transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded"
      >
        {/* Supplier name */}
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-[var(--color-text)]">
          {row.supplierName}
        </span>

        {/* Status dot chain */}
        <StatusDotChain current={row.status} />

        {/* Status badge */}
        <ResponseStatusBadge status={row.status} />

        {/* Response date */}
        <span className="w-20 shrink-0 text-end font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-subtle)]">
          {row.responseDate
            ? new Date(row.responseDate).toLocaleDateString()
            : '\u2014'}
        </span>

        {/* Remind (hover-only) */}
        <div className="w-16 shrink-0 flex justify-end">
          {canRemind && (
            <Button
              onPress={(e) => {
                e.continuePropagation?.()
                onRemind()
              }}
              isDisabled={isPending}
              className="opacity-0 group-hover:opacity-100 rounded px-2 py-0.5 text-[11px] font-medium text-[var(--color-primary)] outline-none transition-all
                data-[hovered]:bg-[var(--color-primary)]/[0.06]
                data-[focus-visible]:opacity-100 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
            >
              {t('procurement.response.remind')}
            </Button>
          )}
          {row.status === 'responded' && (
            <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
              {t('procurement.response.reviewReady')}
            </span>
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="pb-2 ps-4">
          <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-subtle)]">
            <span>
              {t('procurement.response.sentDate')}:{' '}
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                {new Date(row.sentDate).toLocaleDateString()}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Tracker ────────────────────────────────────────

export function ResponseTracker({ inquiryId }: ResponseTrackerProps) {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()
  const setSelectedInquiryId = useProcurementStore((s) => s.setSelectedInquiryId)

  const { data, isLoading } = useQuery({
    queryKey: ['procurement', 'responses', inquiryId],
    queryFn: () => trackInquiryResponses({ data: { inquiryId } }),
    staleTime: 15_000,
  })

  const responses: ResponseTrackingRow[] = data?.responses ?? []

  const nonResponders = responses.filter(
    (r) => r.status === 'sent' || r.status === 'opened',
  )

  const remindMutation = useMutation({
    mutationFn: (ids: string[]) => remindSuppliers({ data: { inquiryIds: ids } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', 'responses'] })
    },
  })

  const remindSingle = (row: ResponseTrackingRow) => {
    remindMutation.mutate([row.inquiryId])
  }

  const remindAll = () => {
    const ids = nonResponders.map((r) => r.inquiryId)
    if (ids.length > 0) remindMutation.mutate(ids)
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onPress={() => setSelectedInquiryId(null)}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-muted)] outline-none transition-colors
              data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
          >
            {t('procurement.response.back')}
          </Button>
          <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-text)]">
            {t('procurement.response.title')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onPress={remindAll}
            isDisabled={nonResponders.length === 0 || remindMutation.isPending}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-muted)] outline-none transition-colors
              data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]
              data-[disabled]:opacity-40
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
          >
            {t('procurement.response.remindAll')}
            <span className="ms-1 font-[family-name:var(--font-geist-mono)] tabular-nums">
              ({nonResponders.length})
            </span>
          </Button>
          <Button
            onPress={() => setSelectedInquiryId(null)}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-[13px] font-semibold text-white outline-none transition-colors
              data-[hovered]:bg-[var(--color-primary)]/90
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40 data-[focus-visible]:ring-offset-2"
          >
            {t('procurement.response.closeAndProceed')}
          </Button>
        </div>
      </div>

      {/* ── Auto-reminder note ── */}
      <div className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)]/[0.04] px-3 py-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-primary)]"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        <span className="text-[12px] text-[var(--color-primary)]">{t('procurement.response.autoReminderNote')}</span>
      </div>

      {/* ── Response List ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-black/[0.04] dark:divide-white/[0.04]">
          {responses.map((row) => (
            <ResponseRow
              key={row.supplierId}
              row={row}
              onRemind={() => remindSingle(row)}
              isPending={remindMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
