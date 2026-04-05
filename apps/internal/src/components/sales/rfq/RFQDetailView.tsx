import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { getRFQDetail, reassignRFQ } from '../../../lib/server/sales-rfq'
import { createQuote } from '../../../lib/server/sales-quotes'
import { addInternalNote } from '../../../lib/server/sales-activity'
import { useSalesStore } from '../../../stores/sales'
import { TierBadge } from '../shared/TierBadge'
import { CreditStatusBanner } from '../shared/CreditStatusBanner'
import { ClarificationForm } from './ClarificationForm'
import { DeclineRFQDialog } from './DeclineRFQDialog'
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

interface RFQDetailViewProps {
  rfqId: string
}

export function RFQDetailView({ rfqId }: RFQDetailViewProps) {
  const { t, i18n } = useTranslation('internal')
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const queryClient = useQueryClient()
  const setActiveTab = useSalesStore((s) => s.setActiveTab)

  const [showClarification, setShowClarification] = useState(false)
  const [showDecline, setShowDecline] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')

  const { data: detail, isLoading } = useQuery({
    queryKey: ['rfq-detail', rfqId],
    queryFn: () => getRFQDetail({ data: { rfqId } }),
    enabled: !!rfqId,
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

  const addNoteMutation = useMutation({
    mutationFn: (note: string) =>
      addInternalNote({
        data: { entityType: 'rfq', entityId: rfqId, note },
      }),
    onSuccess: () => {
      setNoteText('')
      setShowNoteInput(false)
    },
  })

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-black/40 dark:text-white/40">Loading RFQ detail...</p>
      </div>
    )
  }

  const rfq = detail as RFQDetail

  return (
    <div className="flex flex-col h-full">
      {/* Content: 60/40 split */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col md:flex-row gap-0 h-full">
          {/* Left column (60%): Materials + Delivery + Attachments */}
          <div className="w-full md:w-[60%] border-e border-black/10 dark:border-white/10 overflow-auto">
            {/* Materials table */}
            <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
              <h3 className="text-sm font-semibold mb-3">Material Request</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm" role="grid" aria-label="Material request items">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-white/10">
                      <th className="px-2 py-1.5 text-start text-xs font-medium text-black/50 dark:text-white/50 w-8">#</th>
                      <th className="px-2 py-1.5 text-start text-xs font-medium text-black/50 dark:text-white/50">Name</th>
                      <th className="px-2 py-1.5 text-start text-xs font-medium text-black/50 dark:text-white/50">Specification</th>
                      <th className="px-2 py-1.5 text-start text-xs font-medium text-black/50 dark:text-white/50">Qty</th>
                      <th className="px-2 py-1.5 text-start text-xs font-medium text-black/50 dark:text-white/50">Unit</th>
                      <th className="px-2 py-1.5 text-start text-xs font-medium text-black/50 dark:text-white/50">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="border-b border-black/5 dark:border-white/5"
                      >
                        <td className="px-2 py-2 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/40 dark:text-white/40">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-2 font-medium">{item.productName}</td>
                        <td className="px-2 py-2 text-black/60 dark:text-white/60">{item.specification}</td>
                        <td className="px-2 py-2 font-[family-name:var(--font-geist-mono)] tabular-nums">
                          {new Intl.NumberFormat(locale).format(item.quantity)}
                        </td>
                        <td className="px-2 py-2 text-black/60 dark:text-white/60">{item.unit}</td>
                        <td className="px-2 py-2 text-black/50 dark:text-white/50 text-xs max-w-[200px] truncate">
                          {item.customerDescription}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Delivery requirements */}
            <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
              <h3 className="text-sm font-semibold mb-2">Delivery Requirements</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-black/40 dark:text-white/40 shrink-0">Address</span>
                  <span>{rfq.deliveryRequirements.address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-black/40 dark:text-white/40 shrink-0">Date</span>
                  <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums ${rfq.deliveryUrgency < 7 ? 'text-red-600' : ''}`}>
                    {new Date(rfq.deliveryRequirements.requestedDate).toLocaleDateString(locale)}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-black/40 dark:text-white/40 shrink-0">Type</span>
                  <span>{rfq.deliveryRequirements.deliveryType}</span>
                </div>
                {rfq.deliveryRequirements.specialInstructions && (
                  <div className="flex items-start gap-2">
                    <span className="text-black/40 dark:text-white/40 shrink-0">Instructions</span>
                    <span className="text-black/70 dark:text-white/70">{rfq.deliveryRequirements.specialInstructions}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Attached files */}
            {rfq.attachments.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-sm font-semibold mb-2">Attached Files</h3>
                <ul className="space-y-1.5">
                  {rfq.attachments.map((att) => (
                    <li key={att.id} className="flex items-center justify-between text-sm">
                      <a
                        href={att.url}
                        className="text-[#2563EB] hover:underline truncate"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {att.name}
                      </a>
                      <span className="text-xs text-black/40 dark:text-white/40 font-[family-name:var(--font-geist-mono)] tabular-nums shrink-0 ms-2">
                        {formatFileSize(att.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right column (40%): Customer context */}
          <div className="w-full md:w-[40%] overflow-auto">
            {/* Customer snapshot card */}
            <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold">{rfq.customer.name}</h3>
                <TierBadge tier={rfq.customer.tier} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-black/40 dark:text-white/40 text-xs">Orders</span>
                  <p className="font-[family-name:var(--font-geist-mono)] tabular-nums">{rfq.customer.orderCount}</p>
                </div>
                <div>
                  <span className="text-black/40 dark:text-white/40 text-xs">Lifetime Value</span>
                  <p className="font-[family-name:var(--font-geist-mono)] tabular-nums">
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
                  <span className="text-black/40 dark:text-white/40 text-xs">Payment History</span>
                  <p className="capitalize">{rfq.customer.paymentHistory}</p>
                </div>
              </div>
            </div>

            {/* Credit info */}
            <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
              <h4 className="text-xs font-medium text-black/50 dark:text-white/50 mb-2">Credit</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-black/40 dark:text-white/40">Limit</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {formatEGP(rfq.customer.creditLimit, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/40 dark:text-white/40">Exposure</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {formatEGP(rfq.customer.currentExposure, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/40 dark:text-white/40">Available</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
                    {formatEGP(rfq.customer.availableCredit, locale)}
                  </span>
                </div>
              </div>
            </div>

            {/* Similar past quotes */}
            {rfq.similarQuotes && rfq.similarQuotes.length > 0 && (
              <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
                <h4 className="text-xs font-medium text-black/50 dark:text-white/50 mb-2">
                  Similar Past Quotes
                </h4>
                <div className="space-y-2">
                  {rfq.similarQuotes.map((sq) => (
                    <div
                      key={sq.id}
                      className="flex items-center justify-between rounded-lg border border-black/10 dark:border-white/10 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-[family-name:var(--font-geist-mono)] tabular-nums">{sq.quoteNumber}</p>
                        <p className="text-xs text-black/40 dark:text-white/40 font-[family-name:var(--font-geist-mono)] tabular-nums">
                          {formatEGP(sq.value, locale)}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
                          {formatPercent(sq.marginPercent, locale)}
                        </p>
                        <p className={`text-xs font-medium ${sq.outcome === 'won' ? 'text-green-600' : 'text-red-600'}`}>
                          {sq.outcome.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {rfq.aiInsights && (
              <div className="px-4 py-3">
                <h4 className="text-xs font-medium text-black/50 dark:text-white/50 mb-2">
                  AI Insights
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-black/40 dark:text-white/40">Win Probability</span>
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
                      {formatPercent(rfq.aiInsights.winProbability, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/40 dark:text-white/40">Recommended Margin</span>
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
                      {formatPercent(rfq.aiInsights.recommendedMargin, locale)}
                    </span>
                  </div>
                  <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">
                    {rfq.aiInsights.behavioralPrediction}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline note input */}
      {showNoteInput && (
        <div className="border-t border-black/10 dark:border-white/10 px-4 py-2 flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add internal note..."
            className="flex-1 rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-1.5 text-sm outline-none
              focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && noteText.trim()) {
                addNoteMutation.mutate(noteText.trim())
              }
              if (e.key === 'Escape') {
                setShowNoteInput(false)
                setNoteText('')
              }
            }}
            autoFocus
          />
          <Button
            className="rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white outline-none
              data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
            onPress={() => {
              if (noteText.trim()) addNoteMutation.mutate(noteText.trim())
            }}
            isDisabled={addNoteMutation.isPending || !noteText.trim()}
          >
            Save
          </Button>
        </div>
      )}

      {/* Actions bar (bottom, sticky) */}
      <div className="sticky bottom-0 border-t border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-sm px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {/* 1. Start Quote (primary) */}
          <Button
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white outline-none
              data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2"
            onPress={() => startQuoteMutation.mutate()}
            isDisabled={startQuoteMutation.isPending}
          >
            Start Quote
          </Button>

          {/* 2. Request Clarification */}
          <Button
            className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm font-medium outline-none
              data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
            onPress={() => setShowClarification(true)}
          >
            Request Clarification
          </Button>

          {/* 3. Decline RFQ */}
          <Button
            className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm font-medium outline-none
              data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
            onPress={() => setShowDecline(true)}
          >
            Decline RFQ
          </Button>

          {/* 4. Assign to... */}
          <Button
            className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm font-medium outline-none
              data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
            onPress={() => {
              // Reassign dropdown -- placeholder
            }}
          >
            Assign to...
          </Button>

          {/* 5. Add Note */}
          <Button
            className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm font-medium outline-none
              data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
            onPress={() => setShowNoteInput(!showNoteInput)}
          >
            Add Note
          </Button>

          {/* 6. Call Customer */}
          <a
            href={`tel:+20123456789`}
            className="inline-flex items-center rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm font-medium outline-none
              hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => {
              // Log call activity
              addInternalNote({
                data: {
                  entityType: 'rfq',
                  entityId: rfqId,
                  note: 'Called customer',
                },
              })
            }}
          >
            Call Customer
          </a>

          {/* 7. View Full Customer Profile */}
          <Button
            className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm font-medium outline-none
              data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
            onPress={() => {
              setActiveTab('customer-360')
            }}
          >
            View Full Customer Profile
          </Button>
        </div>
      </div>

      {/* Clarification Form Dialog */}
      <ClarificationForm
        rfqId={rfqId}
        isOpen={showClarification}
        onClose={() => setShowClarification(false)}
      />

      {/* Decline RFQ Dialog */}
      <DeclineRFQDialog
        rfqId={rfqId}
        isOpen={showDecline}
        onClose={() => setShowDecline(false)}
      />
    </div>
  )
}
