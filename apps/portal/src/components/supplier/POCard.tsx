/**
 * PO summary card for the supplier inbox list.
 * Shows PO reference (Geist Mono), status, date, deadline with color coding.
 * NEVER shows customer names -- only PO reference (HQ-2026-NNNN).
 */
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { StatusBadge } from '@hyperquote/ui'
import { useTranslation } from 'react-i18next'
import type { SupplierPO } from '../../types/supplier'

type POStatus = SupplierPO['status']

function getStatusVariant(
  status: POStatus,
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'confirmed':
    case 'delivered':
      return 'success'
    case 'sent':
    case 'acknowledged':
      return 'warning'
    case 'rejected':
      return 'error'
    case 'in_production':
    case 'shipped':
      return 'info'
    default:
      return 'neutral'
  }
}

function getStatusLabel(
  status: POStatus,
  t: (key: string) => string,
): string {
  const labels: Record<POStatus, string> = {
    sent: t('supplier.pendingAction'),
    acknowledged: t('supplier.pendingAction'),
    confirmed: t('supplier.confirmed'),
    rejected: t('supplier.rejected'),
    in_production: t('supplier.inProduction'),
    shipped: t('supplier.shipped'),
    delivered: t('supplier.delivered'),
  }
  return labels[status] ?? status
}

/** Returns deadline urgency: 'green' > 24h, 'yellow' < 24h, 'red' overdue */
function getDeadlineUrgency(
  deadline: string,
): 'green' | 'yellow' | 'red' {
  const remaining = new Date(deadline).getTime() - Date.now()
  if (remaining < 0) return 'red'
  if (remaining < 24 * 60 * 60 * 1000) return 'yellow'
  return 'green'
}

const urgencyColors = {
  green: 'text-[var(--color-success)]',
  yellow: 'text-[var(--color-warning)]',
  red: 'text-[var(--color-error)]',
} as const

interface POCardProps {
  po: SupplierPO
  locale: 'ar' | 'en'
}

export function POCard({ po, locale }: POCardProps) {
  const { t } = useTranslation('portal')
  const urgency = getDeadlineUrgency(po.responseDeadline)

  const formattedDate = new Date(po.dateReceived).toLocaleDateString(
    locale === 'ar' ? 'ar-EG' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' },
  )

  const deadlineDate = new Date(po.responseDeadline).toLocaleDateString(
    locale === 'ar' ? 'ar-EG' : 'en-GB',
    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
  )

  return (
    <Link
      to="/supplier/orders/$poId"
      params={{ poId: po.id }}
      className="flex items-center justify-between w-full bg-[var(--color-surface)] rounded-xl p-4 mb-3 text-start cursor-pointer transition-all duration-150 ease hover:border-[var(--color-primary)]/30 hover:-translate-y-px outline-none border border-transparent"
    >
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {/* Row 1: Reference + Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-sm text-[var(--color-text)]">
            {po.reference}
          </span>
          <StatusBadge status={getStatusVariant(po.status)}>
            {getStatusLabel(po.status, t)}
          </StatusBadge>
        </div>

        {/* Row 2: Items summary */}
        <p className="text-[13px] text-[var(--color-text-muted)]">
          <span className="font-mono">{po.items.length}</span>{' '}
          {t('supplier.itemsSummary')}
        </p>

        {/* Row 3: Date received + Deadline */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[var(--color-text-subtle)]">
            {formattedDate}
          </span>
          <span className={`font-mono text-xs ${urgencyColors[urgency]}`}>
            {deadlineDate}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight
        size={16}
        className="shrink-0 ms-3 text-[var(--color-text-subtle)] rtl:rotate-180"
      />
    </Link>
  )
}
