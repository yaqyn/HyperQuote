import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { ArrowRight } from 'lucide-react'
import { getRFQDetail, autoAssignRFQ } from '../../../lib/server/sales-rfq'
import { createQuote } from '../../../lib/server/sales-quotes'
import { useSalesStore } from '../../../stores/sales'
import type { RFQDetail } from '../../../types/sales'

function fmtEGP(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`
  return String(v)
}

interface RFQPreviewPaneProps {
  rfqId: string
}

export function RFQPreviewPane({ rfqId }: RFQPreviewPaneProps) {
  const queryClient = useQueryClient()
  const setEditingRfqId = useSalesStore((s) => s.setEditingRfqId)

  const { data: detail, isLoading } = useQuery({
    queryKey: ['rfq-detail', rfqId],
    queryFn: () => getRFQDetail({ data: { rfqId } }),
    enabled: !!rfqId,
  })

  const claimMutation = useMutation({
    mutationFn: () => autoAssignRFQ({ data: { rfqId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
      queryClient.invalidateQueries({ queryKey: ['rfq-detail', rfqId] })
    },
  })

  const startQuoteMutation = useMutation({
    mutationFn: () =>
      createQuote({
        data: {
          rfqId,
          lines: [],
          validUntil: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        },
      }),
    onSuccess: () => setEditingRfqId(rfqId),
  })

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    )
  }

  const rfq = detail as RFQDetail

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 min-h-0 overflow-y-auto" data-module-content>
        {/* Hero section */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text)] mb-1">
                {rfq.customerName}
              </h2>
              <p className="text-[12px] text-[var(--color-text-subtle)]">
                {rfq.deliveryRequirements?.address ?? 'No address'}
              </p>
            </div>
            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold px-2 py-1 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-[var(--color-text-muted)]">
              {rfq.customerTier === 'new' ? 'NEW' : `TIER ${rfq.customerTier}`}
            </span>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-4 gap-6">
            {[
              { value: `EGP ${fmtEGP(rfq.estimatedValue)}`, label: 'Value' },
              { value: `${rfq.deliveryUrgency}d`, label: 'Delivery', alert: rfq.deliveryUrgency < 7 },
              { value: `${rfq.customer.avgMargin.toFixed(1)}%`, label: 'Avg Margin' },
              { value: String(rfq.customer.orderCount), label: 'Past Orders' },
            ].map((m) => (
              <div key={m.label}>
                <p className={`font-[family-name:var(--font-geist-mono)] text-[16px] font-medium tabular-nums ${
                  m.alert ? 'text-red-500' : 'text-[var(--color-text)]'
                }`}>
                  {m.value}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-[var(--color-text-subtle)] mt-0.5">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Materials */}
        <div className="px-8 py-5 border-t border-black/[0.04] dark:border-white/[0.04]">
          <p className="text-[9px] uppercase tracking-widest text-[var(--color-text-subtle)] mb-3">
            Materials · {rfq.items.length} items
          </p>
          <div className="grid grid-cols-1 gap-0">
            {rfq.items.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center justify-between py-2.5 ${
                  i > 0 ? 'border-t border-black/[0.03] dark:border-white/[0.03]' : ''
                }`}
              >
                <span className="text-[13px] text-[var(--color-text)]">
                  {item.productName}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)]">
                  {new Intl.NumberFormat('en-EG').format(item.quantity)}
                  <span className="text-[var(--color-text-subtle)] ml-1">{item.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Past quotes */}
        {rfq.similarQuotes && rfq.similarQuotes.length > 0 && (
          <div className="px-8 py-5 border-t border-black/[0.04] dark:border-white/[0.04]">
            <p className="text-[9px] uppercase tracking-widest text-[var(--color-text-subtle)] mb-3">
              Past Quotes
            </p>
            <div className="grid grid-cols-1 gap-0">
              {rfq.similarQuotes.map((sq, i) => (
                <div
                  key={sq.id}
                  className={`flex items-center justify-between py-2.5 ${
                    i > 0 ? 'border-t border-black/[0.03] dark:border-white/[0.03]' : ''
                  }`}
                >
                  <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)]">
                    {sq.quoteNumber}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text)]">
                      {sq.marginPercent.toFixed(1)}%
                    </span>
                    <span className={`font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase ${
                      sq.outcome === 'won' ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {sq.outcome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer snapshot */}
        <div className="px-8 py-5 border-t border-black/[0.04] dark:border-white/[0.04]">
          <p className="text-[9px] uppercase tracking-widest text-[var(--color-text-subtle)] mb-3">
            Customer
          </p>
          <div className="grid grid-cols-2 gap-y-3 gap-x-8">
            <Row label="Lifetime Value" value={`EGP ${fmtEGP(rfq.customer.lifetimeValue)}`} />
            <Row label="Payment History" value={rfq.customer.paymentHistory} />
          </div>
        </div>
      </div>

    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--color-text-subtle)] mb-0.5">{label}</p>
      <p className="text-[13px] text-[var(--color-text)] capitalize">{value}</p>
    </div>
  )
}
