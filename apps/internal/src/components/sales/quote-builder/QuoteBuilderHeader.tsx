import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import type { QuoteStatus } from '../../../types/sales'

interface QuoteBuilderHeaderProps {
  quoteNumber: string
  version: number
  status: QuoteStatus
  customerName: string
  customerTier: string
  rfqReference: string
  lastSavedAt: Date | null
  onSaveDraft: () => void
  onPreviewPdf: () => void
  onRequestApproval: () => void
  onSendToCustomer: () => void
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  internal_review: 'Internal Review',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  sent: 'Sent',
  viewed: 'Viewed',
  negotiating: 'Negotiating',
  revised: 'Revised',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
}

function getStatusStyle(status: QuoteStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70'
    case 'pending_approval':
    case 'internal_review':
      return 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300'
    case 'sent':
    case 'viewed':
    case 'approved':
      return 'bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#2563EB]/20'
    case 'negotiating':
    case 'revised':
      return 'bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70'
    case 'accepted':
      return 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300'
    case 'declined':
    case 'expired':
      return 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
  }
}

function AutoSaveIndicator({ lastSavedAt }: { lastSavedAt: Date | null }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!lastSavedAt) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [lastSavedAt])

  if (!lastSavedAt) return null

  const secondsAgo = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)
  const display =
    secondsAgo < 60
      ? `Auto-saved ${secondsAgo}s ago`
      : `Auto-saved ${Math.floor(secondsAgo / 60)}m ago`

  return (
    <span className="text-xs text-black/40 dark:text-white/40">{display}</span>
  )
}

export function QuoteBuilderHeader({
  quoteNumber,
  version,
  status,
  customerName,
  customerTier,
  rfqReference,
  lastSavedAt,
  onSaveDraft,
  onPreviewPdf,
  onRequestApproval,
  onSendToCustomer,
}: QuoteBuilderHeaderProps) {
  const { t } = useTranslation('internal')

  return (
    <div className="flex flex-col gap-1 border-b border-black/10 px-6 py-3 dark:border-white/10">
      <div className="flex items-center justify-between">
        {/* Left: Quote info */}
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-geist-mono)] text-sm font-medium text-black/70 dark:text-white/70">
            {quoteNumber}
          </span>
          <span className="rounded-full bg-black/5 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs font-medium dark:bg-white/10">
            v{version}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(status)}`}
          >
            {STATUS_LABELS[status]}
          </span>
          <span className="text-sm font-medium text-black dark:text-white">
            {customerName}
          </span>
          <span className="rounded-full border border-black/10 px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs dark:border-white/10">
            {customerTier}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-xs text-black/40 dark:text-white/40">
            RFQ: {rfqReference}
          </span>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium outline-none transition-colors
              data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
              dark:border-white/10 dark:bg-white/5 dark:data-[hovered]:bg-white/10"
            onPress={onSaveDraft}
          >
            {t('sales.quoteBuilder.actions.saveDraft')}
          </Button>
          <Button
            className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium outline-none transition-colors
              data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
              dark:border-white/10 dark:bg-white/5 dark:data-[hovered]:bg-white/10"
            onPress={onPreviewPdf}
          >
            {t('sales.quoteBuilder.actions.previewPdf')}
          </Button>
          <Button
            className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium outline-none transition-colors
              data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
              dark:border-white/10 dark:bg-white/5 dark:data-[hovered]:bg-white/10"
            onPress={onRequestApproval}
          >
            {t('sales.quoteBuilder.actions.requestApproval')}
          </Button>
          <Button
            className="rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white outline-none transition-colors
              data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
            onPress={onSendToCustomer}
          >
            {t('sales.quoteBuilder.actions.sendToCustomer')}
          </Button>
        </div>
      </div>
      <AutoSaveIndicator lastSavedAt={lastSavedAt} />
    </div>
  )
}
