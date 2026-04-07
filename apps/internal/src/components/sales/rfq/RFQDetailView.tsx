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
  const setEditingRfqId = useSalesStore((s) => s.setEditingRfqId)

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
      setEditingRfqId(rfqId)
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
        <p className="text-[13px] text-[var(--color-text-subtle)]">Loading RFQ detail...</p>
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
          <div className="w-full md:w-[60%] border-e border-black/[0.06] dark:border-white/[0.06] overflow-auto">
            {/* Materials table */}
            <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
              <h3 className="text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-3">
                Material Request
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-start" role="grid" aria-label="Material request items">
                  <thead>
                    <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                      <th className="px-2 py-1.5 text-start text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider w-8">#</th>
                      <th className="px-2 py-1.5 text-start text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">Name</th>
                      <th className="px-2 py-1.5 text-start text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">Spec</th>
                      <th className="px-2 py-1.5 text-start text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">Qty</th>
                      <th className="px-2 py-1.5 text-start text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">Unit</th>
                      <th className="px-2 py-1.5 text-start text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-2 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-2 text-[13px] font-medium text-[var(--color-text)]">{item.productName}</td>
                        <td className="px-2 py-2 text-[13px] text-[var(--color-text-muted)]">{item.specification}</td>
                        <td className="px-2 py-2 font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)]">
                          {new Intl.NumberFormat(locale).format(item.quantity)}
                        </td>
                        <td className="px-2 py-2 text-[13px] text-[var(--color-text-muted)]">{item.unit}</td>
                        <td className="px-2 py-2 text-[11px] text-[var(--color-text-subtle)] max-w-[200px] truncate">
                          {item.customerDescription}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Delivery requirements */}
            <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
              <h3 className="text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">
                Delivery Requirements
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-[11px] text-[var(--color-text-subtle)] shrink-0 w-16 pt-0.5">Address</span>
                  <span className="text-[13px] text-[var(--color-text)]">{rfq.deliveryRequirements.address}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[11px] text-[var(--color-text-subtle)] shrink-0 w-16 pt-0.5">Date</span>
                  <span className={`font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums ${rfq.deliveryUrgency < 7 ? 'text-red-600' : 'text-[var(--color-text)]'}`}>
                    {new Date(rfq.deliveryRequirements.requestedDate).toLocaleDateString(locale)}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[11px] text-[var(--color-text-subtle)] shrink-0 w-16 pt-0.5">Type</span>
                  <span className="text-[13px] text-[var(--color-text)]">{rfq.deliveryRequirements.deliveryType}</span>
                </div>
                {rfq.deliveryRequirements.specialInstructions && (
                  <div className="flex items-start gap-3">
                    <span className="text-[11px] text-[var(--color-text-subtle)] shrink-0 w-16 pt-0.5">Notes</span>
                    <span className="text-[13px] text-[var(--color-text-muted)]">{rfq.deliveryRequirements.specialInstructions}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Attached files */}
            {rfq.attachments.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">
                  Attachments
                </h3>
                <ul className="space-y-1">
                  {rfq.attachments.map((att) => (
                    <li key={att.id} className="flex items-center justify-between py-1">
                      <a
                        href={att.url}
                        className="text-[13px] text-[var(--color-primary)] hover:underline truncate"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {att.name}
                      </a>
                      <span className="text-[11px] text-[var(--color-text-subtle)] font-[family-name:var(--font-geist-mono)] tabular-nums shrink-0 ms-2">
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
            {/* Customer snapshot */}
            <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{rfq.customer.name}</h3>
                <TierBadge tier={rfq.customer.tier} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-[var(--color-text-subtle)]">Orders</span>
                  <p className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)]">
                    {rfq.customer.orderCount}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--color-text-subtle)]">Lifetime Value</span>
                  <p className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)]">
                    {formatEGP(rfq.customer.lifetimeValue, locale)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--color-text-subtle)]">Avg Margin</span>
                  <p className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)]">
                    {formatPercent(rfq.customer.avgMargin, locale)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--color-text-subtle)]">Payment History</span>
                  <p className="text-[13px] capitalize text-[var(--color-text)]">{rfq.customer.paymentHistory}</p>
                </div>
              </div>
            </div>

            {/* Credit info */}
            <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
              <h4 className="text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">
                Credit
              </h4>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[11px] text-[var(--color-text-subtle)]">Limit</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)]">
                    {formatEGP(rfq.customer.creditLimit, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-[var(--color-text-subtle)]">Exposure</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)]">
                    {formatEGP(rfq.customer.currentExposure, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-[var(--color-text-subtle)]">Available</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums font-medium text-[var(--color-text)]">
                    {formatEGP(rfq.customer.availableCredit, locale)}
                  </span>
                </div>
              </div>
            </div>

            {/* Similar past quotes */}
            {rfq.similarQuotes && rfq.similarQuotes.length > 0 && (
              <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                <h4 className="text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">
                  Similar Past Quotes
                </h4>
                <div className="space-y-1.5">
                  {rfq.similarQuotes.map((sq) => (
                    <div
                      key={sq.id}
                      className="flex items-center justify-between rounded-lg bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2"
                    >
                      <div>
                        <p className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)]">
                          {sq.quoteNumber}
                        </p>
                        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
                          {formatEGP(sq.value, locale)}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)]">
                          {formatPercent(sq.marginPercent, locale)}
                        </p>
                        <p className={`text-[11px] font-medium ${sq.outcome === 'won' ? 'text-green-600' : 'text-red-600'}`}>
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
                <h4 className="text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">
                  AI Insights
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-[var(--color-text-subtle)]">Win Probability</span>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums font-medium text-[var(--color-text)]">
                      {formatPercent(rfq.aiInsights.winProbability, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-[var(--color-text-subtle)]">Recommended Margin</span>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums font-medium text-[var(--color-text)]">
                      {formatPercent(rfq.aiInsights.recommendedMargin, locale)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed pt-1">
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
        <div className="border-t border-black/[0.06] dark:border-white/[0.06] px-4 py-2 flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add internal note..."
            className="flex-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] px-3 py-1.5 text-[13px] outline-none
              focus:ring-1 focus:ring-[var(--color-primary)]/50
              placeholder:text-[var(--color-text-subtle)]"
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
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-medium text-white outline-none
              data-[hovered]:bg-[var(--color-primary)]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50"
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
      <div className="sticky bottom-0 border-t border-black/[0.06] dark:border-white/[0.06] bg-[var(--color-surface)]/95 dark:bg-black/95 backdrop-blur-sm px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {/* 1. Start Quote (primary) */}
          <Button
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[13px] font-medium text-white outline-none
              data-[hovered]:bg-[var(--color-primary)]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 data-[focus-visible]:ring-offset-2"
            onPress={() => startQuoteMutation.mutate()}
            isDisabled={startQuoteMutation.isPending}
          >
            Start Quote
          </Button>

          {/* 2. Request Clarification */}
          <Button
            className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 text-[13px] font-medium text-[var(--color-text)] outline-none
              data-[hovered]:bg-black/[0.08] dark:data-[hovered]:bg-white/[0.1]
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50"
            onPress={() => setShowClarification(true)}
          >
            Request Clarification
          </Button>

          {/* 3. Decline RFQ */}
          <Button
            className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 text-[13px] font-medium text-[var(--color-text)] outline-none
              data-[hovered]:bg-black/[0.08] dark:data-[hovered]:bg-white/[0.1]
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50"
            onPress={() => setShowDecline(true)}
          >
            Decline RFQ
          </Button>

          {/* 4. Assign to... */}
          <Button
            className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 text-[13px] font-medium text-[var(--color-text)] outline-none
              data-[hovered]:bg-black/[0.08] dark:data-[hovered]:bg-white/[0.1]
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50"
            onPress={() => {
              // Reassign dropdown -- placeholder
            }}
          >
            Assign to...
          </Button>

          {/* 5. Add Note */}
          <Button
            className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 text-[13px] font-medium text-[var(--color-text)] outline-none
              data-[hovered]:bg-black/[0.08] dark:data-[hovered]:bg-white/[0.1]
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50"
            onPress={() => setShowNoteInput(!showNoteInput)}
          >
            Add Note
          </Button>

          {/* 6. Call Customer */}
          <a
            href={`tel:+20123456789`}
            className="inline-flex items-center rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 text-[13px] font-medium text-[var(--color-text)] outline-none
              hover:bg-black/[0.08] dark:hover:bg-white/[0.1]"
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
            className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 text-[13px] font-medium text-[var(--color-text)] outline-none
              data-[hovered]:bg-black/[0.08] dark:data-[hovered]:bg-white/[0.1]
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50"
            onPress={() => {
              setActiveTab('customers')
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
