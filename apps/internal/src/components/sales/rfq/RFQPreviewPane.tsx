import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { getRFQDetail, autoAssignRFQ, requestClarification } from '../../../lib/server/sales-rfq'
import { createQuote } from '../../../lib/server/sales-quotes'
import { useSalesStore } from '../../../stores/sales'
import { TierBadge } from '../shared/TierBadge'
import type { RFQDetail } from '../../../types/sales'

function formatEGP(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

interface RFQPreviewPaneProps {
  rfqId: string
}

export function RFQPreviewPane({ rfqId }: RFQPreviewPaneProps) {
  const { t, i18n } = useTranslation('internal')
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const queryClient = useQueryClient()
  const setActiveTab = useSalesStore((s) => s.setActiveTab)

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
    onSuccess: () => {
      setActiveTab('quote-builder')
    },
  })

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-sm text-black/40 dark:text-white/40">Loading...</p>
      </div>
    )
  }

  const rfq = detail as RFQDetail

  return (
    <div className="flex flex-col w-full h-full overflow-auto">
      {/* Customer Info */}
      <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold truncate">{rfq.customerName}</h3>
          <TierBadge tier={rfq.customerTier} />
        </div>
        {rfq.deliveryRequirements && (
          <p className="text-xs text-black/50 dark:text-white/50 truncate">
            {rfq.deliveryRequirements.address}
          </p>
        )}
      </div>

      {/* Delivery date urgency */}
      <div className="border-b border-black/10 dark:border-white/10 px-4 py-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-black/50 dark:text-white/50">Delivery Requested</span>
          <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums ${rfq.deliveryUrgency < 7 ? 'text-red-600' : rfq.deliveryUrgency < 14 ? 'text-yellow-600' : 'text-black/70 dark:text-white/70'}`}>
            {rfq.deliveryUrgency}d
          </span>
        </div>
      </div>

      {/* Material breakdown */}
      <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
        <h4 className="text-xs font-medium text-black/50 dark:text-white/50 mb-2">
          Materials ({rfq.items.length} items)
        </h4>
        <ul className="space-y-1.5">
          {rfq.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span className="truncate me-2">{item.productName}</span>
              <span className="shrink-0 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                {new Intl.NumberFormat(locale).format(item.quantity)} {item.unit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Customer history */}
      <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
        <h4 className="text-xs font-medium text-black/50 dark:text-white/50 mb-2">
          Customer History
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-black/40 dark:text-white/40 text-xs">Orders</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums">{rfq.customer.orderCount}</p>
          </div>
          <div>
            <span className="text-black/40 dark:text-white/40 text-xs">Lifetime Value</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
              {formatEGP(rfq.customer.lifetimeValue, locale)}
            </p>
          </div>
          <div>
            <span className="text-black/40 dark:text-white/40 text-xs">Avg Margin</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {formatPercent(rfq.customer.avgMargin, locale)}
            </p>
          </div>
          <div>
            <span className="text-black/40 dark:text-white/40 text-xs">Payment</span>
            <p className="text-sm capitalize">{rfq.customer.paymentHistory}</p>
          </div>
        </div>
      </div>

      {/* Similar past quotes (AI) */}
      {rfq.similarQuotes && rfq.similarQuotes.length > 0 && (
        <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
          <h4 className="text-xs font-medium text-black/50 dark:text-white/50 mb-2 flex items-center gap-1">
            <span>AI Suggestions</span>
          </h4>
          <ul className="space-y-1.5">
            {rfq.similarQuotes.map((sq) => (
              <li key={sq.id} className="flex items-center justify-between text-sm">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                  {sq.quoteNumber}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                    {formatPercent(sq.marginPercent, locale)}
                  </span>
                  <span
                    className={`text-xs font-medium ${sq.outcome === 'won' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {sq.outcome.toUpperCase()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto px-4 py-3 border-t border-black/10 dark:border-white/10 space-y-2">
        <Button
          className="w-full rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white outline-none
            data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2"
          onPress={() => startQuoteMutation.mutate()}
          isDisabled={startQuoteMutation.isPending}
        >
          Start Quote
        </Button>

        <div className="flex gap-2">
          <Button
            className="flex-1 rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium outline-none
              data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
            onPress={() => {
              // Opens full detail view -- placeholder navigation
              setActiveTab('rfq-inbox')
            }}
          >
            Open Full Detail
          </Button>
          {!rfq.assignedRep && (
            <Button
              className="flex-1 rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 px-3 py-1.5 text-xs font-medium text-[#2563EB] outline-none
                data-[hovered]:bg-[#2563EB]/10
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
              onPress={() => claimMutation.mutate()}
              isDisabled={claimMutation.isPending}
            >
              Assign to Me
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium outline-none
              data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
            onPress={() => {
              // Opens assign-to dialog -- placeholder
            }}
          >
            Assign to...
          </Button>
          <Button
            className="flex-1 rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium outline-none
              data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
            onPress={() => {
              // Opens clarification form -- will be wired in Task 2
            }}
          >
            Request Clarification
          </Button>
        </div>
      </div>
    </div>
  )
}
