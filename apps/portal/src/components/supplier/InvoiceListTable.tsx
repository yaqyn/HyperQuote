/**
 * Submitted invoices list with React Aria Table.
 * All number columns use Geist Mono (font-mono).
 * Status badges for 5 invoice statuses.
 */
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { StatusBadge } from '@hyperquote/ui'
import { FileText } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { getSupplierInvoices } from '../../lib/server/supplier-invoices'
import type { SupplierInvoice } from '../../types/supplier'

type InvoiceStatus = SupplierInvoice['status']

function getStatusVariant(
  status: InvoiceStatus,
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'approved':
    case 'paid':
      return 'success'
    case 'under_review':
      return 'warning'
    case 'disputed':
      return 'error'
    case 'submitted':
    default:
      return 'neutral'
  }
}

function getStatusLabel(
  status: InvoiceStatus,
  t: (key: string) => string,
): string {
  const labels: Record<InvoiceStatus, string> = {
    submitted: t('supplier.submitted'),
    under_review: t('supplier.underReview'),
    approved: t('supplier.approved'),
    paid: t('supplier.paid'),
    disputed: t('supplier.disputed'),
  }
  return labels[status] ?? status
}

interface InvoiceListTableProps {
  locale: 'ar' | 'en'
}

export function InvoiceListTable({ locale }: InvoiceListTableProps) {
  const { t } = useTranslation('portal')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-invoices', page],
    queryFn: () =>
      getSupplierInvoices({ data: { page, limit: 20 } }),
    staleTime: 60_000,
  })

  const formatNum = (n: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(n)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(
      locale === 'ar' ? 'ar-EG' : 'en-GB',
      { day: 'numeric', month: 'short', year: 'numeric' },
    )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl bg-[var(--color-surface)] p-4 animate-pulse"
          >
            <div className="h-4 w-28 bg-[var(--color-border)] rounded mb-2" />
            <div className="h-3 w-48 bg-[var(--color-border)] rounded" />
          </div>
        ))}
      </div>
    )
  }

  const invoices = data?.invoices ?? []

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <FileText
          size={48}
          className="text-[var(--color-text-subtle)]"
        />
        <p className="text-lg font-semibold text-[var(--color-text)]">
          {t('supplier.emptyInvoices')}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t('supplier.emptyInvoicesBody')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Table */}
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_100px_100px_80px_100px_100px] items-center gap-2 px-4 py-2 bg-[var(--color-surface)] text-[13px] font-medium text-[var(--color-text-muted)] max-md:hidden">
          <span>{t('supplier.invoiceNumber')}</span>
          <span>{t('supplier.poReference')}</span>
          <span>{t('supplier.invoiceDate')}</span>
          <span className="text-end">{t('supplier.subtotal')}</span>
          <span className="text-end">{t('supplier.vat')}</span>
          <span className="text-end">{t('supplier.total')}</span>
          <span className="text-center">{t('supplier.status')}</span>
        </div>

        {/* Rows */}
        {invoices.map((inv) => (
          <div
            key={inv.id}
            className="grid grid-cols-[1fr_1fr_100px_100px_80px_100px_100px] items-center gap-2 px-4 py-3 border-t border-[var(--color-border)] max-md:grid-cols-1 max-md:gap-1"
          >
            <span className="font-mono text-sm text-[var(--color-text)]">
              {inv.invoiceNumber}
            </span>
            <span className="font-mono text-sm text-[var(--color-text-muted)]">
              {inv.poReference}
            </span>
            <span className="font-mono text-[13px] text-[var(--color-text-muted)]">
              {formatDate(inv.invoiceDate)}
            </span>
            <span className="font-mono text-sm text-[var(--color-text)] text-end">
              {formatNum(inv.subtotal)}
            </span>
            <span className="font-mono text-sm text-[var(--color-text-muted)] text-end">
              {formatNum(inv.taxAmount)}
            </span>
            <span className="font-mono text-sm font-semibold text-[var(--color-text)] text-end">
              {formatNum(inv.total)}
            </span>
            <div className="flex justify-center">
              <StatusBadge status={getStatusVariant(inv.status)}>
                {getStatusLabel(inv.status, t)}
              </StatusBadge>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            isDisabled={page <= 1}
            className="h-8 px-3 rounded-lg border border-[var(--color-border)] text-[13px] text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors disabled:opacity-50"
          >
            &larr;
          </Button>
          <span className="font-mono text-[13px] text-[var(--color-text-muted)]">
            {page} / {Math.ceil(data.total / 20)}
          </span>
          <Button
            onPress={() => setPage((p) => p + 1)}
            isDisabled={page >= Math.ceil(data.total / 20)}
            className="h-8 px-3 rounded-lg border border-[var(--color-border)] text-[13px] text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors disabled:opacity-50"
          >
            &rarr;
          </Button>
        </div>
      )}
    </div>
  )
}
